# 🛡️ Zoopfi

Private payments by username, built on **Stellar / Soroban**. Send and receive USDC with a normal Web2-style login, plus an optional **private (shielded) balance** powered by zero-knowledge proofs.

> See [`docs/stellar-migration/`](./docs/stellar-migration/) for the full research, architecture, and design docs.

## ✨ Features

### Payments
- **Username payments** - send USDC using `@usernames` instead of long addresses
- **QR payments** - generate and scan QR codes
- **Payment requests**, **contacts / friend requests**, **groups with bill-splitting**, **business invoices**
- **Transaction history** with Stellar explorer links

### Private payments (ZK)
- **Shield / Unshield** - move USDC in and out of a private balance
- **Send privately** - pay a `@username` with the sender↔recipient link hidden
- On-device proving (your keys never leave the browser)
- Lives at `/private`. Runs against a simulated shielded pool today (see Status).

### Wallet & auth
- **Privy social login** (email, Google, X, Discord, GitHub) auto-provisions a self-custodial **Stellar embedded wallet** (`chainType: 'stellar'`, Tier 2)
- External wallets (Freighter / xBull via Stellar Wallets Kit) planned as a secondary path

### UX
- Dark + light themes, mobile-first PWA, real-time notifications, gamified rewards/streaks

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Chain**: Stellar / Soroban via [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) (v15)
- **Asset**: native Circle **USDC** (7 decimals) over the Stellar Asset Contract (SEP-41)
- **Auth/wallet**: Privy embedded Stellar wallet
- **Backend**: Express + MongoDB (chain-agnostic; keyed by wallet address)
- **Privacy**: Privacy-Pools-style shielded pool (Circom Groth16 / BN254 / Poseidon2). Modeled on [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments).

## 📁 Project Structure

```
zoopfi/
├── app/
│   ├── lib/chain/            # chain-abstraction layer (the migration's core)
│   │   ├── config.ts         # network, USDC asset, decimals, explorer
│   │   ├── types.ts          # ChainOps / PrivacyOps interfaces
│   │   ├── stellar.ts        # real Stellar adapter (@stellar/stellar-sdk)
│   │   ├── mock.ts           # mock adapter + simulated shielded pool
│   │   └── useWallet.tsx     # the single wallet hook + provider
│   ├── dashboard/ send/ transact/ receive/ private/ ...  # pages
│   └── components/
├── backend/                  # Express API (MongoDB)
└── docs/stellar-migration/   # research + architecture + plan + privacy design
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (the Stellar SDK dropped Node 18)
- MongoDB (local or Atlas)
- A Privy app ID (https://dashboard.privy.io)

### 1. Frontend
```bash
npm install
cp .env.example .env   # .env or .env.local both work (both gitignored)
# NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_CHAIN_ADAPTER=mock        # "mock" (default) or "stellar"
# NEXT_PUBLIC_STELLAR_NETWORK=testnet
npm run dev
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # MONGODB_URI, PORT=4000
npm run dev
```

## 🔀 Chain adapter modes

Auth always runs through Privy. The `NEXT_PUBLIC_CHAIN_ADAPTER` flag only switches the on-chain data layer:

| Mode | Balances / payments / privacy | Use it for |
|------|-------------------------------|-----------|
| `mock` (default) | Canned balances, fake hashes, fully simulated shielded pool | Demoing the full UX with no funding, trustlines, or deployed contracts |
| `stellar` | Real Stellar **testnet**: USDC over Horizon, Soroban via RPC | Real on-chain payments (set a Privy app ID; onboarding friendbot-funds XLM + adds the USDC trustline) |

## 🔐 Status & safety

- The **public USDC payment** path uses the audited Stellar Asset Contract and is safe on testnet.
- The **private-payments** layer is a **demo**: in `mock` mode it is fully simulated; the real shielded-pool integration (Nethermind Privacy Pools fork) is **unaudited and testnet-only**. Do not use it with real-asset value. See [`docs/stellar-migration/03-migration-plan.md`](./docs/stellar-migration/03-migration-plan.md) for the risk register.
- Non-custodial: Privy holds the embedded key; the app builds/signs/submits transactions. Private spending keys are derived and stored on-device.

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register username |
| `/api/users/:username` | GET | Get user by username |
| `/api/users/address/:address` | GET | Get user by wallet |
| `/api/transactions` | GET/POST | Transaction history |
| `/api/contacts` | GET/POST/DELETE | Manage contacts |
| `/api/requests` | GET/POST/PUT | Payment requests |
| `/api/groups` | ... | Groups + bill-splitting |
| `/api/invoices` | ... | Business invoices |
| `/api/rewards/streak` | GET/POST | Streak tracking |

## 🎨 Design System

Dark-first theme with a purple accent:
- **Background**: `#191022`
- **Cards**: `#251a30`
- **Accent**: `#7f13ec`
- **Text secondary**: `#ad92c9`

## 📄 License

MIT.

---

Built on Stellar.
