import {
  createPublicClient,
  GetContractEventsReturnType,
  parseAbiItem,
  webSocket,
} from "viem";
import { mainnet } from "viem/chains";
import { USDT_ABI, USDT_ADDRESS } from "./constants";

const wssPublicClient = createPublicClient({
  chain: mainnet,
  // 注意这里rpc是公开的 不稳定  自己去在quicknode 或者 alchemy自己申请一个端点
  transport: webSocket(
    "wss://old-autumn-butterfly.quiknode.pro/2a7609f646294db119b737f57287afa14dc3790a/"
  ),
});
type TransferLogs = GetContractEventsReturnType<typeof USDT_ABI, "Transfer">;
// 这里性能并不好 因为处理全量交易的话 很费劲
// const unWatch = wssPublicClient.watchBlocks({
//   includeTransactions: true,
//   onBlock: (data) => {
//     console.log("txs", data.transactions);
//   },
// });
const unWatch = wssPublicClient.watchBlockNumber({
  onBlockNumber: async (blockNumber) => {
    const logs = await wssPublicClient.getLogs({
      fromBlock: blockNumber,
      toBlock: blockNumber,
      address: USDT_ADDRESS,
      event: parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256)"
      ),
    });
    console.log(logs);
    // 直接处理相关事件
  },
});
