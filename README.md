# Web3 Frontend Interview Assignment

This repository contains a frontend engineering assignment for a Web3 company. Your task is to build a modern DeFi interface with multi-chain functionality.

## 📋 Assignment Overview

Build a frontend application that interacts with the SimpleVault smart contract deployed across multiple EVM chains. The key feature is implementing **multi-chain batch operations**, allowing users to deposit funds across multiple chains in a single, guided flow.

## 🏗️ Repository Structure

```
assignment/
├── contracts/           # Smart contract code (Foundry)
│   ├── src/            # Contract source files
│   ├── test/           # Contract tests
│   └── script/         # Deployment scripts
├── docs/               # Assignment documentation
│   ├── ASSIGNMENT.md   # Detailed requirements
│   └── USER_STORIES.md # User stories and acceptance criteria
└── deployments/        # Deployment information and addresses
```

## 🔧 Smart Contract

The `SimpleVault` contract provides:

- Deposit functionality for USDC
- Withdrawal functionality for USDC
- Balance tracking per user
- Events for all operations

Deployed on:

- **Ethereum Sepolia**: `0xaaaac415c0719cff6BAe3816FE244589442db46C`
- **Sei Testnet**: `0xaaaac415c0719cff6BAe3816FE244589442db46C`

## 🎯 Key Features to Implement

1. **Multi-chain wallet connection and network switching**
2. **Dashboard showing balances across all chains**
3. **Multi-chain batch deposit operations** (primary feature)
4. **Single-chain withdrawal functionality**
5. **Transaction history and status tracking**

## 📚 Getting Started

1. Read [`docs/ASSIGNMENT.md`](./docs/ASSIGNMENT.md) for complete requirements
2. Review [`docs/USER_STORIES.md`](./docs/USER_STORIES.md) for detailed user stories
3. Check [`deployments/deployments.json`](./deployments/deployments.json) for contract addresses and network details
4. The contract ABI is available in `contracts/out/SimpleVault.sol/SimpleVault.json`

## 📝 Submission

- Submit your solution as a GitHub repository
- Deploy your application to Vercel, Netlify, or similar
- Include clear setup instructions in your README

Good luck! 🚀
