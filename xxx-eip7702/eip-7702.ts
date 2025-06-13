import {
  Account,
  Address,
  Client,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  formatEther,
  getContract,
  http,
  keccak256,
  parseAbi,
  parseEther,
  parseUnits,
  PublicClient,
  WalletClient,
  zeroAddress,
} from "viem";
import dotenv from "dotenv";
import process from "node:process";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
dotenv.config();

const delegateContractAddress = "0x69e2C6013Bd8adFd9a54D7E0528b740bac4Eb87C";
const delegateContractAbi = parseAbi([
  "function execute((address,uint256,bytes)[] calls) external payable",
  "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
  "function nonce() external view returns (uint256)",
]);
// function execute((address,uint256,bytes)[] calls)  直接执行交易 自己支付gas
// function execute((address,uint256,bytes)[] calls, bytes signature) 其他账户可以代为支付gas signature是验证

// 检查环境变量
if (
  !process.env.FIRST_PRIVATE_KEY ||
  !process.env.SPONSOR_PRIVATE_KEY ||
  !process.env.DELEGATION_CONTRACT_ADDRESS ||
  !process.env.QUICKNODE_URL ||
  !process.env.USDC_ADDRESS
) {
  console.error("请在 .env 文件中设置你的环境变量。");
  process.exit(1);
}

const quickNodeUrl = process.env.QUICKNODE_URL;
// 讲私钥转换为PrivateKeyAccount类型，以创建walletClient进行区块链写操作
const eoa = privateKeyToAccount(process.env.FIRST_PRIVATE_KEY as any);
const sponsorAccount = privateKeyToAccount(
  process.env.SPONSOR_PRIVATE_KEY as any
);

const publicClient = createPublicClient({ chain: sepolia, transport: http() });
// 问题1；如果这里的创建使用文章中的方法，先let全局变量，然后再init函数中进行赋值会有ts类型问题，
const eoaWalletClient = createWalletClient({
  chain: sepolia,
  transport: http(),
  account: eoa,
});

const sponsorWalletClient = createWalletClient({
  chain: sepolia,
  transport: http(),
  account: sponsorAccount,
});

const targetAddress = process.env.DELEGATION_CONTRACT_ADDRESS as Address;
const usdcAddress = process.env.USDC_ADDRESS as Address;
let recipientAddress: Address;
async function init() {
  recipientAddress =
    (await publicClient.getEnsAddress({ name: "vitalik.eth" })) ||
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  console.log("第一个签名者地址：", eoa.address);
  console.log("赞助者签名者地址：", sponsorAccount.address);
  // 检查余额
  const firstBalance = await publicClient.getBalance({
    address: eoa.address,
  });
  const sponsorBalance = await publicClient.getBalance({
    address: sponsorAccount.address,
  });
  console.log("第一个签名者余额：", formatEther(firstBalance), "ETH");
  console.log("赞助者签名者余额：", formatEther(sponsorBalance), "ETH");
}

// 检查委托状态
async function checkDelegationStatus(address: Address = eoa.address) {
  console.log("\n=== 正在检查委托状态 ===");
  try {
    // 获取EOA地址的代码
    const code = await publicClient.getCode({ address });
    if (!code || code === "0x") {
      console.log(`❌ 未找到 ${address} 的委托`);
      return null;
    }
    if (code?.startsWith("0xef0100")) {
      //删除前缀
      const delegatedAddress = code.slice(8);
      console.log(`✅ 找到 ${address} 的委托`);
      console.log(`📍 委托给：${delegatedAddress}`);
      console.log(`📝 完整委托代码：${code}`);

      return delegatedAddress;
    } else {
      console.log(`❓ 地址有代码但不是 EIP-7702 委托：${code}`);
      return null;
    }
  } catch (error) {
    console.error("检查委托状态时出错：", error);
    return null;
  }
}
// 步骤 2：为 EOA 创建授权 这里是签名不是上链
async function createAuthorization(nonce: number) {
  const auth = await eoaWalletClient.signAuthorization({
    account: eoa,
    contractAddress: delegateContractAddress,
    nonce: nonce + 1,
  });
  return auth;
}
// 步骤 3：发送非赞助的 EIP-7702 交易 这里写了两种方式 直接writeContract和先获取contract实例
async function sendNonSponsoredTransaction() {
  console.log("\n=== 交易 1：非赞助 (ETH 转移) ===");
  const status = await checkDelegationStatus();
  // to value data
  const calls: readonly [Address, bigint, `0x${string}`][] = [
    [zeroAddress, parseEther("0.001"), "0x"],
    [recipientAddress, parseEther("0.002"), "0x"],
  ];
  let hash: `0x${string}`;
  if (!status) {
    const nonce = await publicClient.getTransactionCount({
      address: eoa.address,
    });
    const authorization = await createAuthorization(nonce);
    hash = await eoaWalletClient.writeContract({
      abi: delegateContractAbi,
      // 注意这里是eoa地址
      address: eoa.address,
      functionName: "execute",
      args: [calls],
      authorizationList: [authorization],
    });
  } else {
    // 如果已经有了 委托 则不需要进行 auth 了，直接可以交互
    hash = await eoaWalletClient.writeContract({
      abi: delegateContractAbi,
      address: eoa.address,
      functionName: "execute",
      args: [calls],
    });
  }
  console.log("已发送非赞助交易：", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // console.log("非赞助交易的回执：", receipt);
  return receipt;
}
// 步骤 4：发送赞助的 EIP-7702 交易 多了一个signature
async function createSignatureForCalls(calls: any, contractNonce: bigint) {
  let encodedCalls: `0x${string}` = "0x";
  for (const call of calls) {
    const [to, value, data] = call;
    console.log(
      "-----",
      encodePacked(["address", "uint256", "bytes"], [to, value, data])
    );
    encodedCalls += encodePacked(
      ["address", "unit256", "bytes"],
      [to, value, data]
    ).slice(2);
  }
  const digest = keccak256(
    encodePacked(["uint256", "bytes"], [contractNonce, encodedCalls])
  );
  return await eoaWalletClient.signMessage({ message: digest });
}
async function sendSponsoredTransaction() {
  console.log("\n=== 交易 2：赞助 (合约函数调用) ===");
  const status = await checkDelegationStatus();
  const calls = [
    [
      usdcAddress,
      0n,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, parseUnits("0.1", 6)],
      }),
    ],
    [recipientAddress, parseEther("0.001"), "0x"],
  ] as const;
  const delegateContract = getContract({
    address: eoa.address,
    abi: delegateContractAbi,
    client: eoaWalletClient,
  });
  let hash: `0x${string}`;
  if (!status) {
    const nonce = await publicClient.getTransactionCount({
      address: eoa.address,
    });
    const authorization = await createAuthorization(nonce);
    const hash_createAuth = await eoaWalletClient.sendTransaction({
      to: eoa.address,
      type: "eip7702",
      authorizationList: [authorization],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash_createAuth });
    await checkDelegationStatus();
    const contractNonce = await delegateContract.read.nonce();
    const signature = await createSignatureForCalls(calls, contractNonce);
    hash = await delegateContract.write.execute([calls, signature]);
  } else {
    const contractNonce = await delegateContract.read.nonce();
    const signature = await createSignatureForCalls(calls, contractNonce);
    hash = await delegateContract.write.execute([calls, signature]);
  }
  console.log("赞助交易hash:", hash);
}
// 步骤 6：撤销委托
async function revokeDelegation() {
  console.log("\n=== 正在撤销委托 ===");

  const currentNonce = await publicClient.getTransactionCount({
    address: eoa.address,
  });
  console.log("撤销的当前 nonce：", currentNonce);

  // 创建授权以撤销 (将地址设置为零地址)
  const revokeAuth = await eoaWalletClient.signAuthorization({
    address: zeroAddress, // 零地址以撤销
    nonce: currentNonce + 1,
  });

  console.log("已创建撤销授权");

  // 发送带有撤销授权的交易
  const hash = await eoaWalletClient.sendTransaction({
    type: "eip7702",
    to: eoa.address,
    authorizationList: [revokeAuth],
  });

  console.log("已发送撤销交易：", hash);
}
const main = async () => {
  await init();
  // await checkDelegationStatus();
  // await revokeDelegation();
  // await sendNonSponsoredTransaction();
  await sendSponsoredTransaction();
};
main().catch((err) => console.error(err));

async function sendNonSponsoredTransaction2() {
  console.log("\n=== 交易 1：非赞助 (ETH 转移) ===");

  const currentNonce = await publicClient.getTransactionCount({
    address: eoa.address,
  });
  const authorization = await createAuthorization(currentNonce);
  console.log("authorization", authorization);
  // 准备 ETH 转移的调用
  const calls: readonly [Address, bigint, `0x${string}`][] = [
    [zeroAddress, parseEther("0.001"), "0x"],
    [recipientAddress, parseEther("0.002"), "0x"],
  ];

  const delegateContract = getContract({
    address: eoa.address,
    abi: delegateContractAbi,
    client: eoaWalletClient,
  });

  const hash = await delegateContract.write.execute([calls], {
    account: eoa,
    chain: sepolia,
    authorizationList: [authorization],
  });
  console.log("已发送非赞助交易：", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("非赞助交易的回执：", receipt);

  return receipt;
}
