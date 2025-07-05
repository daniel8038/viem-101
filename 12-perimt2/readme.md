这里先不讲涉及到 universalRouter 这个合约的东西。

[permit2 合约源码](https://github.com/Uniswap/permit2)

```solidity
contract Permit2 is SignatureTransfer, AllowanceTransfer {
// Permit2 unifies the two contracts so users have maximal flexibility with their approval.
}
```

AllowanceTransfer（授权转账模式）

用户先通过签名进行授权
授权信息存储在 Permit2 合约中
可以多次使用同一个授权
每次使用会消耗授权额度
类似传统 ERC20 的 approve/transferFrom 模式

SignatureTransfer（签名转账模式）

每次转账都需要新的签名
不存储任何授权信息
签名使用后立即失效
一次签名只能用于一次转账
完全基于签名的即时转账

这 permit2 通过文章确实不太好写，简单的说：permit2 是一个中间的资金代理人，你将代币无限授权给 permit2，那么这个代理人就有了使用你的资金的权利(permit2 是合约，所以代理人的能力也是通过合约规定的，如果合约是恶意合约，赋予了合约乱七八糟的能力，资金依然有可能被全部转走)，但是使用资金需要验证，代理人只认之前 EIP712 的那种签名，签名通过的话才有权利支配你之前授权的资金。

[permit2 ts 代码 uniswap](https://github.com/Uniswap/sdks/tree/main/sdks/permit2-sdk)

[universal-router ts 代码 uniswap](https://github.com/Uniswap/sdks/tree/main/sdks/universal-router-sdk/src)
