router 合约有两个：swapRouter 和 universalRouter

[swapRouter 区块链浏览器连接](https://sepolia.etherscan.io/address/0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E#writeProxyContract)

[swapRouter 合约源码](https://github.com/Uniswap/swap-router-contracts/blob/main/contracts/SwapRouter02.sol)

[universalRouter 区块链浏览器连接](https://sepolia.etherscan.io/address/0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD#writeContract)

[universalRouter 合约源码](https://github.com/Uniswap/universal-router/blob/main/contracts/UniversalRouter.sol)

有些方法是从其他的合约继承来的,我们一个一个的进行简单的解读，最后在讲解 swapRouter 上最主要的方法

```solidity
contract SwapRouter02 is ISwapRouter02, V2SwapRouter, V3SwapRouter, ApproveAndCall, MulticallExtended, SelfPermit {
    constructor(
        address _factoryV2,
        address factoryV3,
        address _positionManager,
        address _WETH9
    ) ImmutableState(_factoryV2, _positionManager) PeripheryImmutableState(factoryV3, _WETH9) {}
}
```

# approveMax...

这个其实就是授权给合约的 unit256 的最大值，我们直接看合约中的实现就行。这个函数不是用户需要交互的 没什么需要学习的。这是合约自己使用的。就是 swapRouter 授权 positionManager 合约可以无限使用这个 swapRouter 所拥有的 token。

ts 代码中有交互示例，但是没什么用 这里不是用户该操作的

```solidity
 function approveMax(address token) external payable override {
    // 这里很简单 就是使用tryApprove 参数就是token 和 uint256的最大值
        require(tryApprove(token, type(uint256).max));
    }
 function tryApprove(address token, uint256 amount) private returns (bool) {
    // 这里的意思就是调用token合约上的approve 方法 参数就是positionManager amount
    // 也就是授权给 positionManager  uint256的最大值
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.approve.selector, positionManager, amount));
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }
    // 那剩下的这几个同样也是授权  估计是为了兼容其他类型的 代币   具体原因我没有去关注
    function approveMaxMinusOne(address token) external payable override {
        require(tryApprove(token, type(uint256).max - 1));
    }

    /// @inheritdoc IApproveAndCall
    function approveZeroThenMax(address token) external payable override {
        require(tryApprove(token, 0));
        require(tryApprove(token, type(uint256).max));
    }

    /// @inheritdoc IApproveAndCall
    function approveZeroThenMaxMinusOne(address token) external payable override {
        require(tryApprove(token, 0));
        require(tryApprove(token, type(uint256).max - 1));
    }
```

# callPositionManager

这是通过 calldata 调用 callPositionManager 上的函数的，也不必太关注。也是为了合约里自己处理的。关键看后续的函数

```solidity
    function callPositionManager(bytes memory data) public payable override returns (bytes memory result) {
        bool success;
        (success, result) = positionManager.call(data);

        if (!success) {
            // Next 5 lines from https://ethereum.stackexchange.com/a/83577
            if (result.length < 68) revert();
            assembly {
                result := add(result, 0x04)
            }
            revert(abi.decode(result, (string)));
        }
    }
```

# swapRouter 核心函数

核心函数包括：exactInput、exactInputSingle、exactOutput、exactOutputSingle

## Uniswap V3 核心交换函数

### exactInputSingle

- **功能**：指定输入代币数量，单池交换
- **场景**：A → B 直接交换，知道要卖多少 A，想知道能得到多少 B

### exactInput

- **功能**：指定输入代币数量，多池路径交换
- **场景**：A → B → C 多跳交换，知道要卖多少 A，想知道最终能得到多少 C

### exactOutputSingle

- **功能**：指定输出代币数量，单池交换
- **场景**：A → B 直接交换，知道要买多少 B，想知道需要卖多少 A

### exactOutputSingle

- **功能**：指定输出代币数量，多池路径交换
- **场景**：A → B → C 多跳交换，知道要买多少 C，想知道需要卖多少 A

**简单总结**：

- exactInput (指定输入)

你确定要卖的数量
例如：我有 100 USDC，想全部卖掉换成 ETH
你知道输入 100 USDC，但不知道能得到多少 ETH

- exactOutput (指定输出)

你确定要买的数量
例如：我想买 1 ETH，不管需要花多少 USDC
你知道想得到 1 ETH，但不知道需要花多少 USDC

- `Single` = 单池直接交换
- 无`Single` = 多池路径交换

这里就先说 Single 的，因为多跳的无 Single 的也是依赖的 Single 函数

## exactInputSingle

这是合约中的处理

```solidity
    /// @inheritdoc IV3SwapRouter
    function exactInputSingle(ExactInputSingleParams memory params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        // use amountIn == Constants.CONTRACT_BALANCE as a flag to swap the entire balance of the contract
        // 这个变量主要要是处理 uniswapV3 先给用户代币 在收取代币的程序的。这个会影响到 代币收取的时候 是从 用户手里 还是 address(this) 这里  这个主要是SwapCallback 执行的
        bool hasAlreadyPaid;
        // 这里的CONTRACT_BALANCE是0
        // https://github.com/Uniswap/swap-router-contracts/blob/main/contracts/libraries/Constants.sol
        if (params.amountIn == Constants.CONTRACT_BALANCE) {
            // 如果amountIn == 0 的话
            hasAlreadyPaid = true;
            // 直接使用这个合约中的所有的tokenIn的余额  注意这里可能是为了 合约交互合约的，千万不要直接向swapRouter转入代币 而是要通过授权进行操作  这里我不太懂 因为这里没有限制就是使用全部余额，举个例子 别人向swapRouter转入USDC 你直接使用0作为参数 那会不会直接把别人转入的USDC给使用掉那？
            // 这个我也不太清楚  所以我说 千万不要直接向swapRouter转入代币 而是要通过授权进行操作
            params.amountIn = IERC20(params.tokenIn).balanceOf(address(this));
        }
        // 调用exactInputInternal 得到amountOut
        amountOut = exactInputInternal(
            params.amountIn,
            params.recipient,
            params.sqrtPriceLimitX96,
            // // 这个变量主要要是处理 uniswapV3 先给用户代币 在收取代币的程序的。这个会影响到 代币收取的时候 是从 用户手里 还是 address(this) 这里  这个主要是SwapCallback 执行的
            SwapCallbackData({
                path: abi.encodePacked(params.tokenIn, params.fee, params.tokenOut),
                payer: hasAlreadyPaid ? address(this) : msg.sender
            })
        );
        // 对比滑点 判断是否能够交易
        require(amountOut >= params.amountOutMinimum, 'Too little received');
    }
    /// @dev Performs a single exact input swap
    function exactInputInternal(
        uint256 amountIn,
        address recipient,
        uint160 sqrtPriceLimitX96,
        SwapCallbackData memory data
    ) private returns (uint256 amountOut) {
        // find and replace recipient addresses
        // 处理特殊接收地址常量 address(1) address(2) flag，将recipient替换为实际地址 这种常量的处理 应该是为了节省gas
        if (recipient == Constants.MSG_SENDER) recipient = msg.sender;
        else if (recipient == Constants.ADDRESS_THIS) recipient = address(this);
        // 这里是从上个函数的传入的 path: abi.encodePacked(params.tokenIn, params.fee, params.tokenOut) 解析出来(address tokenIn, address tokenOut, uint24 fee)
        (address tokenIn, address tokenOut, uint24 fee) = data.path.decodeFirstPool();
        // 这里就是uniswapV3的代币排序问题  每个池是按照token0 token1存储的 按照地址的大小判断 0 和 1 小的是0 大的是1
        // 这个也是swap时需要的参数
        bool zeroForOne = tokenIn < tokenOut;
        //调用 getPool 得到pool地址 然后调用pool上的swap函数
        (int256 amount0, int256 amount1) =
            getPool(tokenIn, tokenOut, fee).swap(
                recipient,
                zeroForOne,
                amountIn.toInt256(),
                sqrtPriceLimitX96 == 0
                    ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                    : sqrtPriceLimitX96,
                abi.encode(data)
            );

        return uint256(-(zeroForOne ? amount1 : amount0));
    }
    // 这里没什么好看的  你直接去看 工厂合约的 函数就可以明白
    // https://sepolia.etherscan.io/address/0x0227628f3F023bb0B980b67D528571c95c6DaC1c#code
    // 看一下创建pool的时候用的什么参数  getPool这个mapping 是什么  注意：solidity会自动为public的成员变量生成 view函数 所以mapping可以像 读函数一样被调用
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) private view returns (IUniswapV3Pool) {
        return IUniswapV3Pool(PoolAddress.computeAddress(factory, PoolAddress.getPoolKey(tokenA, tokenB, fee)));
    }
```

好了，下边简单看一下 pool 中的 swap 函数在继续看，exactInputSinge 中的 callback 函数

```solidity
// 这是exactInputInternal 内部的调用
 getPool(tokenIn, tokenOut, fee).swap(
    recipient,
    zeroForOne,
    amountIn.toInt256(),
    sqrtPriceLimitX96 == 0
    // 根据交换方向设置默认的极限价格 就是任何价格都可以  这个一般都是 0 不是0的话就可以当作一个限价单
            ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
            : sqrtPriceLimitX96,
    abi.encode(data))
// exactInputSingle给exactInputInternal的SwapCallbackData memory data，也就是 abi.encode(data))这个
 SwapCallbackData({
                path: abi.encodePacked(params.tokenIn, params.fee, params.tokenOut),
                payer: hasAlreadyPaid ? address(this) : msg.sender
            })
// 这里的swap函数很多的代码 主要是有他的tick算法啥的 不是合约工程师 不用太在意这个
// https://github.com/Uniswap/v3-core/blob/main/contracts/UniswapV3Pool.sol#L596
// 直接看最后的
// 这里就是 pool先把币转给用户 ，然后记录一下现在的余额 在SwapCallback要求用户转过对应的币的数量，
// 执行完回调之后 判断下余额数量 验证用户是否真的支付了足够的 token0
if (zeroForOne) {
    // 正负 主要还是区分 exactOutput 还是 exactInput， exactOutput会为正 表示用户需要支付的量
    // 1. 先发送 token1 给用户（如果 amount1 < 0，表示用户应该收到代币）
    if (amount1 < 0) TransferHelper.safeTransfer(token1, recipient, uint256(-amount1));

    // 2. 记录 token0 的余额（用户应该支付的代币）
    uint256 balance0Before = balance0();

    // 3. 调用回调函数，要求用户支付 token0
    IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);

    // 4. 验证用户是否真的支付了足够的 token0
    require(balance0Before.add(uint256(amount0)) <= balance0(), 'IIA');
}else {
    // 1. 先发送 token0 给用户
    if (amount0 < 0) TransferHelper.safeTransfer(token0, recipient, uint256(-amount0));

    // 2. 记录 token1 的余额
    uint256 balance1Before = balance1();

    // 3. 调用回调函数，要求用户支付 token1
    IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);

    // 4. 验证用户是否真的支付了足够的 token1
    require(balance1Before.add(uint256(amount1)) <= balance1(), 'IIA');
}

```

好，我们知道 exactInputSingle 调用 exactInputInternal，exactInputInternal 调用 pool.swap, pool.swap 又会通过回调 SwapCallback 要求用户支付代币。

这里的回调是在 msg.sender ， 在 quote 询价合约中也有一个 uniswapV3SwapCallback 函数。这是题外话
`IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);`

继续看在 swapRouter 中的 uniswapV3SwapCallback 函数

```solidity
// SwapCallbackData({
//                 path: abi.encodePacked(params.tokenIn, params.fee, params.tokenOut),
//                 payer: hasAlreadyPaid ? address(this) : msg.sender
//             })
// IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
function uniswapV3SwapCallback(
    int256 amount0Delta,  // token0 的变化量（正数=池收到，负数=池失去）
    int256 amount1Delta,  // token1 的变化量（正数=池收到，负数=池失去）
    bytes calldata _data  // 交换的附加数据
) external override {

    // 确保至少有一个代币需要支付（防止无意义的回调）
    require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported

    // 解码传入的数据，获取交换路径和付款方信息 解析出path 和 payer
    SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));

    // path: 从路径中解码第一个池的信息：输入代币、输出代币、手续费
    (address tokenIn, address tokenOut, uint24 fee) = data.path.decodeFirstPool();

    // 验证回调确实来自合法的 Uniswap V3 池合约（防止恶意调用）
    CallbackValidation.verifyCallback(factory, tokenIn, tokenOut, fee);

    // 判断交换类型和需要支付的数量
    (bool isExactInput, uint256 amountToPay) =
        amount0Delta > 0  // 如果 token0 变化量为正数（池收到 token0）
            ? (tokenIn < tokenOut, uint256(amount0Delta))  // 按地址排序判断方向，支付 token0
            : (tokenOut < tokenIn, uint256(amount1Delta)); // 否则按相反方向判断，支付 token1

    // 根据交换类型执行不同的逻辑
    if (isExactInput) {
        // exactInput 模式：直接支付代币
        pay(tokenIn, data.payer, msg.sender, amountToPay);
    } else {
        // exactOutput 模式：可能需要继续下一步交换或最终支付
        if (data.path.hasMultiplePools()) {
            // 如果路径中还有更多池，继续执行下一步交换
            data.path = data.path.skipToken();  // 跳过当前已处理的代币
            exactOutputInternal(amountToPay, msg.sender, 0, data);  // 递归执行下一步
        } else {
            // 如果是最后一个池，缓存最终的输入数量并支付
            amountInCached = amountToPay;  // 保存最终需要的输入数量
            // 注意：由于 exactOutput 是反向执行的，这里的 tokenOut 实际上是最初的 tokenIn
            pay(tokenOut, data.payer, msg.sender, amountToPay);
        }
    }
}
// 就是转移代币给 recipient 注意 这是pool的回调 所以：recipient = poolAddress 转移的量就是pool传过来的
function pay(
        address token,
        address payer,
        address recipient,
        uint256 value
    ) internal {
        if (token == WETH9 && address(this).balance >= value) {
            // pay with WETH9
            IWETH9(WETH9).deposit{value: value}(); // wrap only what is needed to pay
            IWETH9(WETH9).transfer(recipient, value);
        } else if (payer == address(this)) {
            // pay with tokens already in the contract (for the exact input multihop case)
            TransferHelper.safeTransfer(token, recipient, value);
        } else {
            // pull payment
            TransferHelper.safeTransferFrom(token, payer, recipient, value);
        }
    }
```

现在大概的合约流程就理顺了，我们知道 exactInputSingle 调用 exactInputInternal，exactInputInternal 调用 pool.swap, pool.swap 又会通过回调 SwapCallback 要求用户支付代币。

### 授权

我们要知道只要涉及到 token 交易都是需要授权的。uniswap 授权的方式有 3 种，

1. 直接调用 approve 授权 swapRouter
2. permit 的方式,这个在 V2 的流动性操作上有相关的处理
3. 也是比较重要的处理，就是 uniswapV3 的 permit2 的处理方式

这里就先补充 EIP712 的知识。

https://github.com/WTFAcademy/WTF-Ethers/blob/main/26_EIP712/readme.md

授权方式：approve/permit/uniswap permit2

approve 这里就不说了，自己看一下 ERC20 标准的实现。

#### permit

先来讲讲 permit

这是一篇文章 [登链社区 permit 文章](https://learnblockchain.cn/article/14070)

我们知道在合约的代币交易程序，第一步都是要先授权相应的代币。而且一般都是 uint256 的最大值。
这存在什么问题那？

- approve 也是需要 gas 的，如果不使用无限授权的话，每一次都是需要 approve 的，每一次都需要消耗 gas。
- 无限的代币授权如果被黑客钓鱼利用，那所有的代币资金都会被转走。

针对这两个问题就出现 permit 的解决办法，使用了 Eip712 和 EIP2612

- 什么是 Eip712 ？
  这个单开一个章节吧，11-EIP712 章节，或者直接查看

  https://github.com/WTFAcademy/WTF-Ethers/blob/main/26_EIP712/readme.md

  我们可以学到 Eip712 可以签署 结构化的数据，而且可以进行验证，判断签署者的地址

**我们可以继续看 permit 了**

EIP-2612—基于 ERC-712 的代币无 Gas 授权标准 --- permit

ERC-2612 是对 ERC-20 的扩展，需要在代币合约中实现 permit 方法。

[uni 代币 合约](https://etherscan.io/token/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984#code)

这里删除了点代码 只保留 uni EIP-712 相关的
重点在 permit 函数

```solidity
contract Uni {
     string public constant name = "Uniswap";
    // EIP-712 域分隔符的类型哈希，用于定义域的结构
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    // EIP-712 委托结构的类型哈希，用于投票权委托
    bytes32 public constant DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    // EIP-712 permit 结构的类型哈希，用于授权签名
    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    // 记录每个地址的签名随机数，用于防止重放攻击
    mapping (address => uint) public nonces;

    /**
     * 通过签名触发从 owner 到 spender 的授权
     * @param owner 授权方地址
     * @param spender 被授权方地址
     * @param rawAmount 授权的代币数量（2^256-1 表示无限授权）
     * @param deadline 签名过期时间
     * @param v 签名恢复字节
     * @param r ECDSA 签名对的一半
     * @param s ECDSA 签名对的另一半
     */
    function permit(address owner, address spender, uint rawAmount, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        uint96 amount; // 定义 96 位的金额变量

        // 如果 rawAmount 是最大值，则设置为 96 位最大值
        if (rawAmount == uint(-1)) {
            amount = uint96(-1);
        } else {
            // 否则检查金额是否超过 96 位限制
            amount = safe96(rawAmount, "Uni::permit: amount exceeds 96 bits");
        }

        // 构造域分隔符，包含合约名称、链ID和合约地址
        bytes32 domainSeparator = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainId(), address(this)));

        // 构造结构化数据哈希，包含所有 permit 参数和当前 nonce
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, rawAmount, nonces[owner]++, deadline));

        // 构造最终的签名消息摘要，遵循 EIP-712 标准
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // 从签名中恢复签名者地址
        address signatory = ecrecover(digest, v, r, s);

        // 确保签名有效（恢复的地址不为零地址）
        require(signatory != address(0), "Uni::permit: invalid signature");

        // 确保签名者就是授权方
        require(signatory == owner, "Uni::permit: unauthorized");

        // 确保签名未过期
        require(now <= deadline, "Uni::permit: signature expired");

        // 设置授权额度
        allowances[owner][spender] = amount;

        // 触发授权事件
        emit Approval(owner, spender, amount);
    }

    // 获取当前链 ID 的内部函数
    function getChainId() internal pure returns (uint) {
        uint256 chainId; // 定义链 ID 变量
        assembly { chainId := chainid() } // 使用内联汇编获取链 ID
        return chainId; // 返回链 ID
    }
}
```

我们之前了解到，eip712 的签名结构就是`x19x01/domainSeparator/hashStruct(message)`

- x19x01:是固定的

- domainSeparator：其实就是 ts 代码里对 domain 签名，在合约中就是
  `bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");`
  `eccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainId(),address(this))`
  那相应的 domain 不就是
  ```ts
  const domain = {
    name: "Uniswap",
    chainId: 1 //这个就是对应的链的chainID
    verifyingContract: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" // 合约地址
  }
  ```
  然后要找的就是签名的结构化数据类型了 types
  `bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");`
  ` bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, rawAmount, nonces[owner]++, deadline));`
  ```ts
  types: {
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      owner: "0x...",
      spender: "0x...",
      value: "1000000000000000000",
      nonce: 0,
      deadline: 1672531200,
    };
  }
  ```
  你可以尝试使用 11 讲的 eip712.ts 的代码，看看 signature 个 r s v。

然后再看一个 uniswapV2 的 router 合约里的，因为 v3 使用的是 permit2。所以这里只能拿 v2 举例

先简单了解下 v2 的流动性操作：

- 添加流动性流程：

1. 用户提供 tokenA 和 tokenB
2. 合约铸造 LP 代币给用户，
3. LP 代币代表用户在池子中的份额

- 移除流动性流程：

1. 用户需要"燃烧"LP 代币
2. 合约返还对应比例的 tokenA 和 tokenB
3. 关键：需要授权的是 LP 代币

pair 也可以说是 pool 合约 其实也是一个 ERO20 合约，当注入流动性的时候 这个 Pair 合约就会 mint 出 ero20 的代币作为 LP 代币。其实就是 pair 合约代币

[pair 合约](https://sepolia.etherscan.io/address/0x7cd32470e0a0f744b8809b2415204c08a563abe8#code)

从浏览器上就可以看出来，这是一个叫 uniswap V2 代币，可以在 readContract 调用下 name 函数。

合约中也有这样一段代码
`contract UniswapV2Pair is IUniswapV2Pair, UniswapV2ERC20 {}`

```solidity
  function removeLiquidityWithPermit(
      address tokenA,
      address tokenB,
      uint liquidity,
      uint amountAMin,
      uint amountBMin,
      address to,
      uint deadline,
      bool approveMax, uint8 v, bytes32 r, bytes32 s
  ) external virtual override returns (uint amountA, uint amountB) {
      address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);
      uint value = approveMax ? uint(-1) : liquidity;
      // 这里我们之前 在 uni token 合约中看过permit函数 就是验证 v, r, s 如果通过 就会执行 allowances[owner][spender] = amount;
      // 那这里就是如果签名验证成功 那lp token就会被授权给address(this) 数量是 value  但是我们只是在线下签名了一个 permit结构的数据 并没有调用 代币的 approve 函数。
      // 那就是原来的 两笔交易 approve 和 removeLiquidity 直接变成了一笔交易 removeLiquidityWithPermit
      IUniswapV2Pair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
      (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
  }
```

#### permit2

[uniswap universalRouter docs]（https://docs.uniswap.org/contracts/universal-router/technical-reference）
TODO：
