import {
  Address,
  parseUnits,
  getContract,
  erc20Abi,
  Hex,
  parseSignature,
} from "viem";
import { walletClient, publicClient } from "../getClient";
import { USDC_ABI } from "../abi/usdcAbi";
import { PermitParams } from "../Router/type";
// Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)

async function getTokenDomain(tokenAddress: Address) {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: USDC_ABI,
    client: publicClient,
  });

  const [name, chainId] = await Promise.all([
    tokenContract.read.name(),
    publicClient.getChainId(),
  ]);
  let version = "1";

  version = (await tokenContract.read.version()) as string;

  return {
    name,
    version,
    chainId: BigInt(chainId),
    verifyingContract: tokenAddress,
  };
}

async function getUserNonce(
  tokenAddress: Address,
  owner: Address
): Promise<bigint> {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: [
      {
        name: "nonces",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    client: publicClient,
  });

  try {
    return await tokenContract.read.nonces([owner]);
  } catch (error) {
    console.error("获取 nonce 失败:", error);
    throw error;
  }
}
interface SignPermitParams {
  owner: Address;
  spender: Address;
  value: bigint;
  deadline: bigint;
  nonce?: bigint;
}
export async function signPermit(
  tokenAddress: Address,
  params: SignPermitParams
): Promise<PermitParams> {
  console.log("🔐 开始生成 Permit 签名...");
  const domain = await getTokenDomain(tokenAddress);
  const nonce = await getUserNonce(tokenAddress, params.owner);
  console.log("🔢 当前 nonce:", nonce.toString());
  const typedData = {
    domain,
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit" as const,
    message: {
      owner: params.owner,
      spender: params.spender,
      value: params.value,
      nonce,
      deadline: params.deadline,
    },
  };

  const signature = await walletClient.signTypedData(typedData);

  const { r, s, v } = parseSignature(signature);

  return [
    tokenAddress,
    params.value,
    params.deadline,
    Number(v?.toString()),
    r,
    s,
  ];
}
