// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ISignatureTransfer} from "./interfaces/ISignatureTransfer.sol";
import {SignatureExpired, InvalidNonce} from "./PermitErrors.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {SignatureVerification} from "./libraries/SignatureVerification.sol";
import {PermitHash} from "./libraries/PermitHash.sol";
import {EIP712} from "./EIP712.sol";

contract SignatureTransfer is ISignatureTransfer, EIP712 {
    using SignatureVerification for bytes; // 为 bytes 类型添加签名验证功能
    using SafeTransferLib for ERC20; // 为 ERC20 添加安全转账功能
    using PermitHash for PermitTransferFrom; // 为 PermitTransferFrom 添加哈希功能
    using PermitHash for PermitBatchTransferFrom; // 为 PermitBatchTransferFrom 添加哈希功能

    // 存储每个地址的 nonce 位图，用于无序 nonce 管理
    mapping(address => mapping(uint256 => uint256)) public nonceBitmap;

    // 单个代币的签名转账函数
    function permitTransferFrom(
        PermitTransferFrom memory permit, // 许可数据结构
        SignatureTransferDetails calldata transferDetails, // 转账详情
        address owner, // 代币所有者
        bytes calldata signature // 签名数据
    ) external {
        // 调用内部函数，传入许可数据的哈希值
        _permitTransferFrom(permit, transferDetails, owner, permit.hash(), signature);
    }

    // 带见证数据的单个代币签名转账函数
    function permitWitnessTransferFrom(
        PermitTransferFrom memory permit, // 许可数据结构
        SignatureTransferDetails calldata transferDetails, // 转账详情
        address owner, // 代币所有者
        bytes32 witness, // 见证数据
        string calldata witnessTypeString, // 见证类型字符串
        bytes calldata signature // 签名数据
    ) external {
        // 调用内部函数，传入包含见证数据的哈希值
        _permitTransferFrom(
            permit, transferDetails, owner, permit.hashWithWitness(witness, witnessTypeString), signature
        );
    }

    // 内部函数：执行基于签名的代币转账
    function _permitTransferFrom(
        PermitTransferFrom memory permit, // 许可数据结构
        SignatureTransferDetails calldata transferDetails, // 转账详情
        address owner, // 代币所有者
        bytes32 dataHash, // 要签名的数据哈希
        bytes calldata signature // 签名数据
    ) private {
        uint256 requestedAmount = transferDetails.requestedAmount; // 获取请求的转账金额

        if (block.timestamp > permit.deadline) revert SignatureExpired(permit.deadline); // 检查签名是否过期
        if (requestedAmount > permit.permitted.amount) revert InvalidAmount(permit.permitted.amount); // 检查请求金额是否超过许可金额

        _useUnorderedNonce(owner, permit.nonce); // 使用并标记 nonce 为已使用

        signature.verify(_hashTypedData(dataHash), owner); // 验证签名的有效性

        ERC20(permit.permitted.token).safeTransferFrom(owner, transferDetails.to, requestedAmount); // 安全转账代币
    }

    // 批量代币的签名转账函数
    function permitTransferFrom(
        PermitBatchTransferFrom memory permit, // 批量许可数据结构
        SignatureTransferDetails[] calldata transferDetails, // 批量转账详情数组
        address owner, // 代币所有者
        bytes calldata signature // 签名数据
    ) external {
        // 调用内部函数，传入批量许可数据的哈希值
        _permitTransferFrom(permit, transferDetails, owner, permit.hash(), signature);
    }

    // 带见证数据的批量代币签名转账函数
    function permitWitnessTransferFrom(
        PermitBatchTransferFrom memory permit, // 批量许可数据结构
        SignatureTransferDetails[] calldata transferDetails, // 批量转账详情数组
        address owner, // 代币所有者
        bytes32 witness, // 见证数据
        string calldata witnessTypeString, // 见证类型字符串
        bytes calldata signature // 签名数据
    ) external {
        // 调用内部函数，传入包含见证数据的哈希值
        _permitTransferFrom(
            permit, transferDetails, owner, permit.hashWithWitness(witness, witnessTypeString), signature
        );
    }

    // 内部函数：执行基于签名的批量代币转账
    function _permitTransferFrom(
        PermitBatchTransferFrom memory permit, // 批量许可数据结构
        SignatureTransferDetails[] calldata transferDetails, // 批量转账详情数组
        address owner, // 代币所有者
        bytes32 dataHash, // 要签名的数据哈希
        bytes calldata signature // 签名数据
    ) private {
        uint256 numPermitted = permit.permitted.length; // 获取许可的代币数量

        if (block.timestamp > permit.deadline) revert SignatureExpired(permit.deadline); // 检查签名是否过期
        if (numPermitted != transferDetails.length) revert LengthMismatch(); // 检查数组长度是否匹配

        _useUnorderedNonce(owner, permit.nonce); // 使用并标记 nonce 为已使用
        signature.verify(_hashTypedData(dataHash), owner); // 验证签名的有效性

        unchecked { // 使用 unchecked 块优化 gas 消耗
            for (uint256 i = 0; i < numPermitted; ++i) { // 遍历所有许可的代币
                TokenPermissions memory permitted = permit.permitted[i]; // 获取当前代币的许可信息
                uint256 requestedAmount = transferDetails[i].requestedAmount; // 获取请求的转账金额

                if (requestedAmount > permitted.amount) revert InvalidAmount(permitted.amount); // 检查请求金额是否超过许可金额

                if (requestedAmount != 0) { // 如果请求金额不为零
                    // 允许调用者指定要转账的许可代币
                    ERC20(permitted.token).safeTransferFrom(owner, transferDetails[i].to, requestedAmount);
                }
            }
        }
    }

    // 使指定的无序 nonce 失效
    function invalidateUnorderedNonces(uint256 wordPos, uint256 mask) external {
        nonceBitmap[msg.sender][wordPos] |= mask; // 通过位或操作设置指定位为 1，使 nonce 失效

        emit UnorderedNonceInvalidation(msg.sender, wordPos, mask); // 发出 nonce 失效事件
    }

    // 返回位图索引和位在位图中的位置，用于无序 nonce 管理
    function bitmapPositions(uint256 nonce) private pure returns (uint256 wordPos, uint256 bitPos) {
        wordPos = uint248(nonce >> 8); // nonce 值的前 248 位是所需位图的索引
        bitPos = uint8(nonce); // nonce 值的后 8 位是位在位图中的位置
    }

    // 检查 nonce 是否已使用，并在位图中设置相应位
    function _useUnorderedNonce(address from, uint256 nonce) internal {
        (uint256 wordPos, uint256 bitPos) = bitmapPositions(nonce); // 获取位图位置
        uint256 bit = 1 << bitPos; // 创建要设置的位掩码
        uint256 flipped = nonceBitmap[from][wordPos] ^= bit; // 使用异或操作翻转位

        if (flipped & bit == 0) revert InvalidNonce(); // 如果位已经设置（nonce 已使用），则回滚
    }
}