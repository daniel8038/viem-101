import { parseAbi } from "viem";
import {
  polygonAmoyPublicClient,
  polygonAmoyWalletClient,
} from "../getClients";
import { readContract } from "viem/_types/actions/public/readContract";
const TUSDT_ABI = parseAbi(["function mint(uint256 mintedAmount) public"]);
const TUSDT_ADDRESS = "0xD32977ac92E7FA5Ca2427d8F874dd604552A2A19";
const main = async () => {
  const hash = await polygonAmoyWalletClient.writeContract({
    address: TUSDT_ADDRESS,
    abi: TUSDT_ABI,
    functionName: "mint",
    args: [2000000000n],
  });
  console.log("hash:", hash); //https://amoy.polygonscan.com/tx/0xca5f7a5c369b995c9bb8bc0efe26c0c4ce6244df69141a15d1777c1a144a9bd3
  const receipt = await polygonAmoyPublicClient.waitForTransactionReceipt({
    hash,
  });
  console.log("receipt:", receipt);
};
main().catch((err) => console.error(err));
