这一讲是关于静态调用`eth_call`的,并且会插入一点比较有意思的 uniswapV3 的一点东西。

# eth_call

在 ether 中把这个称为 staticCall，其实在 ethers 中 staticCall 也是用的`eth_call`.

执行函数调用但不上链，返回的结果是 bytes。

这这里可以查看下
[rpc method](https://www.quicknode.com/docs/ethereum/eth_call)

插一点 estimateGas 的知识，在 rpc 方法里还有一个 eth_estimateGas 用来做 gas 估算的。
其实两者在底层上是没有什么区别的，在 geth 上使用的都是一种方式、但是具体是什么方法就不太了解了，可能是 doCall 方法。这是在底层做的，没必要关心。

这个方法和 eth_call 的区别就是：

- eth_call 返回的 bytes 数据

  ```json
  // eth_call 请求
  {
    "method": "eth_call",
    "params": [
      {
        "to": "0x...",
        "data": "0x..."
      },
      "latest"
    ]
  }
  // 返回: "0x000000000000000000000000000000000000000000000000000000000000007b"
  ```

- estimateGas 返回的是:
  ```json
  // eth_estimateGas 请求
  {
    "method": "eth_estimateGas",
    "params": [
      {
        "to": "0x...",
        "data": "0x...",
        "from": "0x..."
      }
    ]
  }
  /// 这里是 gas相关数据
  // 返回: "0x5208" (21000 in decimal)
  ```

```ts
        case "call":
                return {
                    method: "eth_call",
                    args: [ this.getRpcTransaction(req.transaction), req.blockTag ]
                };

        case "estimateGas": {
                return {
                    method: "eth_estimateGas",
                    args: [ this.getRpcTransaction(req.transaction) ]
                };
            }

```

# viem

在 viem 中 模拟调用`simulateContract` 和 readContract 使用的都是`eth_call` 这里会返回相应的数据。
因为返回的是 bytes，所以 viem 使用 `decodeFunctionResult`解析了结果

```ts
const result = decodeFunctionResult({
  abi,
  args,
  functionName,
  data: data || "0x",
});
//decodeFunctionResult 中使用了
const values = decodeAbiParameters(abiItem.outputs, data);
```

`estimateContractGas`·`estimateGas` 使用的是 `eth_estimateGas`

```ts
// estimateGas
function estimateGas_rpc(parameters: {
  block: any;
  request: any;
  rpcStateOverride: any;
}) {
  const { block, request, rpcStateOverride } = parameters;
  return client.request({
    method: "eth_estimateGas",
    params: rpcStateOverride
      ? [request, block ?? "latest", rpcStateOverride]
      : block
      ? [request, block]
      : [request],
  });
}
// estimateContractGas
const gas = await getAction(
  client,
  estimateGas,
  "estimateGas"
)({
  data: `${data}${dataSuffix ? dataSuffix.replace("0x", "") : ""}`,
  to: address,
  ...request,
} as unknown as EstimateGasParameters);
```

# 代码实操

只写着一个示例就够了，因为 viem 已经封装完了。没必要去这样搞
eth_call.ts
