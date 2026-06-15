# 04 — Privacy Design

The private-payments feature uses the **Privacy Pool / shielded pool** model (fork [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments)). This doc explains what it hides, the deposit/transfer/withdraw flow, and how it maps onto this app's screens.

---

## What it hides vs reveals (set expectations)

- **Hides:** *who pays whom* (the sender<->receiver link and the in-pool transaction graph), and the **amounts of internal private transfers**.
- **Reveals:** the **deposit and withdraw amounts at the pool boundary** (they cross as ordinary USDC SAC transfers), so on-chain you can see "address X put 100 USDC into the pool" and "address Y took 100 USDC out", but not that X paid Y.

Contrast: a **Confidential Token** (ERC-7984/FHE) would do the inverse (hide amounts, reveal the flow), but it has no Soroban implementation yet, so it is not buildable here. See [01-research.md §5](./01-research.md).

> Anonymity is bounded by the size of the on-chain anonymity set. A near-empty pool, or correlated deposit/withdraw timing and amounts, can deanonymize a user even with valid ZK. This is a property of the model, not a bug.

---

## Cryptographic model

- **Note (UTXO):** `commitment = Poseidon2(amount, pubKey, blinding)`. Owning a note = knowing its `(amount, privKey, blinding)`.
- **Nullifier:** `Poseidon2(commitment, merklePath, signature)`, published when a note is spent, recorded on-chain to prevent double-spend. The nullifier cannot be linked back to the commitment without the secret.
- **Merkle tree:** all commitments are leaves in an on-chain Poseidon2 Merkle tree. Spending proves Merkle inclusion in zero knowledge.
- **Balance constraint (in-circuit):** `Σ inputAmounts + publicAmount === Σ outputAmounts`. `publicAmount` is `+deposit`, `0` (transfer), or `-withdraw`.
- **Compliance (ASP):** the circuit also proves the spender's key is in an on-chain **allow-list** (Merkle inclusion) and not in an on-chain **deny-list** (sparse-Merkle non-inclusion). The proof embeds the ASP roots, and the Pool rejects it unless they equal the live roots.
- **Keys, on device:** the Privy Stellar wallet signs a fixed `KEY_DERIVATION_MESSAGE` once; the client derives a **BN254 Note Key** (commitments) and an **X25519 Encryption Key** (encrypting note payloads to a recipient). Secrets never leave the browser.

All four operations are the **same `Pool.transact(proof, ext_data, sender)` call**, differing only by `publicAmount` sign and which note slots are non-zero.

---

## The flow, mapped to screens

### 1. Key setup (first private action)
Silent: derive Note Key + Encryption Key from one wallet signature. No UI beyond a one-time "Enable private balance" confirmation.

### 2. Deposit / "Shield" (public)
Where: a **"Shield" action** on the dashboard Private-balance card, or a **"Private" toggle** on the send screen set to "add to private balance".
- Client builds an output commitment, proves a deposit (no inputs spent, `publicAmount = +amount`) in the WASM Prover Worker, calls `Pool.transact`.
- Pool pulls USDC via SAC `transfer` (capped by `maximum_deposit_amount`) and inserts the commitment leaf. The note payload is encrypted to the depositor's X25519 key and emitted as an event.
- UI: same 4-step send UX (recipient=self, amount, confirm, success), but the success state says "Added to your private balance."

### 3. Private transfer (the core feature)
Where: the **send/transact screen with the "Private" toggle on**, addressed by `@username` exactly like a normal payment.
- Resolve `@username -> recipient note pubKey` via the backend (`User.notePubKey`). This mirrors the existing `@username -> walletAddress` resolution.
- Client proves: Merkle inclusion of the input note(s), correct nullifier derivation, ASP allow-list membership + deny-list non-membership, output-commitment correctness, and value conservation with `publicAmount = 0`. Calls `Pool.transact`.
- On-chain: ASP roots match, root known, nullifiers unspent, Groth16 verify passes -> mark nullifiers spent, insert new output commitments. **No token moves**, so amount and the sender<->receiver link stay private. The recipient's output note is encrypted to their X25519 key and emitted.
- UI: identical send flow; success says "Sent privately."

### 4. Note discovery (recipient side)
An indexer polls Stellar RPC for encrypted note events; a Storage Worker trial-decrypts them with the recipient's key into browser SQLite-over-OPFS. The recipient sees the incoming private note appear in their Private balance.

### 5. Withdraw / "Unshield" (public)
Where: an **"Unshield" action** on the Private-balance card.
- Client proves input ownership + nullifier + ASP gates + conservation with `publicAmount = -amount`; `Pool.transact` verifies and calls SAC `transfer` to a normal `G...` account.
- UI: "Move to spendable USDC", success shows the resulting public balance.

---

## UI surfaces to add

| Surface | Where | Notes |
|---------|-------|-------|
| **Private balance card** | Dashboard, beside the public USDC balance | Shows shielded total; entry points for Shield / Unshield / Send privately. |
| **"Private" toggle** | Send / Transact screens | Flips the same flow between public payment and private transfer. |
| **Private activity view** | History, a filter or tab | Distinct from public transaction history (these have no public tx for the transfer itself). |
| **"Enable private balance"** | One-time prompt | Triggers key derivation. |
| **ASP / compliance note** | Optional, in the private flow | Communicate that withdrawals require association-set membership (trust model). |

For Phases 0-2, every one of these runs against `MockPrivacyAdapter` + `MockProver`: simulated commitments, notes, balances, and latency, so the entire private product is demoable and reviewable before any circuit or contract is deployed. Phase 3 swaps the mock for the real WASM prover + deployed Pool with no UI change.

---

## Contracts (Phase 3)

Deploy from the fork:

```
./deployments/scripts/deploy.sh testnet --deployer <id> \
  --asp-levels 10 --pool-levels 10 --max-deposit 1000000000 \
  --vk-file deployments/testnet/circuit_keys/policy_tx_2_2_vk.json
```

- `Pool.__constructor(admin, token, verifier, asp_membership, asp_non_membership, maximum_deposit_amount, levels)` where `token` = the USDC SAC address.
- Verifier: Circom Groth16 over BN254, VK = `policy_tx_2_2` (2-in / 2-out, 1 membership + 1 non-membership, 10-level trees). Changing capacity needs a fresh Groth16 ceremony + new VK.
- ASP admin tooling inserts allow-list leaves and manages the deny-list SMT. Single admin key = the central trust assumption to disclose.

See [01-research.md §4](./01-research.md) for the full contract interfaces and verification order, and [03-migration-plan.md](./03-migration-plan.md) for risks (note durability, instruction budget, Poseidon2 param matching).
