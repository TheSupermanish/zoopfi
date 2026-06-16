# Zoopfi Soroban contracts

Rust smart contracts for Zoopfi on Stellar/Soroban.

## vault (live on testnet)

On-chain balance ledger powering Zoopfi's deposit / transfer / withdraw flow. Every
state change publishes a Soroban event so the frontend streams a real-time activity
feed and keeps balances in sync. Methods:
- `deposit(from: Address, amount: i128) -> i128` (caller-authorized) — emits `deposit`
- `transfer(from: Address, to: Address, amount: i128) -> i128` (caller-authorized) — emits `transfer`
- `withdraw(from: Address, amount: i128) -> i128` (caller-authorized) — emits `withdraw`
- `balance(user: Address) -> i128`, `holders() -> u32`, `total_deposited() -> i128` (read-only)

Errors: `InvalidAmount (#1)`, `InsufficientBalance (#2)`, `SelfTransfer (#3)`.

**Deployed:** `CDZ22BGKBR4LH7NPO7BLZ2O6BWLQP6GNZTCR2PJWUOXMQUX4FVJP2UQR` ([testnet explorer](https://stellar.expert/explorer/testnet/contract/CDZ22BGKBR4LH7NPO7BLZ2O6BWLQP6GNZTCR2PJWUOXMQUX4FVJP2UQR))

```bash
rustup target add wasm32v1-none
cd contracts/vault
cargo test                       # 7 unit tests
stellar contract build           # -> target/wasm32v1-none/release/vault.wasm
stellar keys generate zoopfi --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/vault.wasm \
  --source zoopfi --network testnet
# put the returned C... id in the frontend env:
#   NEXT_PUBLIC_VAULT_CONTRACT_ID=C...
```

## yield_vault (live on testnet)

ERC-4626-style yield vault: deposits mint shares at the current price index
(`shares = assets * 1e9 / index`); the index accrues a configured APY over time,
so each share gains value (that's the yield). Redeem burns shares for
`shares * index / 1e9` assets (principal + yield). Methods:
- `initialize(apy_bps)`, `accrue()` (permissionless), `deposit(from, assets) -> shares`,
  `redeem(from, shares) -> assets`, `index()`, `apy_bps()`, `shares_of(user)`,
  `value_of(user)`, `total_shares()`

**Deployed:** `CAIGCDRWEX3UCRE3AES6WG4ESRRRPC5ERYSYSWJWEMEIXBLUTIYM6T5O` (8% APY) ([explorer](https://stellar.expert/explorer/testnet/contract/CAIGCDRWEX3UCRE3AES6WG4ESRRRPC5ERYSYSWJWEMEIXBLUTIYM6T5O))

Privacy: hold vault shares as shielded notes for *private yield* — the index is
public, the share count (and balance/gains) stays private. The yield index here
accrues a fixed demo APY; sourcing real yield from Blend / an AMM is a drop-in
replacement for `accrue`.

## counter

Per-user counter mini-game (port of the original Move `counter`). Methods:
- `add_counter(user: Address, amount: u32) -> u32` (caller-authorized, capped at 1000)
- `subtract_counter(user: Address, amount: u32) -> u32` (caller-authorized, floored at 0)
- `get_counter(user: Address) -> u32`

### Build, test, deploy (testnet)
```bash
rustup target add wasm32v1-none
cd contracts/counter
cargo test                       # unit tests
stellar contract build           # -> target/wasm32v1-none/release/counter.wasm
stellar keys generate alice --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/counter.wasm \
  --source alice --network testnet
# put the returned C... id in the frontend env:
#   NEXT_PUBLIC_COUNTER_CONTRACT_ID=C...
```

## Privacy pool (Phase 3, not yet deployed)

The shielded-pool contracts (Pool + Circom Groth16 verifier + ASP membership/non-membership)
are forked from [NethermindEth/stellar-private-payments](https://github.com/NethermindEth/stellar-private-payments).
Until deployed, the app's privacy features run against the in-app mock pool. See
[`../docs/stellar-migration/04-privacy-design.md`](../docs/stellar-migration/04-privacy-design.md).
