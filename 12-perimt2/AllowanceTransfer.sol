// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {PermitHash} from "./libraries/PermitHash.sol";
import {SignatureVerification} from "./libraries/SignatureVerification.sol";
import {EIP712} from "./EIP712.sol";
import {IAllowanceTransfer} from "./interfaces/IAllowanceTransfer.sol";
import {SignatureExpired, InvalidNonce} from "./PermitErrors.sol";
import {Allowance} from "./libraries/Allowance.sol";

contract AllowanceTransfer is IAllowanceTransfer, EIP712 {
    using SignatureVerification for bytes; // 为 bytes 类型添加签名验证功能
    using SafeTransferLib for ERC20; // 为 ERC20 添加安全转账功能
    using PermitHash for PermitSingle; // 为 PermitSingle 添加哈希功能
    using PermitHash for PermitBatch; // 为 PermitBatch 添加哈希功能
    using Allowance for PackedAllowance; // 为 PackedAllowance 添加授权管理功能

    // 映射用户到代币到支出者地址以及代币授权信息
    // 按代币所有者地址、代币地址、支出者地址的顺序索引
    // 存储的数据包含允许的金额、授权过期时间和 nonce
    mapping(address => mapping(address => mapping(address => PackedAllowance))) public allowance;

    // 直接授权函数
    function approve(address token, address spender, uint160 amount, uint48 expiration) external {
        PackedAllowance storage allowed = allowance[msg.sender][token][spender]; // 获取存储的授权信息
        allowed.updateAmountAndExpiration(amount, expiration); // 更新授权金额和过期时间
        emit Approval(msg.sender, token, spender, amount, expiration); // 发出授权事件
    }

    // 单个代币的 permit 授权函数
    function permit(address owner, PermitSingle memory permitSingle, bytes calldata signature) external {
        if (block.timestamp > permitSingle.sigDeadline) revert SignatureExpired(permitSingle.sigDeadline); // 检查签名是否过期

        // 从签名中验证签名者地址
        signature.verify(_hashTypedData(permitSingle.hash()), owner);

        _updateApproval(permitSingle.details, owner, permitSingle.spender); // 更新授权信息
    }

    // 批量代币的 permit 授权函数
    function permit(address owner, PermitBatch memory permitBatch, bytes calldata signature) external {
        if (block.timestamp > permitBatch.sigDeadline) revert SignatureExpired(permitBatch.sigDeadline); // 检查签名是否过期

        // 从签名中验证签名者地址
        signature.verify(_hashTypedData(permitBatch.hash()), owner);

        address spender = permitBatch.spender; // 获取支出者地址
        unchecked { // 使用 unchecked 块优化 gas 消耗
            uint256 length = permitBatch.details.length; // 获取批量授权的数量
            for (uint256 i = 0; i < length; ++i) { // 遍历所有授权详情
                _updateApproval(permitBatch.details[i], owner, spender); // 更新每个授权信息
            }
        }
    }

    // 单个代币转账函数
    function transferFrom(address from, address to, uint160 amount, address token) external {
        _transfer(from, to, amount, token); // 调用内部转账函数
    }

    // 批量代币转账函数
    function transferFrom(AllowanceTransferDetails[] calldata transferDetails) external {
        unchecked { // 使用 unchecked 块优化 gas 消耗
            uint256 length = transferDetails.length; // 获取转账详情数量
            for (uint256 i = 0; i < length; ++i) { // 遍历所有转账详情
                AllowanceTransferDetails memory transferDetail = transferDetails[i]; // 获取当前转账详情
                _transfer(transferDetail.from, transferDetail.to, transferDetail.amount, transferDetail.token); // 执行转账
            }
        }
    }

    // 内部函数：使用存储的授权进行代币转账
    // 如果授权时间已过期将失败
    function _transfer(address from, address to, uint160 amount, address token) private {
        PackedAllowance storage allowed = allowance[from][token][msg.sender]; // 获取授权信息

        if (block.timestamp > allowed.expiration) revert AllowanceExpired(allowed.expiration); // 检查授权是否过期

        uint256 maxAmount = allowed.amount; // 获取最大授权金额
        if (maxAmount != type(uint160).max) { // 如果不是无限授权
            if (amount > maxAmount) { // 检查请求金额是否超过授权金额
                revert InsufficientAllowance(maxAmount); // 授权金额不足
            } else {
                unchecked { // 使用 unchecked 块优化 gas 消耗
                    allowed.amount = uint160(maxAmount) - amount; // 减少授权金额
                }
            }
        }

        // 从发送者地址转移代币到接收者
        ERC20(token).safeTransferFrom(from, to, amount);
    }

    // 紧急锁定函数，立即撤销指定的授权
    function lockdown(TokenSpenderPair[] calldata approvals) external {
        address owner = msg.sender; // 获取调用者地址
        // 撤销每对支出者和代币的授权
        unchecked { // 使用 unchecked 块优化 gas 消耗
            uint256 length = approvals.length; // 获取要撤销的授权数量
            for (uint256 i = 0; i < length; ++i) { // 遍历所有要撤销的授权
                address token = approvals[i].token; // 获取代币地址
                address spender = approvals[i].spender; // 获取支出者地址

                allowance[owner][token][spender].amount = 0; // 将授权金额设置为 0
                emit Lockdown(owner, token, spender); // 发出锁定事件
            }
        }
    }

    // 使指定的 nonce 失效
    function invalidateNonces(address token, address spender, uint48 newNonce) external {
        uint48 oldNonce = allowance[msg.sender][token][spender].nonce; // 获取当前 nonce

        if (newNonce <= oldNonce) revert InvalidNonce(); // 新 nonce 必须大于当前 nonce

        // 限制一次交易中可以失效的 nonce 数量
        unchecked { // 使用 unchecked 块优化 gas 消耗
            uint48 delta = newNonce - oldNonce; // 计算 nonce 差值
            if (delta > type(uint16).max) revert ExcessiveInvalidation(); // 防止过度失效
        }

        allowance[msg.sender][token][spender].nonce = newNonce; // 设置新的 nonce
        emit NonceInvalidation(msg.sender, token, spender, newNonce, oldNonce); // 发出 nonce 失效事件
    }

    // 设置金额、过期时间和 nonce 的新值
    // 检查签名的 nonce 是否等于当前 nonce，然后将 nonce 值增加 1
    // 发出 Permit 事件
    function _updateApproval(PermitDetails memory details, address owner, address spender) private {
        uint48 nonce = details.nonce; // 获取 nonce
        address token = details.token; // 获取代币地址
        uint160 amount = details.amount; // 获取授权金额
        uint48 expiration = details.expiration; // 获取过期时间
        PackedAllowance storage allowed = allowance[owner][token][spender]; // 获取存储的授权信息

        if (allowed.nonce != nonce) revert InvalidNonce(); // 检查 nonce 是否匹配

        allowed.updateAll(amount, expiration, nonce); // 更新所有授权信息
        emit Permit(owner, token, spender, amount, expiration, nonce); // 发出 permit 事件
    }
}