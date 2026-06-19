# 🛡️ Zoopfi — the privacy point for Stellar

A consumer + business payments wallet where money moves **privately by default**.
Amounts and counterparties stay hidden, and every private transaction is proven
with a **zero-knowledge proof that is verified on-chain by a Stellar smart
contract**. Compliance is built in via an Association Set Provider (ASP) allow/deny
model, so legitimate users get privacy without the pool becoming a haven for bad
actors.

> **Submission: Stellar Hacks — Real-World ZK.** The ZK is load-bearing: a shielded
> payment cannot be constructed or settled without a valid Groth16 proof that the
> on-chain verifier accepts.

---

## What the ZK actually does

Zoopfi runs a **shielded pool** (a Privacy-Pools / Tornado-style UTXO design) on
Stellar testnet:

- **Notes & commitments.** Funds in the pool are represented as notes. A note
  commitment is `Poseidon2(amount, owner_pubkey, blinding)` — published on-chain,
  revealing nothing about amount or owner.
- **Spending in zero knowledge.** To spend, you prove in a Circom/Groth16 circuit
  (over **BN254**, using **Poseidon2** for hashing) that: you know the opening of
  input notes that exist in the pool's Merkle tree, their nullifiers are correct
  (so they can't be double-spent), inputs balance outputs, and the spend satisfies
  the **ASP membership / non-membership** policy. Amounts and the sender↔recipient
  link never appear in the clear.
- **On-chain verification.** The proof is checked by a **Groth16 verifier contract
  on Stellar** (using Protocol 25/26 BN254 host functions). The pool contract only
  mutates state if `verifier.verify(proof, public_inputs) == true`.

Public deposit/withdraw at the pool boundary is visible (like any token transfer);
**in-pool transfers are private**. That boundary is intentional and documented.

---

## 🔗 Deployed on Stellar testnet

Our own deployment (deployer `GCYETQHS…LWI5LR44`). The proof is verified by the
verifier contract below.

| Contract | Address | Explorer |
|----------|---------|----------|
| **Shielded pool** | `CAO6RPMITSCQTUOFUMFCNELXLNURXMQMRBDZLSIKZX36VH7MBA4LD3UA` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAO6RPMITSCQTUOFUMFCNELXLNURXMQMRBDZLSIKZX36VH7MBA4LD3UA) |
| **Groth16 verifier** | `CCIRAIRRTZN4QMUE7XVPLBO2II7UQPCPK7GGVSMFJW5HO44LL37SQDCN` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCIRAIRRTZN4QMUE7XVPLBO2II7UQPCPK7GGVSMFJW5HO44LL37SQDCN) |
| **ASP membership** | `CANLVYWPTVIBPG2L2PS4GT6BXRXDAWGGZ7PL62WNDXSLWRNGDJYUILHG` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CANLVYWPTVIBPG2L2PS4GT6BXRXDAWGGZ7PL62WNDXSLWRNGDJYUILHG) |
| **ASP non-membership** | `CB3ECD5HYWQDCB34ZYQWLN3PCVMYUBE3WLLH7IVHG5YJSSN7B3IU4IYE` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CB3ECD5HYWQDCB34ZYQWLN3PCVMYUBE3WLLH7IVHG5YJSSN7B3IU4IYE) |

The verifier's on-chain interface:

```rust
fn verify(proof: Groth16Proof, public_inputs: Vec<U256>) -> Result<bool, Groth16Error>
```

The deployment record is in [`deployments/testnet.json`](./deployments/testnet.json).

---

## 🟡 Level 2 (Yellow Belt) checklist

This project also satisfies the Stellar belt requirements (full status:
[Level 1](./docs/levels/level-1.md) · [Level 2](./docs/levels/level-2.md) · [Level 3](./docs/levels/level-3.md)):

| Requirement | Where |
|---|---|
| **Multi-wallet (StellarWalletsKit)** | Login modal + `/shielded` — Freighter / xBull / Albedo / Lobstr / Rabet. Screenshot below. |
| **3 error types handled** | `app/lib/privacy/wallet.ts` — `WALLET_NOT_FOUND`, `USER_REJECTED`, `INSUFFICIENT_BALANCE` (surfaced in the UI). |
| **Contract deployed on testnet** | Yield vault `CBD637UVMIYLTPCVWEOLTV26OCL77NVPZOLDYUEHXTBC7RDEJKN7JOBE` ([explorer](https://stellar.expert/explorer/testnet/contract/CBD637UVMIYLTPCVWEOLTV26OCL77NVPZOLDYUEHXTBC7RDEJKN7JOBE)) + the shielded pool/verifier/ASP above. |
| **Contract called from frontend** | `/vault` deposit/redeem + reads (`index`, `apy_bps`, `value_of`) via `app/lib/chain/stellar.ts`. |
| **Read + write to a contract** | Vault: write `deposit`/`redeem`, read `index`/`value_of`/`apy_bps`. |
| **Transaction status (pending/success/fail)** | `/shielded` proving→signing→submitting→confirming stepper; `/swap` + `/vault` busy/success/error states with explorer links. |
| **Event listening + state sync** | `/shielded` streams pool activity (`getRecentPoolActivity`); `/vault` polls the live index so balances update in real time. |
| **Verifiable contract-call tx** | Vault `deposit`: [`b3e9c6ac…b3b19`](https://stellar.expert/explorer/testnet/tx/b3e9c6ac969dfc333b839418b418111bdec6850bb8166fc7bb6c6eb6211b3b19) |
| **2+ meaningful commits** | See git history. |

---

## 🧱 Architecture

```
Browser (Next.js / React)
 ├─ Wallets:  Privy social-login embedded wallet  +  StellarWalletsKit
 │            (Freighter / xBull / Albedo / Lobstr / Rabet …)
 ├─ ZK engine (WASM, loaded from /public/js):
 │     prover-worker  → Groth16 proving (arkworks/BN254) + Poseidon2
 │     storage-worker → encrypted note store (OPFS-backed SQLite)
 │     web client     → Merkle proofs, witness assembly, tx prep
 └─ app/lib/privacy/  → engine loader, wallet shim, submit path, usePrivacyPool hook
        │
        ▼  signed Soroban tx
Stellar testnet:  Pool → Groth16 verifier → ASP membership / non-membership
```

- **Proving runs in the browser** (your spending keys never leave the device).
- The ZK engine (circuits, proving keys, Rust→WASM prover) is **forked from
  [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments)**
  (Apache-2.0; circuit artifacts LGPL-3.0). We deployed our own instance of the
  contracts, embedded the prover, and built Zoopfi's UI + wallet integration on top.
  See [`public/privacy-legal/`](./public/privacy-legal) for upstream notices.

**Tech:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · `@stellar/stellar-sdk` ·
`@creit.tech/stellar-wallets-kit` · Privy · Circom/Groth16 · BN254 · Poseidon2 · Soroban (Rust).

---

## 👤 Real username payments (MongoDB, no separate server)

Pay-by-`@username` works as a flow out of the box (mock resolution). To resolve
usernames to **real registered wallets** across users, the app uses **Next.js API
routes** (`app/api/backend/*`) backed by **MongoDB** — they run as Vercel
serverless functions, so there's no separate server to host. The `User` model
maps `username → walletAddress`.

To turn it on:
1. **MongoDB Atlas** (free): create a cluster, copy the connection string. In
   Atlas → Network Access, add `0.0.0.0/0` so Vercel's functions can connect.
2. **Set env vars** (Vercel project, or `.env.local` for local dev):
   - `MONGODB_URI=mongodb+srv://…`  (server-side secret — never in the repo)
   - `NEXT_PUBLIC_BACKEND=live`     (switches the app off the mock store)

Without these, the app uses an in-app mock store (usernames resolve to
synthesized addresses) — fine for the demo, not for paying real people by handle.

> The original Express server in `backend/` is the reference these routes were
> ported from; it's no longer needed (and excluded from the build).

---

## 🖼️ Screenshots

One unified app: a **top navbar** on web (logo, tabs, live balance, Pay action,
account menu), a **bottom tab bar** with a center Pay action on mobile, and a
dedicated **Business** workspace (payroll, invoicing, merchant payments) — all on
one premium dark canvas.

### Pay → connect → result
| Send money (home) | Wallet options | Transaction result |
|---|---|---|
| ![Home](./docs/screenshots/landing.png) | ![Wallet options](./docs/screenshots/wallet-options.png) | ![Sent — view on Stellar](./docs/screenshots/transaction-result.png) |

The login modal offers Privy social login **and** a full StellarWalletsKit picker
(Freighter, xBull, Albedo, LOBSTR, Rabet). On success the user sees a confirmation
with a one-tap **view on Stellar** explorer link.

### Wallet, activity, DeFi
| Dashboard (balance + activity) | Transaction history | Swap (Stellar DEX) |
|---|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![History](./docs/screenshots/transaction-history.png) | ![Swap](./docs/screenshots/swap.png) |

### Private payments + Business
| Shielded (ZK private) | Business workspace | Payroll (batch payouts) |
|---|---|---|
| ![Private](./docs/screenshots/shielded.png) | ![Business](./docs/screenshots/business.png) | ![Payroll](./docs/screenshots/payroll.png) |

### Mobile (responsive)
| Home | Dashboard | Payroll |
|---|---|---|
| ![Mobile home](./docs/screenshots/mobile.png) | ![Mobile dashboard](./docs/screenshots/mobile-dashboard.png) | ![Mobile payroll](./docs/screenshots/mobile-payroll.png) |

---

## 🚀 Run it locally

### Prerequisites
- Node.js 20+
- A Privy app ID (https://dashboard.privy.io) — only needed for social login
- A StellarWalletsKit-supported extension (e.g. Freighter) for the external-wallet path

```bash
npm install            # or: bun install
cp .env.example .env.local
#   NEXT_PUBLIC_PRIVY_APP_ID=...            (social login)
#   NEXT_PUBLIC_CHAIN_ADAPTER=stellar       (real testnet; "mock" for UI-only)
#   NEXT_PUBLIC_STELLAR_NETWORK=testnet
#   privacy contract IDs are pre-filled to our testnet deployment
npm run dev            # http://localhost:3000 — open /shielded
```

The shielded contract addresses ship in `.env.example`, so the ZK feature points
at our live deployment out of the box.

### Rebuilding the ZK engine (optional)
The WASM prover + circuit artifacts are large and gitignored. To regenerate:

```bash
# prereqs: brew install llvm  (wasm-capable clang for sqlite-wasm-rs)
#          rustup target add wasm32-unknown-unknown && cargo install trunk
PRIVACY_ENGINE_SRC=/path/to/stellar-private-payments ./scripts/build-privacy-engine.sh
```

### Redeploying the contracts (optional)
```bash
cd /path/to/stellar-private-payments
deployments/scripts/deploy.sh testnet --deployer <key> \
  --asp-levels 10 --pool-levels 10 --max-deposit 1000000000 \
  --vk-file deployments/testnet/circuit_keys/policy_tx_2_2_vk.json
```

---

## ▲ Deploy to Vercel

It's a standard Next.js app, so Vercel works out of the box. The one caveat: the
ZK proving engine (WASM + circuit artifacts) can't be compiled by Vercel, so the
prebuilt artifacts are **committed** under `public/js` and `public/circuits` and
served as static assets.

1. Import the repo in Vercel (framework auto-detected as Next.js).
2. Set environment variables (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_PRIVY_APP_ID` — your Privy app id (for social login)
   - `NEXT_PUBLIC_CHAIN_ADAPTER=stellar`
   - `NEXT_PUBLIC_STELLAR_NETWORK=testnet`
   - contract IDs are baked in as testnet defaults — no need to set them
   - **For real username payments** (optional): `MONGODB_URI` (secret) + `NEXT_PUBLIC_BACKEND=live`
3. Deploy. No COOP/COEP headers needed (the engine's workers use message passing,
   not SharedArrayBuffer).

The Express/MongoDB backend is optional — without `NEXT_PUBLIC_API_URL` the app
uses its in-app mock store, so the chain + ZK features work standalone.

## ✅ Status — what's real vs in progress

Honest breakdown (the hackathon explicitly welcomes WIP, so here it is):

| Piece | Status |
|-------|--------|
| Pool + Groth16 verifier + ASP deployed on testnet | ✅ Live (addresses above) |
| ZK proof verified by on-chain contract | ✅ Proven (verifier deployed; proof→verify exercised in the engine's e2e suite) |
| Browser proving engine (Groth16/Poseidon2) embedded in Zoopfi | ✅ Loads + runs in-app |
| Multi-wallet (Privy + StellarWalletsKit) | ✅ Both wired as real sessions |
| Shielded UI: shield / send privately / unshield, live notes + activity | ✅ Built (`/shielded`) |
| Full in-browser end-to-end shield with a funded wallet | 🔄 Final integration test in progress |
| ASP admin console + business selective-disclosure (view-key) view | 🔜 Planned (circuits + contracts already support it) |

**Safety:** unaudited, **testnet-only**, no real-asset value. The shielded stack is a
demo of compliant private payments, not production custody.

---

## 📂 Where to look

- `app/shielded/page.tsx` — the private-payments UI
- `app/lib/privacy/` — engine loader, wallet shim, Soroban submit, `usePrivacyPool` hook
- `app/lib/chain/` — chain abstraction, multi-wallet (`useWallet`), Stellar adapter
- `deployments/testnet.json` — deployed contract addresses
- `docs/stellar-migration/` — research, architecture, and privacy design docs

## 📄 License

Zoopfi app code: MIT. Bundled privacy engine: Apache-2.0 / LGPL-3.0 (see
`public/privacy-legal/`).

---

Built for **Stellar Hacks: Real-World ZK**. Privacy that real people and businesses can actually use.
