# 🥋 Level 1 — White Belt ✅ COMPLETE

Foundational Stellar wallet + payments app. Everything Level 2 builds on.

## Requirements & status

| Item | Status | Where |
|---|---|---|
| Connect a Stellar wallet | ✅ | Privy social-login embedded Stellar wallet (`chainType: 'stellar'`), auto-provisioned on login (`app/lib/chain/useWallet.tsx`) |
| Display balance | ✅ | Dashboard + `useBalance` hook reading testnet balances (`app/lib/chain/stellar.ts → getBalance`) |
| Send / receive payments | ✅ | `/send`, `/receive`, `/transact` — USDC/XLM payments built, signed, submitted via Horizon |
| Testnet integration | ✅ | `NEXT_PUBLIC_STELLAR_NETWORK=testnet`, Horizon + Soroban RPC (`config.ts`) |
| App foundation / onboarding | ✅ | Next.js 16 PWA, onboarding flow, username profiles, unified premium dark UI (top navbar on web, bottom tab bar on mobile) |

## Notes
- Auth: Privy social login (email/Google/X/Discord/GitHub) → self-custodial Stellar embedded wallet.
- Asset: USDC (7 decimals) over the Stellar Asset Contract; XLM for fees.
- Chain layer is adapter-based (`mock` | `stellar`) so the whole UX runs with or without funding.

## Screenshots

| Wallet connected + balance displayed | Successful transaction + result shown |
|---|---|
| ![Dashboard](../screenshots/dashboard.png) | ![Sent](../screenshots/transaction-result.png) |

- **Wallet connected state** and **balance displayed** — the dashboard after login: live USDC balance, quick actions, recent activity.
- **Successful testnet transaction** and **result shown to the user** — the Pay flow confirms with a green "Sent — view on Stellar" banner linking to the explorer. A verifiable on-chain example (vault `deposit`): [`b3e9c6ac…b3b19`](https://stellar.expert/explorer/testnet/tx/b3e9c6ac969dfc333b839418b418111bdec6850bb8166fc7bb6c6eb6211b3b19).

**Status: COMPLETE** — this is the base the wallet ships on.
