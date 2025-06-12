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

export const polygonAmoyWalletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: polygonAmoy,
  transport: http(),
});
