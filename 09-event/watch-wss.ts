import {
  createPublicClient,
  GetContractEventsReturnType,
  webSocket,
} from "viem";
import { mainnet } from "viem/chains";
import { USDT_ABI, USDT_ADDRESS } from "./constants";

const wssPublicClient = createPublicClient({
  chain: mainnet,
  // 注意这里rpc是公开的 不稳定  自己去在quicknode 或者 alchemy自己申请一个端点
  transport: webSocket("wss://ethereum-rpc.publicnode.com"),
});
type TransferLogs = GetContractEventsReturnType<typeof USDT_ABI, "Transfer">;

const onLogs = (logs: TransferLogs) => {
  // 遍历数组，一个一个处理
  logs.forEach((log, index) => {
    console.log(`处理第 ${index + 1} 个事件:`);
    console.log("From:", log.args.from);
    console.log("To:", log.args.to);
    console.log("Value:", log.args.value);
    console.log("---");
  });
};
const unWatch = wssPublicClient.watchContractEvent({
  address: USDT_ADDRESS,
  abi: USDT_ABI,
  eventName: "Transfer",
  onLogs,
  onError: (err) => {
    console.log(err);
  },
});
