import { encodePacked, parseUnits } from "viem";
import {
  WETH_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  DAI_ADDRESS,
  NOTMANY_ADDRESS,
  SWAP_ROUTER_ADDRESS,
} from "../constants";
import { walletClient } from "../getClient";
import { swapRouter } from "./swapRouter";
import { deleteApprove } from "../approve";
import { signPermit } from "../utils/getPermit";

async function main() {
  // 注意这里没有做balanceOf检查余额，正常业务第一个要做的都是检查用户余额
  // approvalMax不必关注，主要还是配合multiCall  在swapRouter02直接操作流动性函数的，一般直接交互 NonfungiblePositionManager流动性管理合约 不再swapRouter02上操作
  // await swapRouter.approvalMax("0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2");
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
  /////////////////////////////////////////////
  //  exactInput      //
  ////////////////////////////////////////////
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
  /////////////////////////////////////////////
  //  permit      //
  ////////////////////////////////////////////
  // 首先要取消所有的实权
  // await deleteApprove(USDC_ADDRESS, SWAP_ROUTER_ADDRESS);
  // USDC permit parameters for selfPermit
  /*
  let permitParams = await signPermit(USDC_ADDRESS, {
    owner: walletClient.account.address,
    spender: SWAP_ROUTER_ADDRESS,
    value: parseUnits("10", USDC_DECIMALS),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
  });
  let swapExactInputSingleParams = {
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 100,
    recipient: walletClient.account.address,
    amountIn: parseUnits("10", USDC_DECIMALS),
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  };
  // 这里如果报错 STF 可能是 USDC 代币余额不足了
  // https://sepolia.etherscan.io/tx/0xaf99516525609fec9f5a7dc96a9bebd0f34fab4c1fe28e932fa6203fdb52a7c5
  await swapRouter.permitSwapExactInputSingle(
    permitParams,
    swapExactInputSingleParams
  );
  */
}
main().catch((err) => {
  console.log("主程序出错：", err);
});
