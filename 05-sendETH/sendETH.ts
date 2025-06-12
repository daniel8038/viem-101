import {
  polygonAmoyWalletClient,
  polygonAmoyPublicClient,
} from "../getClients";
import { MY_ACCOUNT } from "../constants";
import {
  createWalletClient,
  http,
  parseEther,
  TransactionRequest,
  walletActions,
} from "viem";
import {
  english,
  generateMnemonic,
  generatePrivateKey,
  mnemonicToAccount,
} from "viem/accounts";
import { polygonAmoy } from "viem/chains";
const new_P = generatePrivateKey(); //这个方法用来生成一个新的私钥
const new_mnenomic = generateMnemonic(english); //这个可以生成一个新的助记词
// 但是在使用的时候都是要转换为account 然后创建 walletClient
// 这里留一个从助记词创建client的方法 一般不需要这么做
const account = mnemonicToAccount("你的助记词 / new_mnenomic", {
  accountIndex: 1,
});
const client = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http(),
});
const main = async () => {
  // 查看余额
  const balance = await polygonAmoyPublicClient.getBalance({
    address: MY_ACCOUNT,
  });
  console.log("余额：", balance);
  const transaction: TransactionRequest = {
    to: MY_ACCOUNT,
    value: parseEther("0.001"),
  };
  // 直接转给自己
  const hash = await polygonAmoyWalletClient.sendTransaction(transaction);
  console.log("hash:", hash); //https://amoy.polygonscan.com/tx/0xcfb8731a8f2af75d4148e8bf9f482131ea45bf082a70aa786b69e65f1de1ac81
  const receipt = await polygonAmoyPublicClient.waitForTransactionReceipt({
    hash,
  });
  console.log("receipt:", receipt);
};
main();
