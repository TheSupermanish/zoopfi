#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn add_subtract_and_get() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CounterContract, ());
    let client = CounterContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    assert_eq!(client.get_counter(&user), 0);

    assert_eq!(client.add_counter(&user, &5), 5);
    assert_eq!(client.add_counter(&user, &3), 8);
    assert_eq!(client.subtract_counter(&user, &2), 6);
    assert_eq!(client.get_counter(&user), 6);
}

#[test]
fn caps_at_threshold_and_floors_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CounterContract, ());
    let client = CounterContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    assert_eq!(client.add_counter(&user, &5000), THRESHOLD); // capped
    assert_eq!(client.subtract_counter(&user, &5000), 0); // floored

    // Per-user isolation.
    let other = Address::generate(&env);
    assert_eq!(client.get_counter(&other), 0);
}
