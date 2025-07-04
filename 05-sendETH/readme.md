# SendETH

根据上一章的交易的结构的解释，明白了一笔交易都包含什么。那我们自己按照这种格式组装成一笔 Transaction，然后进行 send 发送到链上是不是也能执行交易？

那要注意的就是 Transaction 中的 data 字段，发送 ETH 的交易的 data 就是 0x（空），这里在上一章的最后都有说明。

# 实操

这次不再用主网，换成其他的网络你可以换成 bsc 测试网或者其他的，比较好领取测试币的网络。这里就选择 polygon
[这是领水的连接](https://faucet.stakepool.dev.br/amoy)

发送 ETH 是不是就是写操作，那这里需要的就是 walletClient
创建一个新钱包

```ts

```

从私钥创建 walletClient

```ts
const polygonAmoyWalletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: polygonAmoy,
  transport: http(),
});
```

从助记词创建 walletClient

```ts
const account = mnemonicToAccount("你的助记词", {
  accountIndex: 1, //账户索引
});
const client = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http(),
});
```

创建 transaction 结构

```ts
// TransactionRequest 进入这个类型可以查看一个transaction都可以包含什么字段
const transaction: TransactionRequest = {
  to: MY_ACCOUNT,
  value: parseEther("0.001"),
};
```

发送交易

```ts
const hash = await polygonAmoyWalletClient.sendTransaction(transaction);
// 发送交易得到hash
console.log("hash:", hash);
// 等待交易被完全确认 拿到回执单
const receipt = await polygonAmoyPublicClient.waitForTransactionReceipt({
  hash,
});
// 打印出具体的回执信息
console.log("receipt:", receipt);
```
