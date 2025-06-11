# 交易

这一讲与 WTF 不再对应，这一讲来解释 EVM 上的交易，为之后的写函数发送交易做铺垫

## 交易的本质

在 EVM（以太坊虚拟机）上，**交易是改变区块链状态的唯一方式**。无论是转账、调用合约、部署合约，都需要通过交易来完成。
也可以说 EVM 就是交易驱动的，交易依次执行且具有原子性。原子性的意思就是说 一笔交易要么执行成功，要么执行失败。而失败的交易，不会改变区块链状态。比如 solidity 代码在执行过程中 将 一个 count = 1 变成了 count = 2，只要交易最后执行失败，无论过程中改变了什么状态，全部都会被回滚，回到没有执行交易的状态。

## 交易包含的核心部分

### 1. **基础信息**

| 字段    | 说明              | 示例                                         |
| ------- | ----------------- | -------------------------------------------- |
| `from`  | 发送方地址        | `0x742d35cc6634C0532925a3b8D19389fC5e5D2c07` |
| `to`    | 接收方地址        | `0xA0b86a33E6417c8aDe5D0E5A4C7D7E9bFA5D28B7` |
| `value` | 转账金额（Wei）   | `1000000000000000000` (1 ETH)                |
| `data`  | 交易数据/调用数据 | `0x` (空) 或编码的函数调用                   |

上一章 readContract 中的源码的截图中的 calldata 就是作为这里的 data

```ts
{
    from: MY_ADDRESS,
    to: CONTRACT_ADDRESS,
    value: ETH_COUNT,
    data: CALLDATA
}
```

### 2. **Gas 相关**

出基础信息外，还有 gas。但是 gas 的处理分为了两种方式：

- Legacy 模式使用 gasPrice gasLimit
- EIP-1559 一种新的 GAS 结构: maxFeePerGas maxPriorityFeePerGas
  EIP-1159 解释[https://learnblockchain.cn/article/6914]

| 字段                   | 说明                | 作用                     |
| ---------------------- | ------------------- | ------------------------ |
| `gas` / `gasLimit`     | Gas 限制            | 防止无限循环，限制计算量 |
| `gasPrice`             | Gas 价格 (Legacy)   | 每单位 Gas 的价格        |
| `maxFeePerGas`         | 最大费用 (EIP-1559) | 愿意支付的最高 Gas 价格  |
| `maxPriorityFeePerGas` | 优先费 (EIP-1559)   | 给矿工的小费             |

### 3. **交易序号**

每一笔交易都有独一无二的 nonce

| 字段    | 说明     | 作用                       |
| ------- | -------- | -------------------------- |
| `nonce` | 交易序号 | 防止重放攻击，确保交易顺序 |

### 4. **网络标识**

| 字段      | 说明  | 示例                             |
| --------- | ----- | -------------------------------- |
| `chainId` | 链 ID | `1` (主网), `11155111` (Sepolia) |

### 5. **签名信息**

| 字段          | 说明     | 作用                           |
| ------------- | -------- | ------------------------------ |
| `v`, `r`, `s` | 数字签名 | 证明交易确实由 `from` 地址发出 |

## 交易类型详解

### Type 0: Legacy 交易（传统）

```typescript
{
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  data: '0x',
  gas: 21000,
  gasPrice: '20000000000',  // 20 Gwei
  nonce: 42,
  chainId: 1
}
```

### Type 2: EIP-1559 交易（推荐）

```typescript
{
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  data: '0x',
  gas: 21000,
  maxFeePerGas: '30000000000',      // 30 Gwei
  maxPriorityFeePerGas: '2000000000', // 2 Gwei
  nonce: 42,
  chainId: 1,
  type: 2
}
```

## 不同交易场景

### 1. **简单 ETH 转账**

```typescript
const transaction = {
  to: "0x接收方地址",
  value: parseEther("1"), // 1 ETH
  // data 为空，表示简单转账
};
```

### 2. **调用合约函数**

```typescript
const transaction = {
  to: "0x合约地址",
  value: 0n, // 通常为 0，除非函数是 payable
  data: encodeFunctionData({
    abi: contractAbi,
    functionName: "transfer",
    args: [recipient, amount],
  }),
};
```

### 3. **部署合约**

```typescript
const transaction = {
  // to 为空，表示部署合约
  to: undefined,
  value: 0n,
  data: contractBytecode + constructorParams,
};
```

## Gas 机制详解

### Gas 的作用

1. **防止无限循环** - 限制计算资源
2. **网络防护** - 防止垃圾交易
3. **矿工激励** - 支付给矿工的费用

### Gas 计算

```
实际费用 = gasUsed × gasPrice
```

### EIP-1559 费用计算

```
baseFee = 网络基础费用（动态调整）
priorityFee = 给矿工的小费
totalFee = baseFee + priorityFee

实际费用 = gasUsed × min(maxFeePerGas, baseFee + maxPriorityFeePerGas)
```

## 交易数据 (data) 详解

### 空数据 - ETH 转账

```typescript
data: "0x"; // 或者不设置
```

### 合约函数调用数据

```typescript
// 函数选择器 (4 bytes) + 参数编码
data: "0xa9059cbb" + // transfer(address,uint256) 函数签名的前4字节
  "000000000000000000000000742d35cc6634C0532925a3b8D19389fC5e5D2c07" + // 接收方地址
  "0000000000000000000000000000000000000000000000000de0b6b3a7640000"; // 转账金额
```

### 合约部署数据

```typescript
data: contractBytecode + constructorParameters;
```

## 交易生命周期

### 1. **创建交易**

```typescript
const transaction = {
  to: recipient,
  value: amount,
  gas: gasLimit,
  maxFeePerGas: maxFee,
  maxPriorityFeePerGas: priorityFee,
  nonce: await client.getTransactionCount({ address: account.address }),
};
```

### 2. **签名交易**

```typescript
const signedTransaction = await account.signTransaction(transaction);
```

### 3. **发送交易**

```typescript
const hash = await client.sendRawTransaction({
  serializedTransaction: signedTransaction,
});
```

### 4. **等待确认**

```typescript
const receipt = await client.waitForTransactionReceipt({ hash });
```

## viem 中的交易示例

### 简单转账

```typescript
const hash = await walletClient.sendTransaction({
  to: "0x...",
  value: parseEther("1"),
});
```

### 合约调用

```typescript
const hash = await walletClient.writeContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: "transfer",
  args: [recipient, amount],
  gas: 100000n,
  maxFeePerGas: parseGwei("30"),
  maxPriorityFeePerGas: parseGwei("2"),
});
```

### 批量操作

```typescript
// 多个交易
const results = await Promise.all([
  walletClient.sendTransaction({...}),
  walletClient.writeContract({...}),
  walletClient.writeContract({...})
])
```

## 交易状态和确认

### 交易状态

- **Pending** - 在内存池中等待
- **Included** - 被包含在区块中
- **Confirmed** - 获得足够确认
- **Failed** - 执行失败

### 确认机制

```typescript
// 等待 1 个确认
const receipt = await client.waitForTransactionReceipt({
  hash,
  confirmations: 1,
});

// 等待多个确认（更安全）
const receipt = await client.waitForTransactionReceipt({
  hash,
  confirmations: 6, // 通常认为 6 个确认比较安全
});
```

## 常见错误和处理

### 1. **Gas 不足**

```typescript
// 错误：Gas 估算过低
gas: 21000n; // 对于复杂合约调用可能不够

// 解决：适当增加 Gas
gas: (estimatedGas * 120n) / 100n; // 增加 20% 余量
```

### 2. **Nonce 错误**

```typescript
// 错误：使用错误的 nonce
nonce: 100; // 如果当前应该是 42

// 解决：获取正确的 nonce
nonce: await client.getTransactionCount({ address });
```

### 3. **Gas 价格过低**

```typescript
// 错误：Gas 价格太低，交易长时间不被确认
maxFeePerGas: parseGwei("1"); // 太低

// 解决：查看当前网络建议的 Gas 价格
const feeData = await client.estimateFeesPerGas();
```

## 最佳实践

### 1. **Gas 优化**

```typescript
// 先估算 Gas
const gasEstimate = await client.estimateGas({
  to: contractAddress,
  data: calldata,
});

// 增加适当余量
const gasLimit = (gasEstimate * 120n) / 100n;
```

### 2. **错误处理**

```typescript
try {
  const hash = await walletClient.sendTransaction({...})
  const receipt = await client.waitForTransactionReceipt({ hash })

  if (receipt.status === 'success') {
    console.log('交易成功')
  } else {
    console.log('交易失败')
  }
} catch (error) {
  if (error.code === 4001) {
    console.log('用户拒绝交易')
  } else {
    console.error('交易错误:', error)
  }
}
```

### 3. **费用控制**

```typescript
// 获取网络建议费用
const feeData = await client.estimateFeesPerGas();

const transaction = {
  // ...
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
};
```

## 总结

EVM 交易是区块链状态变更的基础，理解交易结构对于 DApp 开发至关重要：

- **基础字段**：from, to, value, data 决定交易内容
- **Gas 机制**：控制计算资源和费用
- **签名验证**：确保交易安全性
- **状态管理**：跟踪交易生命周期

掌握这些概念后，就可以开始实际的合约交互和状态修改操作了！
