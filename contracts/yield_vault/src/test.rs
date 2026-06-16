#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger as _}, Address, Env};

fn setup(apy_bps: u32) -> (Env, YieldVaultClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    // Generous TTL so multi-day ledger jumps in tests don't archive storage.
    env.ledger().with_mut(|l| {
        l.sequence_number = 100;
        l.min_persistent_entry_ttl = 4096;
        l.min_temp_entry_ttl = 16;
        l.max_entry_ttl = 10_000_000;
    });
    let admin = Address::generate(&env);
    // Constructor runs atomically at deploy (admin + apy_bps).
    let id = env.register(YieldVault, (admin, apy_bps));
    let client = YieldVaultClient::new(&env, &id);
    (env, client)
}

#[test]
fn deposit_mints_shares_one_to_one_at_start() {
    let (env, client) = setup(800); // 8% APY
    let alice = Address::generate(&env);
    let shares = client.deposit(&alice, &1_000_000_000); // 1.0 asset (9dp)
    assert_eq!(shares, 1_000_000_000); // index == 1.0 → shares == assets
    assert_eq!(client.shares_of(&alice), 1_000_000_000);
    assert_eq!(client.value_of(&alice), 1_000_000_000);
}

// Ledger jumps stay within the instance TTL window (518_400 ledgers) so the
// contract's storage isn't archived mid-test; ~400k ledgers ≈ 23 days.
const JUMP: u32 = 400_000;

#[test]
fn index_and_value_grow_with_time() {
    let (env, client) = setup(1000); // 10% APY
    let alice = Address::generate(&env);
    client.deposit(&alice, &1_000_000_000);

    env.ledger().with_mut(|l| l.sequence_number += JUMP);
    let new_index = client.accrue();
    assert!(new_index > ONE, "index should grow: {}", new_index);
    let value = client.value_of(&alice);
    assert!(value > 1_000_000_000, "value should include yield: {}", value);
    assert!(value < 1_020_000_000, "yield over ~23d should be small: {}", value);
}

#[test]
fn redeem_pays_principal_plus_yield() {
    let (env, client) = setup(1000);
    let alice = Address::generate(&env);
    let shares = client.deposit(&alice, &1_000_000_000);

    env.ledger().with_mut(|l| l.sequence_number += JUMP);
    let assets_out = client.redeem(&alice, &shares);
    assert!(assets_out > 1_000_000_000, "should redeem more than deposited: {}", assets_out);
    assert_eq!(client.shares_of(&alice), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn redeem_too_many_shares_fails() {
    let (env, client) = setup(0);
    let alice = Address::generate(&env);
    client.deposit(&alice, &100);
    client.redeem(&alice, &1_000_000);
}

#[test]
fn later_depositor_gets_fewer_shares_after_growth() {
    let (env, client) = setup(1000);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.deposit(&alice, &1_000_000_000);
    env.ledger().with_mut(|l| l.sequence_number += JUMP); // index grows above 1.0
    let bob_shares = client.deposit(&bob, &1_000_000_000);
    // Bob deposits the same assets but at a higher index → fewer shares than Alice.
    assert!(bob_shares < 1_000_000_000, "bob gets fewer shares: {}", bob_shares);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn deposit_dust_after_growth_rejected() {
    let (env, client) = setup(1000);
    let alice = Address::generate(&env);
    client.deposit(&alice, &1_000_000_000);
    env.ledger().with_mut(|l| l.sequence_number += JUMP); // index > 1.0
    client.accrue();
    // assets=1 with index>1.0 would mint 0 shares → DustAmount.
    client.deposit(&alice, &1);
}

#[test]
#[should_panic]
fn constructor_rejects_excessive_apy() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    // 200_000 bps = 2000% > MAX_APY_BPS (100_000) → constructor panics.
    env.register(YieldVault, (admin, 200_000u32));
}
