# data

这一讲与 WTF 不再对应，讲一讲交易结构 TransactionRequest 里的 data 字段，为之后的 deployContract 做铺垫
其实这个在 04-tx 这一讲里已经涉及啦，在最后的不同交易场景段落。这一章是重复讲一下。

这个接口可以去 viem 的源码里查看
`import { TransactionRequest ,TransactionRequestBase} from "viem";`

```ts
export type TransactionRequest<quantity = bigint, index = number> = OneOf<
  | TransactionRequestLegacy<quantity, index>
  | TransactionRequestEIP2930<quantity, index>
  | TransactionRequestEIP1559<quantity, index>
  | TransactionRequestEIP4844<quantity, index>
  | TransactionRequestEIP7702<quantity, index>
>;
```

```ts
export type TransactionRequestBase<
  quantity = bigint,
  index = number,
  type = string
> = {
  /** Contract code or a hashed method call with encoded args */
  data?: Hex | undefined;
  /** Transaction sender */
  from?: Address | undefined;
  /** Gas provided for transaction execution */
  gas?: quantity | undefined;
  /** Unique number identifying this transaction */
  nonce?: index | undefined;
  /** Transaction recipient */
  to?: Address | null | undefined;
  /** Transaction type */
  type?: type | undefined;
  /** Value in wei sent with this transaction */
  value?: quantity | undefined;
};
```

# data

EVM 交易的 data 字段是以太坊交易中的一个重要组成部分，用于携带额外的数据信息。

## 基本概念

data 字段是一个可变长度的字节数组，以十六进制格式存储，用于在交易中传递额外信息。它在不同类型的交易中有不同的用途。

## 主要用途

**智能合约调用**

- 当调用智能合约函数时，data 字段包含函数选择器和参数
- 前 4 个字节是函数签名的 Keccak-256 哈希值（函数选择器）
- 后续字节是 ABI 编码的函数参数

也就是 calldata 这里之后的文章会讲到
**合约部署**

- 部署新合约时，data 字段包含合约的字节码
- 包括构造函数参数（如果有的话）

**普通转账**

- 对于简单的 ETH 转账，data 字段通常为空
- 也可以包含备注信息或其他数据 (比如一条 `hello world` 的 message,当初以太坊的铭文就是讲数据放入 data 字段里)

## 具体格式

**函数调用示例：**

```
0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b8d1c1f7b4b9b1234500000000000000000000000000000000000000000000000000000000000f4240
```

- `a9059cbb`：transfer 函数选择器
- 后续数据：ABI 编码的参数（接收地址和转账金额）

**数据编码规则**

- 使用 ABI（Application Binary Interface）编码标准
- 每个参数占用 32 字节槽位
- 动态类型（如 string、bytes）有特殊的编码方式

## 重要特点

**Gas 消耗**

- data 字段中的每个零字节消耗 4 gas
- 每个非零字节消耗 16 gas
- 这会影响交易的总 gas 成本

**大小限制**

- 理论上没有硬性大小限制
- 实际受区块 gas 限制约束
- 过大的 data 会导致 gas 不足，导致交易失败

data 字段是 EVM 生态系统中实现复杂交易逻辑的核心机制，理解其结构对于以太坊开发和交易分析都非常重要。
