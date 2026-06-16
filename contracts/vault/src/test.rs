#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, VaultContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &id);
    (env, client)
}

#[test]
fn deposit_credits_balance_and_stats() {
    let (env, client) = setup();
    let alice = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &100), 100);
    assert_eq!(client.balance(&alice), 100);
    assert_eq!(client.holders(), 1);
    assert_eq!(client.total_deposited(), 100);

    // Second deposit accumulates, holder count unchanged.
    assert_eq!(client.deposit(&alice, &50), 150);
    assert_eq!(client.holders(), 1);
    assert_eq!(client.total_deposited(), 150);
}

#[test]
fn transfer_moves_balance_between_users() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.deposit(&alice, &100);
    let from_balance = client.transfer(&alice, &bob, &40);

    assert_eq!(from_balance, 60);
    assert_eq!(client.balance(&alice), 60);
    assert_eq!(client.balance(&bob), 40);
    assert_eq!(client.holders(), 2);
}

#[test]
fn transfer_emptying_sender_drops_holder_count() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.deposit(&alice, &100);
    client.transfer(&alice, &bob, &100);

    assert_eq!(client.balance(&alice), 0);
    assert_eq!(client.balance(&bob), 100);
    // alice emptied (-1), bob became a holder (+1) => still 1.
    assert_eq!(client.holders(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn transfer_insufficient_balance_panics() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.deposit(&alice, &10);
    client.transfer(&alice, &bob, &50);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn self_transfer_panics() {
    let (env, client) = setup();
    let alice = Address::generate(&env);

    client.deposit(&alice, &100);
    client.transfer(&alice, &alice, &10);
}

#[test]
fn withdraw_debits_balance() {
    let (env, client) = setup();
    let alice = Address::generate(&env);

    client.deposit(&alice, &100);
    assert_eq!(client.withdraw(&alice, &30), 70);
    assert_eq!(client.balance(&alice), 70);
    assert_eq!(client.holders(), 1);

    client.withdraw(&alice, &70);
    assert_eq!(client.balance(&alice), 0);
    assert_eq!(client.holders(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn deposit_zero_panics() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    client.deposit(&alice, &0);
}
