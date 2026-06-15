# 03 — Migration Plan

Phased so that **designs and functionality land first** (against mocks), real Stellar payments next, and the real privacy stack last (an explicit go/no-go gate).

---

## Phase 0 — Chain-abstraction layer (no chain swap yet)

Goal: decouple the app from Aptos/Privy internals so the chain becomes swappable. Highest-leverage move; everything else gets cheap after this.

- Define `ChainAdapter` (and `Asset`/`Amount`/`TxResult`) in `app/lib/chain/types.ts`.
- Add `useWallet()` in `app/lib/chain/useWallet.ts` returning `{ address, publicKey, balance, send, ... }`, replacing the ~12 duplicated `linkedAccounts.find(a => a.chainType === 'aptos')` call sites.
- Wrap existing Aptos logic as `AptosAdapter` so the app keeps working on Movement during the refactor.
- Implement `MockAdapter` (canned balances, fake tx hashes, instant success), selectable via `NEXT_PUBLIC_CHAIN_ADAPTER`.
- Centralize network/asset config in `app/lib/chain/config.ts` (replaces hardcoded `MOVEMENT_CONFIGS`).

## Phase 1 — Stellar adapter + USDC public payments (testnet)

Goal: real Stellar embedded wallets; working public USDC send/receive; the entire existing feature set on Stellar testnet.

- `npm install @stellar/stellar-sdk@15`. Add a Buffer polyfill in `next.config.ts`; revisit the `crypto/stream:false` fallbacks (they break `stellar-base`). Transpile/import lighter subpaths.
- Rename `privy-movement.ts` -> `privy-stellar.ts`; `createWallet({ chainType: 'stellar' })`; flip `linkedAccounts` lookups to `'stellar'` (now centralized in `useWallet`).
- Implement `StellarAdapter`: classic USDC payment build/sign(rawSign)/submit via Horizon; counter via `rpc.Server`. Replace octas/8-decimal math with USDC/7-decimal.
- Replace `AptosWalletAdapterProvider` in `wallet-provider.tsx`; rebuild `wallet-selection-modal.tsx` (Privy social login primary; Stellar Wallets Kit "connect external wallet" secondary).
- Onboarding: auto `changeTrust(USDC)` for new embedded wallets; derive USDC SAC via `Asset.contractId`.
- Gasless: fee-bump from an app-owned sponsor account.
- Port the counter mini-game to Soroban; deploy to testnet; wire through `StellarAdapter.invokeContract`.
- Backend: no schema change; update amount units + explorer/network labels.

## Phase 2 — Private-payments UX against mocks

Goal: ship the complete shielded deposit / private-transfer / withdraw designs and flows with **zero real cryptography**.

- Design surfaces: a "Private balance" card on the dashboard; a "Private / Shield" toggle on send/transact; Shield (deposit) / Send privately (transfer) / Unshield (withdraw) actions; a private-activity view distinct from public history.
- Extend `ChainAdapter` with privacy ops; implement them in `MockPrivacyAdapter` with simulated commitments/notes/latency.
- `MockProver` returns canned proofs; a mock note store drives the full lifecycle in the UI.
- Backend: add optional `notePubKey`/`encryptionPubKey` to the `User` model for `@username -> note key` resolution.
- Run design/eng/devex reviews + QA on the mocked flows to lock the UX before paying the cryptography cost.

## Phase 3 — Real privacy stack (testnet) — GO/NO-GO

Goal: replace mocks with the real Nethermind shielded pool, client-side WASM proving, on-chain Groth16/BN254 verification on testnet.

- Fork `NethermindEth/stellar-private-payments`; deploy Pool + verifier + ASP Membership + ASP Non-Membership via `deploy.sh` with `policy_tx_2_2` (note LGPLv3 on circuit artifacts).
- Real `PrivacyAdapter`: device key derivation (BN254 Note Key + X25519 Encryption Key from one Privy signature), WASM Prover Worker, `Pool.transact` via `rpc.Server` + Privy rawSign.
- Pin Poseidon2 params to the on-chain CAP-0075 permutation (Horizen Labs params) so commitments/nullifiers reconcile; add on-chain/off-chain test vectors.
- Note indexing: an indexer persisting encrypted note events beyond the ~7-day RPC window + a Storage Worker decrypting into OPFS.
- Benchmark the policy circuit against the live testnet instruction budget (it is ~40% on its own).
- Minimal ASP admin tooling; document the single-admin trust model.

## Phase 4 — Hardening + roadmap (still testnet/demo)

- Robust fee sponsorship; note-store loss/recovery UX; stale-root and nullifier-spent error handling.
- Add the Stellar dev skill to repo tooling; adopt typed bindings (`stellar contract bindings typescript`).
- Roadmap (NOT day-one): passkey/smart-account onboarding (`smart-account-kit` + OZ Smart Accounts), third-party mainnet RPC, and the prerequisite **security audit before any mainnet real-asset value**.

---

## File-by-file change map

### Replace / rewrite (chain layer)
| File | Action |
|------|--------|
| `app/lib/aptos.ts` | -> `app/lib/chain/config.ts` (Stellar networks, USDC asset/issuer, decimals, explorer, RPC/Horizon URLs). |
| `app/lib/transfer.ts` | -> `StellarAdapter.sendPayment` (build/hash/rawSign/submit USDC payment). |
| `app/lib/balance.ts` | -> `StellarAdapter.getBalance` (`horizon.loadAccount().balances`); keep `formatBalance`/`formatUSD` (USDC ~ $1). |
| `app/lib/transactions.ts` | -> `StellarAdapter.invokeContract`/`viewContract` for the Soroban counter. |
| `app/lib/privy-movement.ts` | -> `app/lib/chain/privy-stellar.ts` (`createWallet({ chainType: 'stellar' })`). |
| `app/components/wallet-provider.tsx` | Replace `AptosWalletAdapterProvider`; (optional) Stellar Wallets Kit context. |
| `app/components/wallet-selection-modal.tsx` | Rebuild: Privy social login + "connect external wallet" (Wallets Kit). |
| `app/providers.tsx` | `PrivyProvider` config unchanged (login methods identical). |
| `modules/` (Move) | -> `contracts/` Soroban Rust (counter), plus the forked privacy-pool contracts. |

### Edit (flip to `useWallet()` + Stellar address shape)
`app/page.tsx`, `app/onboarding/page.tsx`, `app/dashboard/page.tsx`, `app/send/SendPageContent.tsx`, `app/transact/TransactPageContent.tsx`, `app/receive/ReceivePageContent.tsx`, `app/history/page.tsx`, `app/contacts/page.tsx`, `app/groups/page.tsx`, `app/invoices/page.tsx`, `app/rewards/page.tsx`, `app/settings/page.tsx`, `app/profile/[username]/page.tsx`, `app/components/PaymentRequestModal.tsx`, `app/components/counterItem.tsx`, `app/components/CounterArena.tsx`, `app/components/Sidebar.tsx`. Each currently does `usePrivy()` + Aptos `useWallet()` and a `chainType === 'aptos'` lookup -> all replaced by the one `useWallet()` hook.

### Unchanged
Backend (`backend/**`) except optional `notePubKey`/`encryptionPubKey` on `User`. All UI/design (`globals.css`, components, layouts), PWA (`manifest.ts`, `public/sw.js`), `app/lib/api.ts`, `app/context/ThemeContext.tsx`.

---

## Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Entire privacy stack is unaudited / testnet-only** (Nethermind pool, Circom verifier, BN254/Poseidon verifier code). | High | Scope to testnet/demo, no mainnet real-asset value; state in-product. Keep public USDC (audited SAC) separate from the shielded pool. Gate mainnet behind an audit. |
| **Privy Tier 2**: app owns tx construction/hashing/sig-attachment/submission; wrong Ed25519 hash encoding silently fails. | Medium | Isolate in `StellarAdapter`; mirror the existing `transfer.ts` build->hash->rawSign->attach->submit pattern; validate on the counter contract before money flows. |
| **Browser bundling**: `stellar-base` needs Buffer; current `next.config.ts` sets node fallbacks to false; WASM proving + OPFS add worker complexity. | Medium | Buffer polyfill + revisit fallbacks; import `./minimal`/`./no-axios`; run prover + scanner in Web Workers; prove out bundling early in Phase 1. |
| **Note durability**: RPC retains events ~7 days; OPFS can be wiped by AV -> users lose visibility of private notes. | High | Durable indexer beyond 7 days; note export/backup + re-scan; communicate device-bound demo nature. |
| **Instruction budget**: BN254 Groth16 verify is heavy; Privacy Pools transact ~40% of testnet budget; full policy circuit heavier. | Medium | Build on P26 (CAP-0080 cheaper BN254); use the 2-in/2-out 10-level instance; benchmark real proofs early. |
| **ASP centralization**: single admin key controls allow + deny lists. | Medium | Disclose trust model; run a controlled ASP for the demo; decentralize later. |
| **Poseidon2 param mismatch** between on-chain CAP-0075 permutation and off-chain Circom -> commitments/nullifiers fail. | Medium | Reuse the exact Horizen Labs params the repo ships; pin both sides; add equality test vectors. |
| **Asset/decimals change** (8-dec octas -> 7-dec USDC i128) touches every amount path. | Medium | Centralize decimals in `config.ts`; one conversion helper; audit every `* 100_000_000`; unit-test the helper. |

---

## Open decisions (need a human call)

1. **Confirm: keep Privy** now that Stellar support is verified (vs switch to Wallets Kit / passkeys). Recommendation: **keep Privy** (minimal change, preserves UX).
2. **Asset: USDC vs XLM.** USDC = real dollars but needs a trustline onboarding step + a testnet USDC funding path; XLM = simpler, no trustline, but volatile. Recommendation: **USDC**.
3. **Depth now:** ship Phases 0-2 (full Stellar USDC + fully-mocked private UX) and treat Phase 3 (real proving) as a stretch / go-no-go. Recommendation: **commit to Phases 0-2**.
4. **Rebrand:** repo is `zoopfi`, app is "SuperPay". Keep the name or rename to Zoopfi?
5. **Gasless model for the demo:** app-owned sponsor fee-bump (simple, recommended) vs OpenZeppelin Relayer (more production-shaped, mainnet availability unverified).
6. **ASP / compliance posture:** who holds the ASP admin key, what goes on the lists, and whether to surface compliance in the UI at all.
7. **Note discovery:** client-side OPFS scanner only, or also a server-side indexer (privacy/centralization tradeoff).
