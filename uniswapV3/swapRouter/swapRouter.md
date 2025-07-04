这是 相关的方法

https://sepolia.etherscan.io/address/0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E#writeProxyContract

这是 github

https://github.com/Uniswap/swap-router-contracts/blob/main/contracts/SwapRouter02.sol

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

### 交互

我们要知道只要涉及到 token 交易都是需要授权的。uniswap 授权的方式有两种，一种是直接授权 swapRouter 一种就是 permit2 的方式

这里就先补充 EIP712 的知识。

https://github.com/WTFAcademy/WTF-Ethers/blob/main/26_EIP712/readme.md

授权方式：approve/permit/uniswap permit2

approve 这里就不说了，自己看一下 ERC20 标准的实现。

#### permit

先来讲讲 permit

这是一篇文章 https://learnblockchain.cn/article/14070

我们知道在合约的代币交易程序，第一步都是要先授权相应的代币。而且一般都是 uint256 的最大值。
这存在什么问题那？

- approve 也是需要 gas 的，如果不使用无限授权的话，每一次都是需要 approve 的，每一次都需要消耗 gas。
- 无限的代币授权如果被黑客钓鱼利用，那所有的代币资金都会被转走。

针对这两个问题就出现 permit 的解决办法，使用了 Eip712 和 EIP2612

- 什么是 Eip712 ？
  这个单开一个章节吧，11-EIP712 章节，或者直接查看

  https://github.com/WTFAcademy/WTF-Ethers/blob/main/26_EIP712/readme.md
