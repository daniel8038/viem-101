import { encodePacked, parseUnits } from "viem";
import {
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  DAI_ADDRESS,
  NOTMANY_ADDRESS,
} from "../constants";
import { walletClient } from "../getClient";
import { swapRouter } from "./swapRouter";

async function main() {
  // await swapRouter.approvalMax("0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2");
  // await deleteApprove(USDC_ADDRESS, SWAP_ROUTER_ADDRESS);
  /////////////////////////////////////////////
  //  exactInputSingle 执行 USDC 换 WETH      //
  ////////////////////////////////////////////
  /*
  await swapRouter.exactInputSingle({
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 100,
    recipient: walletClient.account.address,
    amountIn: parseUnits("200", USDC_DECIMALS),
    // 这里滑点就不考虑了 直接百分之百的滑点
    amountOutMinimum: 0n,
    // 默认0 就可以 不做限价
    sqrtPriceLimitX96: 0n,
  });
  */
  /*
  //多跳路径 这个是一个bytes
  const path = encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [USDC_ADDRESS, 100, WETH_ADDRESS, 3000, NOTMANY_ADDRESS]
  );
  await swapRouter.exactInput(USDC_ADDRESS, {
    path,
    recipient: walletClient.account.address,
    amountIn: parseUnits("200", USDC_DECIMALS),
    amountOutMinimum: 0n,
  });
  */
}
main().catch((err) => {
  console.log("主程序出错：", err);
});
