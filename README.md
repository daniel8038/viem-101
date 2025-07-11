# Viem 学习手册

**个人学习时，一定要使用完全不涉及真实资金操作的钱包**
要注意文章里的私钥，是完全不会有真实资金操作的，写完之后就会删除这个钱包，所以上传进了仓库。
**个人一定一定不要上传进 github，资金会全部被转走，一定一定设置一个 dotenv，把私钥放进 env 文件，.gitignore 添加.env 文件**

也可以直接看 uniswapV3 的讲解，UniswapV3 的讲解主做外围合约交互，当然也会讲解合约内的一些知识。如果后续有时间的话，我打算扒一下 uniswap 的开源的智能路由的代码，逐行讲解一下。

[uniswapV3 代码在这](https://github.com/daniel8038/viem-101/blob/main/uniswapV3/Router/main.ts)

## 📖 项目简介

这是一个基于 **WTF Academy** 的《重学 ethers.js》课程改编的 **Viem** 学习手册。将经典的 ethers.js 教程用现代化的 viem 库重新实现，帮助开发者快速掌握 viem 的使用方法。

## 🎯 学习目标

- **从 ethers.js 到 viem**：平滑过渡，理解两者差异
- **现代化 Web3 开发**：掌握 viem 的类型安全和模块化设计
- **实战导向**：通过具体代码示例学习区块链交互

## 🏗️ 内容结构

### 基础篇

- **01 HelloVitalik** - 第一个 viem 程序，查询 Vitalik 的 ETH 余额
- **02 Client 概念** - 理解 PublicClient 和 WalletClient 的区别
- **03 合约交互** - 使用 ABI 读取合约状态
- **04 EVM 交易** - 深入理解以太坊交易结构
  ing....

## 🚀 快速开始

```bash
# 安装依赖
npm install viem

# 运行示例
npx tsx 01-HelloVitalik/hello.ts
```

## 💡 设计理念

**viem = 更现代化的 ethers.js**

- ✅ **类型安全优先** - TypeScript 原生支持
- ✅ **模块化设计** - 按需引入，减少包体积
- ✅ **开发体验** - 更好的 API 设计和错误提示
- ✅ **性能优化** - 内置批量请求和缓存机制

## 🎓 适合人群

- **ethers.js 开发者** - 希望迁移到更现代的库
- **Web3 新手** - 想要学习区块链交互的最佳实践
- **TypeScript 爱好者** - 追求类型安全的开发体验

## 📚 学习路径

1. **理解基础概念** - Client、Transport、ABI
2. **动手实践** - 运行每个示例代码
3. **对比学习** - 了解与 ethers.js 的差异
4. **项目实战** - 将学到的知识应用到实际项目

---

> 💡 **提示**：每个章节都包含完整的可运行代码和详细解释，建议边学边练，加深理解。

**让我们开始 viem 的学习之旅吧！** 🚀
