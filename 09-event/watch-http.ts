import { GetContractEventsReturnType } from "viem";
import { publicClient } from "../getClients";
import { USDT_ABI, USDT_ADDRESS } from "./constants";
type TransferLogs = GetContractEventsReturnType<typeof USDT_ABI, "Transfer">;
const onLogs = (logs: TransferLogs) => {
  console.log("---事件---");
  console.log(logs);
};
// 1 watchContractEvent
const unWatch = publicClient.watchContractEvent({
  address: USDT_ADDRESS,
  abi: USDT_ABI,
  eventName: "Transfer",
  onLogs,
});
// 这里返回的是一个数组
[
  {
    eventName: "Transfer",
    args: {
      from: "0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a",
      to: "0x1f2F10D1C40777AE1Da742455c65828FF36Df387",
      value: 1180495477901n,
    },
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    blockHash:
      "0x78ab1d709be4b52118e36db521313f435dbd0c00e0a0c0117293afe41ac1bc5a",
    blockNumber: 22728804n,
    blockTimestamp: "0x685237f7",
    data: "0x00000000000000000000000000000000000000000000000000000112db037c8d",
    logIndex: 17,
    removed: false,
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x00000000000000000000000023878914efe38d27c4d67ab83ed1b93a74d4086a",
      "0x0000000000000000000000001f2f10d1c40777ae1da742455c65828ff36df387",
    ],
    transactionHash:
      "0x8bb40715bd744e9ba5962235e1a904d369c0b446aee9f6ab9f8cfd65dab454e0",
    transactionIndex: 2,
  },
  {
    eventName: "Transfer",
    args: {
      from: "0x1f2F10D1C40777AE1Da742455c65828FF36Df387",
      to: "0xe0e0e08A6A4b9Dc7bD67BCB7aadE5cF48157d444",
      value: 1618958927360n,
    },
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    blockHash:
      "0x78ab1d709be4b52118e36db521313f435dbd0c00e0a0c0117293afe41ac1bc5a",
    blockNumber: 22728804n,
    blockTimestamp: "0x685237f7",
    data: "0x00000000000000000000000000000000000000000000000000000178f178c600",
    logIndex: 22,
    removed: false,
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x0000000000000000000000001f2f10d1c40777ae1da742455c65828ff36df387",
      "0x000000000000000000000000e0e0e08a6a4b9dc7bd67bcb7aade5cf48157d444",
    ],
    transactionHash:
      "0x8bb40715bd744e9ba5962235e1a904d369c0b446aee9f6ab9f8cfd65dab454e0",
    transactionIndex: 2,
  },
];
// 如果从watchContractEvent源码去看的话，这里其实使用 区块时间作为间隔进行poll不断的轮训获取的 其实也是filter获取。这里单开一个源码的讲解吧，这样可以清晰的知道viem是如何处理的http和websocket
// 要知道一个区块是会有很多交易的 自然有可能一个区块链包含许多关于USDT的Transfer事件 所以直接返回的是logs数组
//
