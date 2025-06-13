import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, polygonAmoy } from "viem/chains";
import { PRIVATE_KEY } from "./constants";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.public.blastapi.io"),
});

export const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: mainnet,
  transport: http(),
});
export const polygonAmoyPublicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
// 注意viem中account这个字段的类型不是私钥，要使用privateKeyToAccount将PRIVATE_KEY转换为PrivateKeyAccount类型
export const polygonAmoyWalletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: polygonAmoy,
  transport: http(),
});
