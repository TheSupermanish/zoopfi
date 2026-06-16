#![no_std]
//! Zoopfi balance vault.
//!
//! An on-chain ledger of per-user balances. Users `deposit` to credit their
//! balance, `transfer` to move balance to another user, and `withdraw` to debit
//! it. Every state change publishes a Soroban event so the frontend can stream a
//! real-time activity feed and keep its UI in sync.
//!
//! This is a testnet demo ledger: it tracks balances inside the contract rather
//! than custodying a real asset. It exists to exercise contract deploy, read +
//! write calls, structured errors, and event-driven state sync end to end.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env};

/// Per-user persistent entries live ~30 days at 5s ledgers, bumped on each write.
const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 518_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Amount must be positive.
    InvalidAmount = 1,
    /// Sender does not have enough balance for this transfer/withdraw.
    InsufficientBalance = 2,
    /// A user cannot transfer to themselves.
    SelfTransfer = 3,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    /// Balance for a given account.
    Balance(Address),
    /// Number of accounts that currently hold a non-zero balance.
    Holders,
    /// Total amount ever deposited (monotonic, for stats/leaderboard).
    TotalDeposited,
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Credit `from`'s balance by `amount`. Caller must authorize.
    /// Emits: ("deposit", from) -> (amount, new_balance)
    pub fn deposit(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        if amount <= 0 {
            panic_with(&env, Error::InvalidAmount);
        }

        let prev = read_balance(&env, &from);
        if prev == 0 {
            bump_holders(&env, 1);
        }
        let next = prev + amount;
        write_balance(&env, &from, next);

        let total = read_total(&env) + amount;
        env.storage().instance().set(&DataKey::TotalDeposited, &total);

        env.events()
            .publish((symbol_short!("deposit"), from), (amount, next));
        next
    }

    /// Move `amount` from `from` to `to`. Caller (`from`) must authorize.
    /// Emits: ("transfer", from, to) -> (amount, from_balance, to_balance)
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> i128 {
        from.require_auth();
        if amount <= 0 {
            panic_with(&env, Error::InvalidAmount);
        }
        if from == to {
            panic_with(&env, Error::SelfTransfer);
        }

        let from_prev = read_balance(&env, &from);
        if from_prev < amount {
            panic_with(&env, Error::InsufficientBalance);
        }

        let to_prev = read_balance(&env, &to);
        let from_next = from_prev - amount;
        let to_next = to_prev + amount;

        write_balance(&env, &from, from_next);
        write_balance(&env, &to, to_next);

        // Holder accounting: `to` may have just become a holder; `from` may have
        // just emptied out.
        let mut delta: i32 = 0;
        if to_prev == 0 {
            delta += 1;
        }
        if from_next == 0 {
            delta -= 1;
        }
        if delta != 0 {
            bump_holders(&env, delta);
        }

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            (amount, from_next, to_next),
        );
        from_next
    }

    /// Debit `amount` from `from`'s balance. Caller must authorize.
    /// Emits: ("withdraw", from) -> (amount, new_balance)
    pub fn withdraw(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        if amount <= 0 {
            panic_with(&env, Error::InvalidAmount);
        }

        let prev = read_balance(&env, &from);
        if prev < amount {
            panic_with(&env, Error::InsufficientBalance);
        }
        let next = prev - amount;
        write_balance(&env, &from, next);
        if next == 0 {
            bump_holders(&env, -1);
        }

        env.events()
            .publish((symbol_short!("withdraw"), from), (amount, next));
        next
    }

    /// Read `user`'s current balance.
    pub fn balance(env: Env, user: Address) -> i128 {
        read_balance(&env, &user)
    }

    /// Number of accounts holding a non-zero balance.
    pub fn holders(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Holders)
            .unwrap_or(0)
    }

    /// Total amount ever deposited into the vault.
    pub fn total_deposited(env: Env) -> i128 {
        read_total(&env)
    }
}

fn panic_with(env: &Env, error: Error) -> ! {
    soroban_sdk::panic_with_error!(env, error)
}

fn read_balance(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(user.clone()))
        .unwrap_or(0)
}

fn write_balance(env: &Env, user: &Address, value: i128) {
    let key = DataKey::Balance(user.clone());
    env.storage().persistent().set(&key, &value);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn read_total(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalDeposited)
        .unwrap_or(0)
}

fn bump_holders(env: &Env, delta: i32) {
    let current: u32 = env
        .storage()
        .instance()
        .get(&DataKey::Holders)
        .unwrap_or(0);
    let next = if delta >= 0 {
        current.saturating_add(delta as u32)
    } else {
        current.saturating_sub((-delta) as u32)
    };
    env.storage().instance().set(&DataKey::Holders, &next);
}

#[cfg(test)]
mod test;
