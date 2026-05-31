# SOL Management System

<p align="right">
  <strong>🇺🇸 English</strong> | <a href="./README-zh-HK.md">HK 繁體中文</a> | <a href="./README.md">🇨🇳 中文</a>
</p>

A full-stack **Solana blockchain automated trading and comprehensive management platform** built on RuoYi-Vue.

<p align="center">
  <strong>✨ Multi-Strategy Trading · Multi-DEX Aggregation · Meteora Sniper Bot · MEV Protection ✨</strong>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=y-EKXYV66qY" target="_blank">
    <img src="https://img.shields.io/badge/YouTube-Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="Demo Video" />
  </a>
</p>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Disclaimer](#disclaimer)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Core Features](#core-features)
  - [1. Automated Trading Engine](#1-automated-trading-engine)
  - [2. Wallet Management](#2-wallet-management)
  - [3. Multi-DEX Integration](#3-multi-dex-integration)
  - [4. Token Management](#4-token-management)
  - [5. NFT Module](#5-nft-module)
  - [6. Meteora Sniper Bot](#6-meteora-sniper-bot)
  - [7. Market Data](#7-market-data)
- [Trading Flow](#trading-flow)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Build & Deployment](#build--deployment)
- [Donate](#donate)
- [Contact](#contact)
- [Important Notes](#important-notes)

---

## Project Overview

The SOL Management System is a full-featured management and automated trading platform for the Solana blockchain. It integrates **on-chain wallet management, multi-strategy automated trading, multi-DEX aggregation, NFT minting, MEV protection, and real-time market monitoring**.

**Key Highlights:**

- 🚀 **7 Trading Strategies**: Covering all market conditions — rising, falling, ranging, and capital preservation
- 🔫 **Meteora Sniper Bot**: gRPC Stream real-time pool monitoring with Jito Bundle for lightning-fast execution
- 🏦 **Multi-Tier Wallet System**: Master → Sub → Holding wallets, with batch fund distribution and collection
- 🛡️ **Jito MEV Protection**: All transactions routed through Jito Block Engine to prevent front-running
- 🔗 **Multi-DEX Aggregation**: Meteora · Jupiter · Pump.fun · Raydium — all in one place
- 🎨 **Full NFT Pipeline**: Metaplex-standard minting and metadata management

---

## Disclaimer

> ⚠️ **Risk Warning**: This software is an open-source tool provided for educational and research purposes only.

- **Use at Your Own Risk**: Any profits, losses, or asset losses resulting from the use of this software are solely the responsibility of the user. The developers assume no liability whatsoever.
- **Not Financial Advice**: This software does not constitute any form of investment, financial, or trading advice. All strategy parameters should be evaluated and configured by users based on their own circumstances.
- **Cryptocurrency Risks**: The cryptocurrency market is highly volatile, and there is a possibility of total principal loss. Please ensure you fully understand the associated risks before using this software.
- **Comply with Local Laws**: Before using this software, please verify that relevant operations are permitted under the laws and regulations of your jurisdiction.
- **Security is Your Responsibility**: Safeguard your private keys and passwords. The developers are not responsible for asset losses caused by private key leaks, operational errors, etc.
- **No Warranty**: This software is provided "as is", without any express or implied warranty, including but not limited to merchantability or fitness for a particular purpose.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vue 2 + Vue Router + Vuex |
| **UI Library** | Element UI |
| **Charts** | ECharts |
| **Backend** | Node.js + Express |
| **Database** | MySQL |
| **Cache / Queue** | Redis + Bull |
| **Auth** | JWT + Spring Security |
| **Real-time** | WebSocket + gRPC Stream |
| **Process Mgmt** | PM2 |
| **Blockchain SDK** | @solana/web3.js, @solana/spl-token |
| **DEX SDK** | @meteora-ag/cp-amm-sdk, @meteora-ag/dynamic-bonding-curve-sdk, @jup-ag/api, @pump-fun/pump-swap-sdk, @raydium-io/raydium-sdk |
| **MEV Protection** | Jito Block Engine |
| **NFT Framework** | Metaplex UMI |
| **Encryption** | AES-256-CBC, RSA, BIP39 |
| **Logging** | Winston |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Nginx (Reverse Proxy)                      │
├──────────────┬──────────────────────┬─────────────────────────┤
│  Frontend SPA │  Spring Boot Backend │   Node.js Backend       │
│  Vue 2        │  REST API            │   Express + WebSocket   │
├──────────────┴──────────────────────┴─────────────────────────┤
│                       MySQL Database                           │
│        (wallets, tokens, trade tasks, users, logs)             │
├──────────────────────────────────────────────────────────────┤
│                       Redis Cache                             │
│        (task queues, session management, rate limiting)        │
├──────────────────────────────────────────────────────────────┤
│                  External API / RPC Services                   │
│   Solana RPC │ Jito Block Engine │ Birdeye │ Helius │ gRPC   │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Automated Trading Engine

The core module of the system, implementing strategy-based fully automated token trading.

#### Seven Trading Strategies

| Strategy | Best For | Logic |
|----------|----------|-------|
| **Flat Mode** | Sideways / ranging markets | Neutral strategy, small position scalping |
| **Slow Rise Mode** | Gradual uptrends | Progressive buying, dynamic position sizing |
| **Fast Rise Mode** | Rapid price surges | Momentum chasing, quick position building |
| **Slow Fall Mode** | Gradual downtrends | Tiered stop-loss, phased exposure reduction |
| **Fast Fall Mode** | Sharp price crashes | Emergency sell, capital protection |
| **Guarantee Mode** | High uncertainty | Conservative, capital preservation priority |
| **Holding Mode** | Long-term holds | Monitor only, maintain existing positions |

#### Trading Engine Features

- **Multi-Strategy Parallel Scheduling**: Run multiple strategies simultaneously with independent configs
- **Batch Transaction Execution**: High-concurrency batch tx building and sending with queue management
- **Smart Rate Limiting**: Auto-control RPC call frequency to prevent node overload
- **Wallet Cooldown Mechanism**: Per-wallet trade interval control to avoid on-chain conflicts
- **Pre-Flight Simulation**: Simulate transactions before sending to reduce failure rate
- **Jito Bundle Support**: Route through Jito Block Engine for MEV protection
- **Configurable Slippage**: Flexible slippage tolerance settings
- **Priority Fees**: Compute Unit price support for faster confirmation

#### Supported Trade Routes

| Route | Description |
|-------|-------------|
| Jupiter Aggregator | Best-path aggregation across the entire chain |
| Meteora | Auto-detect DammV2 / DBC pool types |
| Pump.fun / PumpSwap | Full Pump ecosystem support (including shorting) |
| Raydium | v1 / v2 dual compatibility |
| GMGN | Efficient trading route |

---

### 2. Wallet Management

#### Three-Tier Wallet Architecture

```
Master Wallet
  ├── Sub Wallets        ← Decentralized trading, reduced correlation risk
  ├── Holding Wallets    ← Long-term position management
  └── Config Wallets     ← Special-purpose scenarios
```

#### Core Wallet Features

| Feature | Description |
|---------|-------------|
| Create / Replace Master | Secure keypair generation, encrypted private key storage |
| Batch Create Sub Wallets | One-click generation of trading wallets |
| SOL Distribution / Collection | Master ↔ Sub bulk transfers (randomized amounts for privacy) |
| Token Distribution / Collection | Bulk token transfers between master and sub wallets |
| Batch Transfers | High-efficiency concurrent SOL transfers |
| Real-Time Balance Query | On-chain SOL and SPL Token balance retrieval |
| Sub Wallet Reclaim | Close accounts and recover SOL rent |

---

### 3. Multi-DEX Integration

#### Meteora (Deep Integration)

| Pool Type | Features |
|-----------|----------|
| **DammV2** (Dynamic AMM v2) | Pool queries, buy/sell, liquidity management |
| **DBC** (Dynamic Bonding Curve) | Bonding curve trading and liquidity operations |
| **Unified Entry Point** | Auto-detect pool type, intelligent routing |
| **Price Queries** | Real-time token price from Meteora pools |

#### Jupiter

- Aggregator quote queries for optimal chain-wide trading paths
- Low-slippage large-amount trade support

#### Pump.fun / PumpSwap

- Pump.fun token quotes and fast trading
- PumpSwap liquidity management (add/remove/check)
- PumpSwap shorting support

---

### 4. Token Management

| Feature | Description |
|---------|-------------|
| Create Token | SPL Token with custom decimals and initial supply |
| Mint / Burn | Increase or decrease token supply |
| Token Listing | Configure tokens in the trading system, bind to pools |
| Close Token Account | Reclaim ATA rent |
| Token Recovery | Auto-collect distributed tokens |

---

### 5. NFT Module

| Feature | Description |
|---------|-------------|
| NFT Minting | Metaplex standard |
| Metadata Management | Name, description, image, attributes |
| IPFS Upload | Pinata / QuickNode dual channel support |
| UMI Integration | Advanced Metaplex UMI framework operations |

---

### 6. Meteora Sniper Bot

Automated sniper bot for new Meteora pool creation:

| Stage | Technology |
|-------|------------|
| **On-Chain Monitoring** | Yellowstone gRPC Stream for real-time pool creation detection |
| **Transaction Parsing** | Auto-extract pool address, token info, and key parameters |
| **Transaction Building** | Lightning-fast buy transaction construction |
| **Bundle Sending** | Jito Bundle for ultra-fast on-chain execution |
| **Pre-Simulation** | Validate before sending to filter invalid trades |
| **Multi-Wallet** | Rotating sniper wallets for risk distribution |

---

### 7. Market Data

| Data Source | Capability |
|-------------|------------|
| Birdeye | Real-time token prices, WebSocket trade data push |
| Jupiter Price API | Token USD real-time pricing |
| Helius | On-chain transaction history and account data |
| GMGN | Trading routes and market data |

---

## Trading Flow

### Overall Transaction Pipeline

```
User Initiates Trade
    │
    ▼
Strategy Scheduler       ← Match strategy mode, get sub-wallet list
    │
    ├─ Standard Rounds    ← Strategy modes 1-6
    └─ Holding Rounds     ← Strategy mode 7
         │
         ▼
Batch Executor           ← Concurrent trade construction
    │
    ├─ Jupiter Route      ← Best-path aggregation
    ├─ Meteora Route      ← Auto-detect DammV2 / DBC
    ├─ Pump.fun Route     ← Pump ecosystem trades
    ├─ Raydium Route      ← v1 / v2 compatible
    └─ GMGN Route         ← Efficient trading
    │
    ▼
Jito Block Engine        ← Bundle send, MEV protection
    │
    ▼
Record & Auto-Sell       ← PnL monitoring, take-profit / stop-loss
```

### Transaction Construction Steps

1. **Decrypt Keypair** — Decrypt wallet from secure storage
2. **Get Blockhash** — Fetch latest blockhash from RPC
3. **Select Route** — Choose optimal trade route based on config
4. **Get Quote** — Query optimal path and real-time quote
5. **Build Transaction** — Generate unsigned transaction
6. **Set Priority Fee** — Optional Compute Unit price
7. **Sign** — Sign with decrypted private key
8. **Simulate** — Pre-flight validation before sending
9. **Send On-Chain** — Via Jito Bundle or direct RPC

---

## Quick Start

### Requirements

- **Node.js** >= 16
- **MySQL** >= 5.7
- **Redis** >= 5.0
- **Solana Mainnet RPC** endpoint

### Frontend Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Solana Backend Setup

```bash
# Navigate to Solana module
cd src/api/sol

# Install dependencies
npm install

# Configure .env file (database, RPC, and other required params)

# Start the service
node solana.js

# Production (recommended: PM2)
pm2 start solana.js --name sol-backend
```

---

## Project Structure

```
ruoyi-ui/
├── src/
│   ├── api/sol/           # ★ Solana Core Backend
│   │   ├── core/          # Encryption, auth, state management
│   │   ├── handlers/      # WebSocket message handlers
│   │   ├── infra/         # Infrastructure (DB/Redis/Jito)
│   │   ├── job/           # Task scheduling engine (strategies+scheduler+rate limit)
│   │   ├── meteora/       # Meteora DEX integration + sniper bot
│   │   ├── nft/           # NFT minting & metadata
│   │   ├── price/         # Market data aggregation
│   │   ├── swap/          # Multi-DEX trade routes
│   │   ├── wallet/        # Wallet utilities
│   │   └── solana.js      # Service entry point
│   ├── views/             # Page views
│   ├── components/        # Shared components
│   └── router/            # Route config
├── package.json
└── vue.config.js
```

---

## Build & Deployment

```bash
# Production build
npm run build:prod

# Staging build
npm run build:stage
```

Deploy the `dist/` output to any static web server (e.g. Nginx). The frontend connects to the Spring Boot backend via reverse proxy, and WebSocket connects directly to the Node.js backend.

---

## Donate

If this project helps you, please consider supporting our development 🙏

| Currency | Address |
|----------|---------|
| **Ethereum (ETH)** | `0x2CfBca7DBb0eef8ced407b69C54981fa3348a9Ff` |
| **Solana (SOL)** | `9tMTcoFRTSCGmhVnsuHCmrguKcCjHyfacm4NbBTcuJ1C` |
| **BNB Chain (BNB)** | `0x2CfBca7DBb0eef8ced407b69C54981fa3348a9Ff` |
| **Bitcoin (BTC)** | `bc1qk4t2qgdwuwsqh77yywtlc0jween3ntdacv6ren` |

---

## Contact

For questions or collaboration, feel free to reach out:

- **Telegram**: [@SkillsYO](https://t.me/SkillsYO)

---

## Important Notes

1. **Private Key Security**: All private keys are encrypted with AES-256-CBC before storage. Rotate keys periodically.
2. **RPC Rate Limiting**: Built-in rate limiter auto-controls call frequency to avoid node throttling.
3. **Jito Service**: A Jito Bundle subscription is required for MEV protection.
4. **Production**: Use PM2 for process management with auto-restart and log rotation.
5. **Secure Communication**: Always enable HTTPS and WSS in production environments.
