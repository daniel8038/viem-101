import { mainnet } from "viem/chains";
import { Address, createPublicClient, http, Transport } from "viem";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.public.blastapi.io"),
});

async function main() {
    
  const address = await publicClient.getEnsAddress({
    name: "vitalik.eth",
  });
    
  console.log(address); //0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  const balance = await publicClient.getBalance({
    address: address as Address,
    // address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  });
  console.log(balance); //157086230675358967n;
}
main().catch((err) => {
  console.error(err);
});
//
