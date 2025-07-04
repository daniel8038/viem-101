import { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";
import { polygonAmoyWalletClient } from "../getClients";
import { MY_ACCOUNT } from "../constants";

// 使用 viem 实现 EIP-712 签名
async function signWithViem(message: string) {
  // Domain 配置
  const domain = {
    name: "TestSignApp",
    version: "1",
    chainId: 1,
    verifyingContract: "0x0000000000000000000000000000000000000000" as Address, // 空地址
  } as const;

  // 数据类型定义
  const types = {
    Message: [
      { name: "lookThis", type: "string" },
      { name: "content", type: "string" },
      { name: "number", type: "uint256" },
    ],
  } as const;

  // 要签名的数据
  const value = {
    lookThis: "测试信息",
    content: message,
    number: BigInt(1),
  };

  try {
    // 使用 viem 的 signTypedData 方法
    //  https://viem.sh/docs/accounts/local/toAccount#signtypeddata
    const signature = await polygonAmoyWalletClient.signTypedData({
      domain,
      types,
      primaryType: "Message",
      message: value,
    });

    console.log("签名成功:", signature);
    return signature;
  } catch (error) {
    console.error("签名失败:", error);
    throw error;
  }
}

async function verifySignature(
  signature: `0x${string}`,
  message: string,
  signerAddress: Address
) {
  const domain = {
    name: "TestSignApp",
    version: "1",
    chainId: 1,
    verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
  } as const;

  const types = {
    Message: [
      { name: "lookThis", type: "string" },
      { name: "content", type: "string" },
      { name: "number", type: "uint256" },
    ],
  } as const;

  const value = {
    lookThis: "测试信息",
    content: message,
    // timestamp: BigInt(Math.floor(Date.now() / 1000)),
    number: BigInt(10),
  };

  try {
    const isValid = await verifyTypedData({
      address: signerAddress,
      domain,
      types,
      primaryType: "Message",
      message: value,
      signature,
    });

    console.log("签名验证结果:", isValid);
    return isValid;
  } catch (error) {
    console.error("验证失败:", error);
    return false;
  }
}

// 使用示例
async function main() {
  try {
    // 1. 签名消息
    const testMessage = "Hello, this is a test message!";
    const signature = await signWithViem(testMessage);

    // 2. 验证签名
    const account = MY_ACCOUNT;
    const isValid = await verifySignature(signature, testMessage, MY_ACCOUNT);

    console.log("签名:", signature);
    console.log("验证结果:", isValid);
  } catch (error) {
    console.error("操作失败:", error);
  }
}

main().catch((err) => console.log(err));
