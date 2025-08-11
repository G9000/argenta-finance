# Argenta Multi-Chain Vault (Sepolia + Sei Testnet)

Focus: multi-chain UX, a resilient batch **Approve → Deposit** flow, and clear transaction feedback.

> ✨ Key design choice: a **framework-agnostic task runner** (pure TypeScript service) orchestrates multi-chain deposits. React is just a thin UI wrapper around it.

---

## Approach & Architecture

This project was built with a focus on **modularity**, **multi-chain support**, and **clear UX for batch transactions**.

- **Framework**: Next.js (App Router) for routing, performance, and deployment simplicity
- **Web3 Layer**: wagmi + viem for typed, reactive blockchain interactions
- **Wallet Connection**: RainbowKit for multi-wallet support
- **State Management**: Zustand for lightweight, predictable global state
- **UI**: Tailwind CSS with responsive, mobile-first layout
- **Multi-Chain Support**: Chain configs stored centrally with addresses & RPC URLs
- **Batch Operations**: Step-based flow to approve and deposit USDC across multiple chains in one sequence

**Trade-offs:**

- Transaction state (in-progress or completed) is not persisted; it is lost on a hard refresh. If given more time, I would implement state persistence in Zustand so that users can resume transactions after a page reload.

---

## Requirements

- Node.js 20+
- pnpm (recommended) or npm
- Wallet with testnet USDC (Sepolia and Sei). Currently I only tested on MetaMask

---

## Quick Start

```bash
cd web
cp .env.example .env.local   # fill in RPC URLs if you have your own
pnpm i                       # or npm i / yarn
pnpm generate                # ⬅️ required: generates wagmi/viem clients & ABIs
pnpm dev                     # open http://localhost:3000
```

## To get USDC token to SEI Testnet

You can use the `bluewater-usdc-cctp` utility provided in this repository.

```bash
cd bluewater-usdc-cctp
cp .env.example .env       # Fill in required private key and RPC URLs
pnpm install               # or npm install / yarn
pnpm start                 # Runs transfer.js to bridge USDC to Sei Testnet
```
