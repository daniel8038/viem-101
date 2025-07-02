import {
  decodeFunctionResult,
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbi,
  parseEther,
  toHex,
} from "viem";

// 这里直接使用 rpc  因为viem 都封装好了，显示不出来 与rpc交互后的操作
const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const V_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);
const abi = erc20Abi,
  functionName = "balanceOf",
  args = [V_ADDRESS] as const;
const callData = encodeFunctionData({
  abi,
  functionName,
  args,
});
console.log("callData", callData);
console.log("-------------------");
// 🔧 计算 WETH 代币余额的存储槽位置  这是solidity的存储机制
// WETH 合约中 balanceOf mapping slot
function getBalanceStorageSlot(
  userAddress: string,
  balanceSlot: number
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["address", "uint256"],
      [userAddress as `0x${string}`, BigInt(balanceSlot)]
    )
  );
}
const storageSlot = getBalanceStorageSlot(V_ADDRESS, 3);
console.log("Storage slot for balance:", storageSlot);
// 这里的参在 https://www.quicknode.com/docs/ethereum/eth_call 都有说明，
const raw = JSON.stringify({
  method: "eth_call",
  params: [
    {
      from: V_ADDRESS,
      to: WETH_ADDRESS,
      data: callData,
    },
    "latest",
  ],
  id: 1,
  jsonrpc: "2.0",
});

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
} as RequestInit;

fetch("https://docs-demo.quiknode.pro/", requestOptions)
  .then((response) => response.json())
  .then((res) => {
    let result = res.result;
    console.log("result:", res);
    console.log("-------------------");
    const formatResult = decodeFunctionResult({
      abi,
      args,
      functionName,
      data: result as `0x${string}`,
    });
    //
    console.log("formatResult", formatResult);
    console.log("-------------------");
  })
  .catch((error) => console.log("error", error));
