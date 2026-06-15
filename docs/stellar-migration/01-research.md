# 01 — Stellar ZK & Privacy: Research

Status as of 2026-06. Every non-obvious claim below was verified against primary sources (CAPs, repo source, official docs, npm registry). Where the ecosystem literature conflicts, the conflict is called out.

---

## 1. The privacy stack is three layers

Stellar's official framing is a spectrum "from low-level cryptographic host functions to managed private payment systems":

1. **Cryptographic host functions** baked into the Soroban runtime: BLS12-381, BN254, Poseidon/Poseidon2. These are primitives, not products.
2. **On-chain ZK verifier contracts** that consume those host functions: RISC Zero (Groth16), UltraHonk (Noir/Barretenberg), Circom Groth16.
3. **Managed application protocols**: Privacy Pools / Stellar Private Payments, and (future) Confidential Tokens.

> The docs are explicit: host functions "are foundational building blocks and do not, on their own, provide end-to-end private payments without additional higher-level protocol or application logic." You still generate proofs off-chain and deploy a verifier contract.

Refs: [Privacy on Stellar](https://developers.stellar.org/docs/build/apps/privacy), [ZK Proofs on Stellar](https://developers.stellar.org/docs/build/apps/zk).

---

## 2. Protocol timeline and CAPs (all LIVE on mainnet)

| Primitive | CAP | Protocol | Mainnet status |
|-----------|-----|----------|----------------|
| BLS12-381 (11 host fns, incl. hash-to-curve) | CAP-0059 | 22 | Live (predates the "privacy" branding) |
| BN254 `g1_add`, `g1_mul`, `multi_pairing_check` | CAP-0074 | 25 "X-Ray" | Live since 2026-01-22 |
| Poseidon / Poseidon2 permutations | CAP-0075 | 25 "X-Ray" | Live since 2026-01-22 |
| BN254 MSM + Fr arithmetic + on-curve checks | CAP-0080 | 26 "Yardstick" | Live since 2026-05-06 |

- **X-Ray (P25)** is the milestone that made Stellar ZK-capable. Testnet vote 2026-01-07, mainnet 2026-01-22. Goal: "configurable, compliance-forward privacy applications using ZK cryptography without compromising the transparency that defines Stellar."
- **Yardstick (P26)** added CAP-0080: nine host functions (BN254 `g1_msm`, `fr_add/sub/mul/pow/inv`, and `is_on_curve` checks) that move heavy ZK arithmetic into the native host, making Noir/UltraHonk verification "significantly cheaper than Wasm-side implementations."
- **BN254 mirrors Ethereum's EIP-196/EIP-197 precompiles** deliberately, so existing Circom/snarkjs zk-SNARK verifiers port over.

### Gotchas
- `bn254_g1_add` and the `is_on_curve` checks do **not** verify subgroup membership. Verifier code must guard against small-subgroup attacks.
- Poseidon/Poseidon2 take **all** parameters (round constants, MDS / internal diagonal, rounds) as caller-supplied. The protocol does not validate cryptographic soundness; you must use the official paper parameters or the exact params your off-chain circuit uses, or commitments/nullifiers will not reconcile.
- `bn254_fr_inv` errors on zero input. Poseidon permutation cost scales **quadratically** with state size `t`.
- The page `stellar.org/learn/zero-knowledge-proof` is stale (says curves "still need to be implemented"). Trust the CAPs (all Final/Implemented) and blog posts instead.

Refs: [CAP-0074](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md), [CAP-0075](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md), [CAP-0059](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0059.md), [CAP-0080](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0080.md), [X-Ray blog](https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25), [Yardstick upgrade guide](https://stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide).

---

## 3. Crypto host functions in the Soroban Rust SDK

Entry point is `env.crypto()`. BN254 lives in `soroban_sdk::crypto::bn254`.

```rust
let bn = env.crypto().bn254();
// pub fn g1_add(&self, p0: &G1Affine, p1: &G1Affine) -> G1Affine
// pub fn g1_mul(&self, p0: &G1Affine, scalar: &Fr) -> G1Affine
// pub fn pairing_check(&self, vp1: Vec<G1Affine>, vp2: Vec<G2Affine>) -> bool
```

- Types: `G1Affine(BytesN<64>)` = `be(X)||be(Y)`; `G2Affine(BytesN<128>)`; `Fr(U256)` scalar mod r. Big-endian, uncompressed, Ethereum-compatible. G1 supports `Add` and `Mul<Fr>` operator overloads.
- `pairing_check` returns true iff the pairing product equals 1 in Fq12. It **panics** on unequal-length or empty vectors. This is the primitive a Groth16 verifier is built on.
- Poseidon has a high-level tier (no feature flag): `Crypto::poseidon_hash(inputs: &Vec<U256>, field: Symbol) -> U256` and `poseidon2_hash(...)`. The field symbol must be `"BN254"` (hard-asserted). A low-level `CryptoHazmat` tier (cargo feature `hazmat`) exposes the raw `poseidon_permutation` / `poseidon2_permutation`.
- SDK Poseidon params: classic `t=3, RATE=2, d=5, rounds_f=8, rounds_p=57` (matches circom `poseidon([1,2])`); Poseidon2 `t=4, RATE=3, d=5, rounds_f=8, rounds_p=56` ("equivalent to the Barretenberg proving system").

### Gotchas
- **Wasm target is `wasm32v1-none`**, not `wasm32-unknown-unknown`.
- Cost is dominated by Wasm instruction execution. A single `poseidon([3,4])` measured ~3.9M instructions on Futurenet; a `g1_add` ~0.55M. Default P25 test `Env` enforces mainnet resource limits.
- The p25-preview examples pin `soroban-sdk` by git rev (workspace v23.1.0); the same APIs shipped in published `soroban-sdk` 26.x. There is **no** Groth16 verifier in the preview, only `g1_add`/`g1_mul`/`pairing_check` building blocks; you assemble the verifier yourself.

Refs: [soroban-sdk v25 BN254 migration](https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254/index.html), [v25 Poseidon migration](https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_poseidon/index.html), [jayz22/soroban-examples @ p25-preview](https://github.com/jayz22/soroban-examples/tree/p25-preview/p25-preview).

---

## 4. Privacy Pools / Stellar Private Payments (the reference we fork)

[NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments) is a UTXO / JoinSplit-style shielded pool on Soroban with compliance. It is an **unaudited research prototype** ("should not be used in production environments with real assets"). It is the only complete shielded-pool system deployable on Stellar testnet today.

### Contracts (4 + utils)
- **Pool** — single `transact(env, proof: Proof, ext_data: ExtData, sender: Address)` entrypoint. Deposit, Withdraw, and Transfer are all the same call, differing only by `ext_data.ext_amount` sign and which notes are spent/created.
- **circom-groth16-verifier** — `verify(env, proof: Groth16Proof, public_inputs: Vec<Bn254Fr>) -> Result<bool>`. BN254. VK embedded at compile time. Uses `soroban_sdk::crypto::bn254` (`g1_mul`, `g1_add`, `pairing_check`). Computes `vk_x = ic[0] + Σ public_input[i]·ic[i+1]`, then `e(-A,B)·e(alpha,beta)·e(vk_x,gamma)·e(C,delta) == 1`.
- **asp-membership** — allow-list, append-only Poseidon2 Merkle tree. `insert_leaf`, `get_root`.
- **asp-non-membership** — deny-list, Sparse Merkle Tree. `insert_leaf`, `delete_leaf`, `verify_non_membership`, `get_root`.

### `transact()` verification order
1. Proof's ASP roots must equal the live `asp-membership` / `asp-non-membership` roots (cross-contract calls).
2. `MerkleTreeWithHistory::is_known_root(proof.root)` (recent-history window).
3. Each input nullifier not already spent (persistent `Map<U256, bool>`).
4. `CircomGroth16VerifierClient::verify(proof, public_inputs)`.
5. Mark nullifiers spent + emit event; insert new output commitments into the Merkle tree.
6. Move tokens: `ext_amount > 0` -> `token.transfer(sender, pool, amt)` (deposit); `ext_amount < 0` -> `token.transfer(pool, recipient, amt)` (withdraw).

### Crypto / circuits
- **Commitment** `c = Poseidon2(amount, pubKey, blinding)` (domain tag `0x01`). **Nullifier** `Poseidon2(commitment, merklePath, signature)` (tag `0x02`). Balance constraint `Σ inputs + publicAmount === Σ outputs`.
- Circuits in Circom 2.2.2. Deployed instance is `policy_tx_2_2 = PolicyTransaction(2, 2, 1, 1, 10, 10)`: 2 inputs, 2 outputs, 1 membership + 1 non-membership proof, 10-level pool tree, 10-level SMT.
- **Client-side WASM proving.** Rust core compiled to WASM, run in Web Workers: a **Prover Worker** (Groth16 proving) and a **Storage Worker** (SQLite over OPFS for events + decrypted notes). Keys are derived from a single user signature over a `KEY_DERIVATION_MESSAGE` into a **BN254 Note Key** (commitments) and an **X25519 Encryption Key** (note payloads). Secrets never leave the device.

### Compliance (ASP)
Association Set Providers maintain an allow-list (must prove inclusion) and a deny-list (must prove non-inclusion), enforced inside the ZK circuit against on-chain roots. View keys let an authorized party audit a participant without breaking everyone's privacy.

### Deploy
```
./deployments/scripts/deploy.sh testnet --deployer <id> \
  --asp-levels 10 --pool-levels 10 --max-deposit 1000000000 \
  --vk-file deployments/testnet/circuit_keys/policy_tx_2_2_vk.json
```

### Gotchas
- Unaudited; testnet only. Single ASP admin controls both trees (trust assumption).
- Stellar RPC retains events ~7 days, so note scanning breaks for users onboarded later unless you run a durable indexer.
- Browser OPFS note storage can be deleted by antivirus -> note/secret loss.
- Verification is ~40% of the testnet instruction budget; the deployed circuit is fixed at 2-in/2-out / 10-level (changing capacity needs a fresh Groth16 ceremony + new VK).
- `circuits/build.rs` is LGPLv3 (rest Apache-2.0).
- Anonymity is bounded by the on-chain anonymity set; a near-empty pool or correlated timing/amounts can deanonymize.

> Note on curve: an older SDF mixer precursor (`ymcrcat/soroban-privacy-pools`) used Groth16 over **BLS12-381**. The Nethermind reference impl we model uses **BN254** (its verifier calls `crypto::bn254`). BN254 is authoritative for the fork.

---

## 5. Confidential Tokens (complementary, not available on Soroban yet)

The [Confidential Token Association](https://www.confidentialtoken.org/) (Inco, OpenZeppelin, Zama; SDF joined) standardizes **ERC-7984** "Confidential Fungible Token" (EIP Draft, July 2025). It hides **amounts/balances** while keeping the **flow graph public** — the inverse of Privacy Pools.

- Handle-based: balances/amounts are `bytes32` pointers; backend-agnostic (FHE, ZK, enclaves). Allowances are replaced by time-bounded operators (`setOperator(addr, uint48 until)`).
- Reference impl is OpenZeppelin `@openzeppelin/confidential-contracts` (Solidity, Zama FHEVM, pre-1.0). FHE confidentiality relies on an off-chain coprocessor network + threshold KMS, and transfers can **fail silently** on ciphertext.
- **No Stellar/Soroban implementation exists yet.** SDF's stated plan is to "prototype the first Stellar-native confidential tokens." Soroban exposes ZK primitives, not FHE; homomorphic-encryption host functions are roadmap, not shipped.

**Implication:** for this migration, Confidential Tokens are not a buildable option. We use Privacy Pools. Track ERC-7984 as the model for a future "hide amounts" feature.

---

## 6. Verifier contracts (deployable starter code)

On-chain ZK verification only fits Soroban's ~100M instruction budget because of native BN254. A pure-WASM (arkworks) pairing is ~560M instructions (5.6x over budget).

| Repo | System | Curve | Interface | Notes |
|------|--------|-------|-----------|-------|
| [NethermindEth/stellar-risc0-verifier](https://github.com/NethermindEth/stellar-risc0-verifier) | Groth16 (RISC Zero zkVM) | BN254 | `verify(seal, image_id, journal_digest)` via Router | 4-contract stack (Router, Verifier, EmergencyStop, TimelockController). VK compile-time embedded. Proving needs x86_64 + Docker; **cannot prove in-browser**. Cheapest on-chain (constant cost). Unaudited. |
| [yugocabrio/rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk) | UltraHonk (Noir/bb) | BN254 | `__constructor(vk_bytes)` + `verify_proof(public_inputs, proof_bytes)` | Ships example circuits **and** a `tornado_classic` mixer + identity contract. ~105M instructions (pairing ~98M); near budget. No access control. Unaudited. |
| [indextree/ultrahonk_soroban_contract](https://github.com/indextree/ultrahonk_soroban_contract) | UltraHonk (Noir/bb) | BN254 | same as above | Same crypto crate, different pins; localnet-targeted. |

### Gotchas
- UltraHonk proofs MUST be generated with `bb --oracle_hash keccak` (default oracle won't verify). Strict version coupling to Nargo 1.0.0-beta.9 + bb 0.87.0.
- RISC Zero Groth16 proving needs x86_64 + Docker (`RISC0_DEV_MODE=0`); Apple Silicon must prove on x86_64 infra or Bonsai/Boundless.
- None audited.

---

## 7. Circuit toolchains

| Tool | Proof system | In-browser proving | Trusted setup | Best for |
|------|--------------|--------------------|---------------|----------|
| **Circom + snarkjs** | Groth16 (BN254) | Yes (WASM) | **Per-circuit** phase-2 ceremony | The Privacy Pools fork (it already uses this). Reuses Ethereum tooling. |
| **Noir + Barretenberg** | UltraHonk (BN254) | Yes (`@noir-lang/noir_js` + `@aztec/bb.js`) | Universal/transparent | Greenfield circuits; cheaper after P26. Poseidon now an external dep (`noir-lang/poseidon`). |
| **RISC Zero** | Groth16 wrapper over zk-STARK | **No** (needs 16GB+/GPU/Bonsai) | One shared ceremony | Proving arbitrary Rust execution. Wrong tool for in-browser privacy-pool proving. |

**Recommendation for a privacy pool:** Circom + Groth16 + BN254 + Poseidon2. It is what the Nethermind reference uses, proves in-browser, and matches the live mainnet host functions. The per-circuit ceremony is the cost; use the shipped `policy_tx_2_2` VK to avoid running one.

Refs: [Noir docs](https://noir-lang.org/docs/), [RISC Zero docs](https://dev.risczero.com/).

---

## 8. App dev stack + wallets

- **CLI:** `stellar` (the old `soroban` binary was renamed), v26.x. `stellar contract init / build / deploy / invoke`. Rust 1.84+, target `wasm32v1-none`. Read-only fns simulate locally; state changes need `--send=yes`.
- **JS SDK:** `@stellar/stellar-sdk` (scoped), latest stable **v15.1.0**, Node 20+. The unscoped `stellar-sdk` is deprecated at 13.3.0; `js-stellar-sdk` is the repo, not a package. Modules: `Horizon.Server` (classic), `rpc.Server` (Soroban), `contract.Client` (typed clients), `TransactionBuilder`, `Keypair`, `Asset`, `Operation`. The removed `SorobanRpc` namespace is now `rpc`.
- **Testnet endpoints:** Horizon `https://horizon-testnet.stellar.org`, Soroban RPC `https://soroban-testnet.stellar.org`, Friendbot `https://friendbot.stellar.org`, passphrase `Test SDF Network ; September 2015`. SDF hosts public RPC for testnet/futurenet only; mainnet needs a third-party RPC provider.
- **OpenZeppelin Stellar Contracts** (Rust, audited, v0.7.x): `stellar-tokens` (SEP-41 fungible, NFT, RWA, vault), `stellar-access` (Ownable/RBAC), `stellar-contract-utils` (Pausable/Upgradeable), `stellar-macros`. Pin exact versions. Contracts Wizard at `wizard.openzeppelin.com/stellar`.
- **Wallets:**
  - **Privy** (extended-chains) provisions Stellar embedded wallets from social login. See doc 02.
  - **Stellar Wallets Kit** (`@creit-tech/stellar-wallets-kit`, v2.3.0, via JSR) connects external wallets (Freighter, xBull, Albedo, Rabet, LOBSTR, Hana, WalletConnect, Ledger, ...). Selection abstraction, **not** social-login/embedded.
  - **Passkey smart wallets:** `passkey-kit` is now legacy/demo-only; the modern path is `smart-account-kit` (built on OpenZeppelin `accounts`) + OpenZeppelin Smart Accounts. WebAuthn (secp256r1) requires Protocol 21+.
- **Gasless / fee sponsorship:** Launchtube is **archived (2026-03-09)**; replaced by **OpenZeppelin Relayer + Channels Plugin** (currently leads with testnet `channels.openzeppelin.com/testnet`). For a demo, the simplest path is fee-bumping user transactions from an app-owned sponsor account using the SDK. Soroban contract accounts (smart wallets) can't pay their own fees and use nonces, so they need a relayer.

### Gotchas
- Scaffold Stellar generates a **Vite + React** app, not Next.js. We wire `@stellar/stellar-sdk` ourselves.
- `stellar-base` assumes Node `Buffer`; Next.js needs a Buffer polyfill and the current `next.config.ts` `crypto/stream:false` fallbacks must be revisited. Import lighter subpaths (`./minimal`, `./no-axios`).

Refs: [dapp skill](https://skills.stellar.org/skills/dapp/SKILL.md), [assets skill](https://skills.stellar.org/skills/assets/SKILL.md), [soroban skill](https://skills.stellar.org/skills/soroban/SKILL.md), [Stellar CLI](https://developers.stellar.org/docs/tools/cli), [SDKs](https://developers.stellar.org/docs/tools/sdks), [Stellar Wallets Kit](https://stellarwalletskit.dev/), [OpenZeppelin Stellar](https://www.openzeppelin.com/networks/stellar).

---

## 9. AI skills

[skills.stellar.org](https://skills.stellar.org/) ships agent-readable skills: `soroban`, `dapp` (frontend & wallets), `assets`, `data` (RPC/Horizon), `agentic-payments`, `zk-proofs`, `standards` (SEPs/CAPs). The `zk-proofs` skill is deliberately status-cautious ("always verify CAP status, network version, soroban-sdk support before relying on a primitive") and recommends a **verification-gateway** + **policy-and-proof split** + **feature-flag/fallback** architecture. Install: `/plugin marketplace add stellar/stellar-dev-skill` then `/plugin install stellar-dev@stellar-dev`.
