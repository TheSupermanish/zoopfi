# 02 — Target Architecture

The guiding principle: treat the blockchain as a **swappable adapter behind one `useWallet()` hook**, so the entire Stellar UX (and the privacy UX) can ship against mocks before any contract exists. The codebase makes this tractable because all chain logic is already isolated in a handful of files and the backend is chain-agnostic.

---

## Decision summary

| Concern | Decision | Why |
|---------|----------|-----|
| **Auth / wallet** | Keep **Privy**, swap embedded-wallet `chainType: 'aptos'` -> `'stellar'`. Add Stellar Wallets Kit as a secondary "connect external wallet" option. | Privy supports Stellar (Tier 2). Preserves the exact social-login UX and the backend's address keying. Verified against Privy docs. |
| **SDK** | `@stellar/stellar-sdk` (scoped), v15.x. | Canonical, maintained, browser + Node. Unscoped `stellar-sdk` is deprecated. |
| **Asset** | **USDC** (native Circle, 7 decimals) over the **SAC**, SEP-41 interface. XLM for fees. | Real dollars, no custom token, full ecosystem support. |
| **Contracts** | (1) port the counter mini-game to Soroban; (2) fork Nethermind Privacy Pools for the shielded layer. | Counter is a low-risk first deploy that exercises the full invoke path; Privacy Pools is the only deployable shielded system. |
| **Proving** | Client-side WASM (Circom Groth16 / BN254 / Poseidon2). **Stubbed behind a `MockProver`** for the designs+functionality phase. | Lets the private UX demo with zero cryptography, then swap in the real prover. |

---

## Why keep Privy (the key finding)

The earlier assumption was that Privy has no Stellar support. **That is false.** Verified against [docs.privy.io/wallets/overview/chains](https://docs.privy.io/wallets/overview/chains) and [docs.privy.io/wallets/wallets/create/from-my-client](https://docs.privy.io/wallets/wallets/create/from-my-client):

- `'stellar'` is a supported `chainType`, generally available, alongside `aptos`, `sui`, `cosmos`, `movement`, etc.
- Stellar is **Tier 2 ("wallet abstractions")**, the *same tier this app already uses for Aptos*: Privy generates the Ed25519 keypair, derives the `G...` address, supports embedded wallets + private-key export, and **raw-signs hashes** (`useSignRawHash`). It does **not** build/submit transactions or sponsor gas (that is Tier 3, EVM/Solana only).

So the app's existing pattern is preserved exactly:

```
Privy social login  ->  createWallet({ chainType: 'stellar' })  ->  G... embedded wallet
sign a tx:  build tx (stellar-sdk)  ->  hash  ->  Privy signRawHash  ->  attach Ed25519 sig  ->  submit
```

This is structurally identical to the current Aptos flow (`build -> generateSigningMessage -> signRawHash -> AccountAuthenticatorEd25519 -> submit`). We are replacing the SDK that builds/submits, not the auth model.

External-wallet support (Freighter/xBull/LOBSTR) is added as a secondary path via **Stellar Wallets Kit**, replacing the `AptosWalletAdapterProvider`. Passkey smart accounts (`smart-account-kit`) are a roadmap item, not day-one.

---

## The chain-abstraction layer

Today ~12 components reach directly into Privy + Aptos internals (`usePrivy()`, `useWallet()` from the Aptos adapter, `user.linkedAccounts.find(a => a.chainType === 'aptos')`). We collapse that into:

```
app/lib/chain/
  types.ts          // ChainAdapter interface, Asset/Amount types, network config
  config.ts         // network, RPC/Horizon URLs, USDC asset+issuer, decimals, explorer
  useWallet.ts      // the ONE hook every page uses: { address, publicKey, balance, send, ... }
  adapters/
    stellar.ts      // StellarAdapter  (Privy Stellar embedded wallet + @stellar/stellar-sdk)
    mock.ts         // MockAdapter     (canned balances, fake hashes, instant success)
    aptos.ts        // AptosAdapter    (wraps the existing code; lets the app keep working mid-migration)
  privacy/
    types.ts        // PrivacyAdapter: deposit/transfer/withdraw/scanNotes/getPrivateBalance
    mock.ts         // MockPrivacyAdapter + MockProver (canned proofs, simulated notes)
    pool.ts         // real PrivacyAdapter (WASM prover + deployed Pool contract) — later phase
```

### The `ChainAdapter` interface (shape)

```ts
interface ChainAdapter {
  getAddress(): string | null;
  getPublicKey(): string | null;
  getBalance(asset?: Asset): Promise<string>;          // human units
  sendPayment(to: string, amount: string, asset?: Asset, memo?: string): Promise<TxResult>;
  invokeContract(contractId: string, method: string, args: ScVal[]): Promise<TxResult>;
  viewContract(contractId: string, method: string, args: ScVal[]): Promise<any>;
  getExplorerUrl(txHash: string): string;
  // privacy (optional; provided by PrivacyAdapter)
  privacy?: PrivacyAdapter;
}
```

Every page imports `useWallet()` and never touches Privy/SDK internals. An env flag (`NEXT_PUBLIC_CHAIN_ADAPTER=mock|stellar|aptos`) selects the adapter, so designs render against `mock` immediately.

---

## Transaction layer (StellarAdapter)

```
classic USDC payment:
  horizon.loadAccount(from)
  -> TransactionBuilder + Operation.payment({ destination, asset: USDC, amount })   // 7-decimal string
  -> tx.hash()
  -> Privy signRawHash(hash)  ->  attach Ed25519 signature
  -> horizon.submitTransaction(signed)  ->  poll

Soroban contract call (counter, pool):
  rpc.Server.getAccount(from)
  -> TransactionBuilder + Operation.invokeContractFunction / contract.call(method, ...args)
  -> rpc.simulateTransaction  ->  assemble/prepare
  -> tx.hash()  ->  Privy signRawHash  ->  attach sig
  -> rpc.sendTransaction  ->  poll getTransaction
```

- **Fees / gasless:** for the demo, fee-bump the user's tx from an app-owned sponsor account (no external dependency). Do not design around the archived Launchtube. Evaluate OpenZeppelin Relayer + Channels later.
- **Explorer:** `getExplorerUrl` -> `https://stellar.expert/explorer/testnet/tx/<hash>`.

---

## Asset model (USDC over SAC / SEP-41)

- Primary asset: **USDC** (testnet issuer `GBBD47IF...`, mainnet `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`). XLM only for fees/reserves.
- **7 decimals**, `i128` amounts on-chain (replaces MOVE's 8-decimal "octas"). Centralize decimals in `config.ts`; route all conversions through one helper. Audit every `* 100_000_000` site.
- **Trustline:** an embedded wallet must `changeTrust(USDC)` before it can receive USDC. Fold this into onboarding.
- **In contracts:** drive the SAC via `soroban_sdk::token::Client` against the SEP-41 subset (`transfer(from, to, amount)` with `require_auth`). Verify the USDC SAC contract ID by deterministic derivation (`Asset.contractId(networkPassphrase)`), never a hardcoded address.
- Do **not** roll a custom token. Reach for OpenZeppelin `stellar-tokens` only if a branded SuperPay token with custom controls is later needed.

---

## Contracts

1. **Counter mini-game** (`modules/sources/counter.move` -> a Soroban Rust crate). `#![no_std]`, `soroban-sdk = "26"`, `crate-type = ["cdylib"]`, build to `wasm32v1-none`. Per-user counter with `add_counter` / `subtract_counter` / `get_counter`. This is the first real deployment and validates the entire build -> Privy rawSign -> submit path on something with no money at risk.

2. **Privacy Pool** (fork [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments)). Deploy Pool + Circom Groth16 verifier + ASP Membership + ASP Non-Membership to testnet with the shipped `policy_tx_2_2` VK. See [04-privacy-design.md](./04-privacy-design.md).

---

## Backend (unchanged)

The Express + MongoDB backend keys on `walletAddress` strings, stores a unique `txHash` and a numeric `amount`. A Stellar `G...` address and a Horizon/RPC tx hash drop in with **zero schema change**. Only the *semantics* of `amount` change (USDC, 7 decimals). The one additive change for private payments: an optional `notePubKey` / `encryptionPubKey` on the `User` model so a private payment can resolve `@username -> recipient note key` (mirroring the existing `username -> walletAddress` resolution).

---

## What stays exactly the same

All UI pages and components (dashboard, send, receive, history, contacts, groups/bill-splitting, invoices, rewards/streaks, profile, onboarding, settings), the theme system, the design tokens in `globals.css`, the PWA manifest/service worker, and the backend feature set. The migration is a layer swap, not a redesign.
