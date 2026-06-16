# Stellar + ZK Privacy Migration

This folder documents the migration of this app (currently "SuperPay" on Movement / Aptos) to **Stellar / Soroban** with a **private payments** layer built on Stellar's zero-knowledge primitives.

Scope for now (per product owner): get the **designs and functionality** working end to end. Real circuits and contracts can be stubbed or run on testnet. No mainnet real-asset value until an independent audit.

## Documents

| Doc | What it covers |
|-----|----------------|
| [01-research.md](./01-research.md) | The full Stellar ZK / privacy landscape, verified. Protocol timeline + CAPs, crypto host functions, Privacy Pools, Confidential Tokens, verifier contracts, circuit toolchains, dev stack + wallets, AI skills. Every load-bearing claim is sourced. |
| [02-architecture.md](./02-architecture.md) | The recommended target architecture: wallet/auth (keep Privy), SDK, asset (USDC over SAC), contracts, proving, and the chain-abstraction layer that makes the rest cheap. |
| [03-migration-plan.md](./03-migration-plan.md) | Phased plan, file-by-file mapping of what changes, the risk register, and the open decisions a human must make. |
| [04-privacy-design.md](./04-privacy-design.md) | The shielded-pool model (Privacy Pools) and the concrete deposit / private-transfer / withdraw flow mapped onto this app's screens. |

## TL;DR (the decisions that matter)

1. **Keep Privy.** Privy *does* support Stellar embedded wallets (`chainType: 'stellar'` via `@privy-io/react-auth/extended-chains`). Stellar is a Privy "Tier 2" chain (keypair generation + raw hash signing). We swap `'aptos'` for `'stellar'` and the entire social-login UX is preserved. Verified against [Privy docs](https://docs.privy.io/wallets/overview/chains).
2. **SDK:** `@stellar/stellar-sdk` (scoped, v15.x, Node 20+). The unscoped `stellar-sdk` is deprecated.
3. **Asset:** transact **USDC** (native Circle USDC on Stellar, 7 decimals) over the **Stellar Asset Contract (SAC)** via the **SEP-41** token interface. XLM only for fees. A USDC trustline is added during onboarding.
4. **ZK is live:** BN254 (CAP-0074, Protocol 25 "X-Ray") and Poseidon/Poseidon2 (CAP-0075) are live on mainnet since Jan 2026; Protocol 26 "Yardstick" (CAP-0080) made BN254 cheaper (live May 2026). Target **Groth16 over BN254 + Poseidon2**.
5. **Privacy model:** a **Privacy Pool / shielded pool** (fork [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments)). Public deposit/withdraw, private in-pool transfer. Hides *who-pays-whom*, not the deposit/withdraw amounts at the pool boundary.
6. **Chain-abstraction first.** The ~12 components that currently reach into Privy/Aptos internals collapse behind one `useWallet()` hook + a `ChainAdapter` interface, so the whole Stellar UX ships against a mock adapter and a mock prover before any contract is deployed.

## Reality check (must communicate)

The entire privacy stack we would build on (the Nethermind Privacy Pools code, the on-chain Circom Groth16 verifier, the BN254/Poseidon-backed verifier code) is **unaudited and testnet-only**. Public USDC payments use the audited SAC path and are safe; the shielded pool is a demo. Keep them separate, and gate any mainnet shielding behind a security audit.

## Source skills

Canonical Stellar guidance was pulled from the official [Stellar dev skills](https://skills.stellar.org/) ([github.com/stellar/stellar-dev-skill](https://github.com/stellar/stellar-dev-skill)): `dapp` (frontend + wallets), `zk-proofs`, `soroban`, `assets`, `data`. Install for your agent:

```
/plugin marketplace add stellar/stellar-dev-skill
/plugin install stellar-dev@stellar-dev
```
