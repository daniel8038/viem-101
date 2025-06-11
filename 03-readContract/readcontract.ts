import { erc20Abi, formatEther, getContract, parseAbi } from "viem";
import { publicClient, walletClient } from "../getClients";
import { MY_ACCOUNT } from "../constants";
// 这是abi的函数签名的定义  这个和solidity中的interface的定义相同
const abiERC20 = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint)",
]);
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
// 创建只读合约实例
const contract = getContract({
  client: publicClient,
  address: WETH_ADDRESS,
  abi: erc20Abi, //abiERC20, //erc20Abi,
});
const main = async () => {
  const my_balance = await contract.read.balanceOf([MY_ACCOUNT]);
  const weth_name = await contract.read.name();
  const weth_totalSupply = await contract.read.totalSupply();
  console.log("\n1. 读取WETH合约信息");
  console.log(`合约地址: ${WETH_ADDRESS}`);
  console.log(`名称: ${weth_name}`);
  console.log(`代号: ${weth_totalSupply}`);
  console.log(`总供给: ${formatEther(weth_totalSupply)}`);
  console.log(my_balance);
  const weth_totalSupply2 = await publicClient.readContract({
    address: WETH_ADDRESS,
    abi: erc20Abi,
    functionName: "totalSupply",
  });
  console.log(`总供给: ${formatEther(weth_totalSupply2)}`);
};
main().catch((err) => console.error(err));
