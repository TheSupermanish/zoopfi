# 🥋 Level 1 — White Belt ✅ COMPLETE

Foundational Stellar wallet + payments app. Everything Level 2 builds on.

## Requirements & status

| Item | Status | Where |
|---|---|---|
| Connect a Stellar wallet | ✅ | Privy social-login embedded Stellar wallet (`chainType: 'stellar'`), auto-provisioned on login (`app/lib/chain/useWallet.tsx`) |
| Display balance | ✅ | Dashboard + `useBalance` hook reading testnet balances (`app/lib/chain/stellar.ts → getBalance`) |
| Send / receive payments | ✅ | `/send`, `/receive`, `/transact` — USDC/XLM payments built, signed, submitted via Horizon |
| Testnet integration | ✅ | `NEXT_PUBLIC_STELLAR_NETWORK=testnet`, Horizon + Soroban RPC (`config.ts`) |
| App foundation / onboarding | ✅ | Next.js 16 PWA, onboarding flow, username profiles, dark/light themes |

## Notes
- Auth: Privy social login (email/Google/X/Discord/GitHub) → self-custodial Stellar embedded wallet.
- Asset: USDC (7 decimals) over the Stellar Asset Contract; XLM for fees.
- Chain layer is adapter-based (`mock` | `stellar`) so the whole UX runs with or without funding.

**Status: COMPLETE** — this is the base the wallet ships on.
