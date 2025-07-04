import { createPublicClient, createWalletClient, http } from "viem";
import dotenv from "dotenv";
import process from "node:process";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
dotenv.config();
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});
// 注意viem中account这个字段的类型不是私钥，要使用privateKeyToAccount将PRIVATE_KEY转换为PrivateKeyAccount类型
export const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.FIRST_PRIVATE_KEY! as `0x${string}`),
  chain: sepolia,
  transport: http(),
});
