**本节没有代码^,会放一个常用方法的列表**

## Client/Provider 的本质

无论是 ethers 的 Provider 还是 viem 的 Client，本质上都是**区块链网络的接入点**，负责：

- 与区块链节点通信
- 发送 RPC 请求
- 处理响应数据
- 管理连接状态

其实从区块链状态来想的话更容易理解，对于状态就两种方式对吧，要么读要么写。

- 读取状态就对应 PublicClient 这些公共的方法
- 写入改变状态就对应：WalletClient

这里 WalletClient 也是可以读操作的，也就是说 WalletClient 对区块链的状态是可读可写的

## ethers vs viem 术语对比

| 功能          | ethers            | viem         |
| ------------- | ----------------- | ------------ |
| 只读操作      | JsonRpcProvider   | PublicClient |
| 写入操作      | Signer + Provider | WalletClient |
| Web3 钱包连接 | Web3Provider      | WalletClient |

## PublicClient vs WalletClient 核心区别

## 权限和安全性

### PublicClient

- ✅ **安全**：不涉及私钥，可以在前端或者公开使用
- ✅ **无需授权**：直接连接公共 RPC 节点
- ❌ **功能受限**：只能查询，不能修改状态

### WalletClient

- ⚠️ **涉及私钥**：需要妥善管理密钥安全
- ✅ **功能完整**：可以执行所有区块链操作
- ⚠️ **需要用户授权**：每次交易都需要用户确认

### 文档

**publicActions**
https://viem.sh/docs/actions/public/introduction
**WalletActions**
https://viem.sh/docs/actions/wallet/introduction

## 总结

- **PublicClient** = 区块链的"只读数据库客户端"
- **WalletClient** = 区块链的"写操作客户端" + 所有只读功能
- 根据实际需求选择，查询用 Public，交易用 Wallet
- 生产环境中，WalletClient 通常连接用户的浏览器钱包，而不是直接使用私钥
