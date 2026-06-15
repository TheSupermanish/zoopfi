#![no_std]
//! Zoopfi counter mini-game, ported from the original Move `counter` module to
//! Soroban. Each user has their own counter, keyed by their address. The caller
//! must authorize add/subtract (`require_auth`), mirroring the Move `signer`.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Counter is capped at this value (matches the Move COUNT_THRESHOLD).
const THRESHOLD: u32 = 1_000;

/// TTL management for per-user persistent entries (~30 days at 5s ledgers).
const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 518_400;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Counter(Address),
}

#[contract]
pub struct CounterContract;

#[contractimpl]
impl CounterContract {
    /// Increment `user`'s counter by `amount`, capped at THRESHOLD.
    pub fn add_counter(env: Env, user: Address, amount: u32) -> u32 {
        user.require_auth();
        let key = DataKey::Counter(user.clone());
        let current: u32 = env.storage().persistent().get(&key).unwrap_or(0);
        let next = if current >= THRESHOLD {
            current
        } else {
            current.saturating_add(amount).min(THRESHOLD)
        };
        env.storage().persistent().set(&key, &next);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        next
    }

    /// Decrement `user`'s counter by `amount` (saturating at 0).
    pub fn subtract_counter(env: Env, user: Address, amount: u32) -> u32 {
        user.require_auth();
        let key = DataKey::Counter(user.clone());
        let current: u32 = env.storage().persistent().get(&key).unwrap_or(0);
        let next = current.saturating_sub(amount);
        env.storage().persistent().set(&key, &next);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        next
    }

    /// Read `user`'s current counter value.
    pub fn get_counter(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&DataKey::Counter(user)).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
