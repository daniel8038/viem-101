import { encodeAbiParameters, parseAbi, TransactionRequest } from "viem";
import { polygonAmoyWalletClient } from "../getClients";
import { bytecodeERC20 } from "./bytescode";
const abiERC20 = parseAbi([
  "constructor(string name_, string symbol_)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function mint(uint amount) external",
]);
async function deployContract() {
  const hash = await polygonAmoyWalletClient.deployContract({
    abi: abiERC20,
    bytecode: bytecodeERC20,
    args: ["PangPang", "PangPang"],
  });
  // 通过hash可以查看到已经部署成功了 只不过没有开源  如果开源的话 是需要和区块库浏览器交互 需要APIKEY
  // 可以使用03讲的读合约 使用部署后的合约地址 进行测试一下 0x611cDB58dfD6Ed89BCE39fc194a53Ed22A847DEa 不过要记着这里是amoy区块链 别搞错client了
  console.log(hash);
}

// deployContract().catch((err) => console.error(err));
// 现在改为发送交易的形式创建合约
async function deployContract2() {
  const constructorAbi = parseAbi([
    "constructor(string name_, string symbol_)",
  ]);
  const description = constructorAbi.find(
    (x) => "type" in x && x.type === "constructor"
  );
  // 构造函数参数
  const constructorBytes = encodeAbiParameters(description!.inputs, [
    "pangpang",
    "PP",
  ]);
  // 也可以直接自己写
  //   const constructorBytes = encodeAbiParameters(
  //     [
  //       { type: "string", name: "name_" },
  //       { type: "string", name: "symbol_" },
  //     ],
  //     ["pangpang", "PP"]
  //   );

  // 因为合约有构造函数 在这里拼接一下 去掉constructorBytes的0x
  const fullBytes = (bytecodeERC20 +
    constructorBytes.slice(2)) as `0x${string}`;
  const tx: TransactionRequest = {
    to: null,
    data: fullBytes,
  };
  const hash = await polygonAmoyWalletClient.sendTransaction(tx);
  // 拿到合约地址 继续用03讲一样的代码进行测试0xDb48f683c980823858fc22ed49a6E1E4c323a401
  console.log(hash);
}

deployContract2().catch((err) => console.error(err));
