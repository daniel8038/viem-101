import { Address, getContract } from "viem";
import { walletClient, publicClient } from "../getClient";
import { swapRouter02Abi } from "./swapRouterAbi";
const swapRouter02Contract = getContract({
  abi: swapRouter02Abi,
  client: walletClient,
  address: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
});
// approvalMax
const approvalMax = async (token: Address) => {
  const hash = await swapRouter02Contract.write.approveMax([token]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`https://sepolia.etherscan.io/tx/${hash}`);
};
// main
async function main() {
  await approvalMax("0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2");
}
main().catch((err) => {
  console.log("主程序出错：", err);
});
