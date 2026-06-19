# 🟡 Level 2 — Yellow Belt ✅ COMPLETE (submission-ready)

Multi-wallet integration, smart-contract deployment, contract calls from the
frontend, and real-time event handling. We built a **DeFi suite** (yield vault +
DEX swap) on top of the privacy wallet, which over-delivers on every requirement.

## Requirements & status

| Requirement | Status | Where |
|---|---|---|
| StellarWalletsKit (multi-wallet) | ✅ | Login modal + `/shielded` — Freighter / xBull / Albedo / Lobstr / Rabet (`app/lib/privacy/wallet.ts`, `app/components/wallet-selection-modal.tsx`) |
| 3 error types handled | ✅ | `WALLET_NOT_FOUND`, `USER_REJECTED`, `INSUFFICIENT_BALANCE` (`app/lib/privacy/wallet.ts`, surfaced in UI) |
| Contract deployed on testnet | ✅ | Yield vault + shielded pool/verifier/ASP (addresses below) |
| Contract called from frontend | ✅ | `/vault` deposit/redeem + reads (`app/lib/chain/stellar.ts → invokeContract`/`viewContract`) |
| Read + write to a contract | ✅ | Vault: write `deposit`/`redeem`; read `index`/`value_of`/`apy_bps`/`total_shares` |
| Transaction status (pending/success/fail) | ✅ | `/shielded` proving→signing→submitting→confirming stepper; `/swap` + `/vault` busy/success/error with explorer links |
| Event listening + state sync | ✅ | `/shielded` streams pool activity (`getRecentPoolActivity`); `/vault` polls the live index so positions grow in real time |
| 2+ meaningful commits | ✅ | See git history (PRs #2–#4) |

## Deliverable
A multi-wallet DeFi app with deployed contracts and real-time, on-chain state:
- **Yield Vault** (`/vault`) — ERC-4626-style shares + time-accruing index (8% APY). Deposit/withdraw, live position value.
- **DEX Swap** (`/swap`) — real Stellar orderbook quotes (path-aware execution).
- **Shielded payments** (`/shielded`) — the ZK privacy layer (see the Real-World ZK submission).

## Deployed contracts (testnet)

| Contract | Address |
|---|---|
| Yield vault | `CBD637UVMIYLTPCVWEOLTV26OCL77NVPZOLDYUEHXTBC7RDEJKN7JOBE` |
| Shielded pool | `CAO6RPMITSCQTUOFUMFCNELXLNURXMQMRBDZLSIKZX36VH7MBA4LD3UA` |
| Groth16 verifier | `CCIRAIRRTZN4QMUE7XVPLBO2II7UQPCPK7GGVSMFJW5HO44LL37SQDCN` |
| ASP membership | `CANLVYWPTVIBPG2L2PS4GT6BXRXDAWGGZ7PL62WNDXSLWRNGDJYUILHG` |
| ASP non-membership | `CB3ECD5HYWQDCB34ZYQWLN3PCVMYUBE3WLLH7IVHG5YJSSN7B3IU4IYE` |

## Submission checklist

- ✅ Public GitHub repository — `github.com/TheSupermanish/zoopfi`
- ✅ README with setup instructions
- ✅ 2+ meaningful commits
- ✅ Screenshot: wallet options — [`docs/screenshots/wallet-options.png`](../screenshots/wallet-options.png)
- ✅ Deployed contract address — yield vault `CBD637UV…JOBE`
- ✅ **Verifiable contract-call tx** — vault `deposit`: [`b3e9c6ac…b3b19`](https://stellar.expert/explorer/testnet/tx/b3e9c6ac969dfc333b839418b418111bdec6850bb8166fc7bb6c6eb6211b3b19)
- ⬜ Live demo link (Vercel) — **optional**; repo is Vercel-ready (see README "Deploy to Vercel"). One import + env-vars + deploy.

## Backend / MongoDB
Not required. The Express + MongoDB backend is optional (profiles/contacts/groups
persistence). Without `NEXT_PUBLIC_API_URL` the app uses its in-app mock store, so
all chain + contract + Level 2 features work standalone (and on Vercel).

**Status: COMPLETE** — submittable now with the repo link + the tx hash above. Only the optional live demo URL remains (your Vercel click).
