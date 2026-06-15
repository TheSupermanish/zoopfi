# Zoopfi Soroban contracts

Rust smart contracts for Zoopfi on Stellar/Soroban. Replaces the old Move `modules/`.

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
