import {
  Address,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getContract,
  GetContractReturnType,
  parseEther,
  parseUnits,
} from "viem";
import { walletClient, publicClient } from "../getClient";
import { swapRouter02Abi } from "../abi/swapRouterAbi";
import { SWAP_ROUTER_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "../constants";
import { approveToken } from "../approve";
import { ExactInputParams, ExactInputSingleParams, PermitParams } from "./type";

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

  async exactInputSingle(params: ExactInputSingleParams) {
    await approveToken(params.tokenIn, SWAP_ROUTER_ADDRESS, params.amountIn);
    const { request } = await this.contract.simulate.exactInputSingle([params]);
    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });
    // 示例 https://sepolia.etherscan.io/tx/0x0b8b1c202fd676b78048cc5e5f7f27397d625c17f288c92b9269ca355b5c7175
    console.log(`执行交换: https://sepolia.etherscan.io/tx/${hash}`);
  }

  async exactInput(firstTokenAddress: Address, params: ExactInputParams) {
    await approveToken(firstTokenAddress, SWAP_ROUTER_ADDRESS, params.amountIn);
    const { request } = await this.contract.simulate.exactInput([params]);
    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });
    // https://sepolia.etherscan.io/tx/0xd3ed1d14ac90589a843bf809512e53bfb64f33f5bbc6d9b5855830f33f0e5926
    console.log(`执行交换: https://sepolia.etherscan.io/tx/${hash}`);
  }

  async permitSwapExactInputSingle(
    permitParams: PermitParams,
    swapExactInputSingleParams: ExactInputSingleParams
  ) {
    let calls: `0x${string}`[] = [];
    const selfPermitCalldata = encodeFunctionData({
      abi: swapRouter02Abi,
      functionName: "selfPermit",
      args: permitParams,
    });
    calls.push(selfPermitCalldata);
    const swapExactInputSingleCallData = encodeFunctionData({
      abi: swapRouter02Abi,
      functionName: "exactInputSingle",
      args: [swapExactInputSingleParams],
    });
    calls.push(swapExactInputSingleCallData);
    await this.multiCall(calls);
  }

  async multiCall(calls: `0x${string}`[], deadline?: bigint, value?: bigint) {
    let result;
    if (deadline && value) {
      result = await this.contract.simulate.multicall([deadline, calls], {
        value,
      });
    } else if (deadline) {
      result = await this.contract.simulate.multicall([deadline, calls]);
    } else {
      result = await this.contract.simulate.multicall([calls]);
    }
    const hash = await walletClient.writeContract(result.request);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`multiCall: https://sepolia.etherscan.io/tx/${hash}`);
  }
}

export const swapRouter = new SwapRouter();
