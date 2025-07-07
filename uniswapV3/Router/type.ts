import { GetContractReturnType } from "viem";
import { swapRouter02Abi } from "../abi/swapRouterAbi";
import { walletClient } from "../getClient";

type SwapRouterContract = GetContractReturnType<
  typeof swapRouter02Abi,
  typeof walletClient
>;
export type ExactInputSingleParams = Parameters<
  SwapRouterContract["write"]["exactInputSingle"]
>[0][0];
export type ExactInputParams = Parameters<
  SwapRouterContract["write"]["exactInput"]
>[0][0];
