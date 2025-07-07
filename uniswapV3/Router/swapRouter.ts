import {
  Address,
  erc20Abi,
  formatEther,
  formatUnits,
  getContract,
  parseEther,
  parseUnits,
} from "viem";
import { walletClient, publicClient } from "../getClient";
import { swapRouter02Abi } from "./swapRouterAbi";
const SWAP_ROUTER_ADDRESS =
  "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" as Address;
const USDC_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" as Address;

// 直接无限授权
async function approveToken(tokenAddress: Address, amount: bigint) {
  const checkApproveAmount = await checkApprove(
    tokenAddress,
    walletClient.account.publicKey,
    SWAP_ROUTER_ADDRESS
  );
  if (checkApproveAmount > amount) return;

  await walletClient.writeContract({
    abi: erc20Abi,
    functionName: "approve",
    address: tokenAddress,
    args: [SWAP_ROUTER_ADDRESS, amount],
  });
}
// 检查授权函数
async function checkApprove(
  tokenAddress: Address,
  owner: Address,
  spender: Address
) {
  return await publicClient.readContract({
    abi: erc20Abi,
    functionName: "allowance",
    address: tokenAddress,
    args: [owner, spender],
  });
}

class SwapRouter {
  private contract;

  constructor() {
    this.contract = getContract({
      abi: swapRouter02Abi,
      client: walletClient,
      address: SWAP_ROUTER_ADDRESS,
    });
  }

  async approvalMax(token: Address) {
    const hash = await this.contract.write.approveMax([token]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`https://sepolia.etherscan.io/tx/${hash}`);
  }

  async exactInputSingle() {
    await approveToken(USDC_ADDRESS, BigInt(parseUnits("100", 9)));
    // await this.contract.write.exactInputSingle();
  }
}

// main
async function main() {
  const swapRouter = new SwapRouter();
  await swapRouter.approvalMax("0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2");
}
main().catch((err) => {
  console.log("主程序出错：", err);
});
