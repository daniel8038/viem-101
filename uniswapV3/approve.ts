import { Address, formatUnits } from "viem";
import { publicClient, walletClient } from "./getClient";
import { SWAP_ROUTER_ADDRESS, USDC_DECIMALS } from "./constants";
import { USDC_ABI } from "./abi/usdcAbi";

// 授权函数
async function approveToken(
  tokenAddress: Address,
  spender: Address,
  amount: bigint
) {
  const checkApproveAmount = await checkApprove(
    tokenAddress,
    walletClient.account.address,
    SWAP_ROUTER_ADDRESS
  );
  console.log(
    "现有USDC授权额度",
    formatUnits(checkApproveAmount, USDC_DECIMALS)
  );
  if (checkApproveAmount > amount) return;

  const hash = await walletClient.writeContract({
    abi: USDC_ABI,
    functionName: "approve",
    address: tokenAddress,
    args: [spender, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    "授权token给SwapRouter:",
    `https://sepolia.etherscan.io/tx/${hash}`
  );
}
// 检查授权函数
async function checkApprove(
  tokenAddress: Address,
  owner: Address,
  spender: Address
) {
  return await publicClient.readContract({
    abi: USDC_ABI,
    functionName: "allowance",
    address: tokenAddress,
    args: [owner, spender],
  });
}

// 取消授权函数
async function deleteApprove(tokenAddress: Address, spender: Address) {
  const amount = await checkApprove(
    tokenAddress,
    walletClient.account.address,
    spender
  );
  const hash = await walletClient.writeContract({
    abi: USDC_ABI,
    address: tokenAddress,
    functionName: "decreaseAllowance",
    args: [spender, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("取消授权:", `https://sepolia.etherscan.io/tx/${hash}`);
}

export { approveToken, deleteApprove, checkApprove };
