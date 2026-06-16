#![no_std]
//! Zoopfi yield vault — an ERC-4626-style share vault with a time-accruing index.
//!
//! Deposits mint shares at the current price (`shares = assets * ONE / index`).
//! The `index` (price per share, 9-decimal fixed point) grows over time at a set
//! APY, so each share is worth more assets later — that growth is the yield.
//! Redeeming burns shares for `shares * index / ONE` assets (principal + yield).
//!
//! Ownership is a per-account share ledger here (v1). The *private* yield vault
//! composes this with Zoopfi's shielded pool: hold the vault shares as shielded
//! notes, so the share count (and therefore the balance + gains) stays hidden
//! while the index stays public. The yield mechanics are identical either way.
//!
//! Demo note: the index accrues a configured on-chain APY. Sourcing real yield
//! from a strategy (Blend / an AMM LP) is a drop-in replacement for `accrue`.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

/// Fixed-point scale for the index (1.0 == 1e9).
const ONE: i128 = 1_000_000_000;
/// ~5s ledgers → ledgers per year, used to prorate APY accrual.
const LEDGERS_PER_YEAR: i128 = 6_307_200;
const BPS: i128 = 10_000;

// Extend whenever the live-until is within ~30 days, pushing it out ~60 days.
// High threshold so the entry is bumped on first use (not only near expiry).
const TTL_THRESHOLD: u32 = 518_400;
const TTL_EXTEND_TO: u32 = 1_036_800;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientShares = 2,
    NotInitialized = 3,
    AlreadyInitialized = 4,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Shares(Address),
    TotalShares,
    Index,
    ApyBps,
    LastAccrual,
}

#[contract]
pub struct YieldVault;

#[contractimpl]
impl YieldVault {
    /// One-time setup: starting index = 1.0, with a fixed demo APY (basis points).
    pub fn initialize(env: Env, apy_bps: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Index) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Index, &ONE);
        env.storage().instance().set(&DataKey::ApyBps, &(apy_bps as i128));
        env.storage().instance().set(&DataKey::TotalShares, &0i128);
        env.storage().instance().set(&DataKey::LastAccrual, &env.ledger().sequence());
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        Ok(())
    }

    /// Grow the index by the APY accrued since the last call. Permissionless.
    pub fn accrue(env: Env) -> i128 {
        // Keep the vault's instance storage alive as it's used.
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        let index: i128 = env.storage().instance().get(&DataKey::Index).unwrap_or(ONE);
        let apy_bps: i128 = env.storage().instance().get(&DataKey::ApyBps).unwrap_or(0);
        let last: u32 = env.storage().instance().get(&DataKey::LastAccrual).unwrap_or(0);
        let now = env.ledger().sequence();
        if now <= last || apy_bps == 0 {
            return index;
        }
        let elapsed = (now - last) as i128;
        // simple (linear) accrual: index += index * apy * elapsed / (BPS * ledgers_per_year)
        let growth = index
            .saturating_mul(apy_bps)
            .saturating_mul(elapsed)
            / (BPS * LEDGERS_PER_YEAR);
        let next = index.saturating_add(growth);
        env.storage().instance().set(&DataKey::Index, &next);
        env.storage().instance().set(&DataKey::LastAccrual, &now);
        next
    }

    /// Deposit `assets`, minting shares at the current index. Caller authorizes.
    pub fn deposit(env: Env, from: Address, assets: i128) -> Result<i128, Error> {
        from.require_auth();
        if assets <= 0 {
            return Err(Error::InvalidAmount);
        }
        let index = Self::accrue(env.clone());
        let minted = assets.saturating_mul(ONE) / index;
        let key = DataKey::Shares(from.clone());
        let prev: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(prev + minted));
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        let total: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalShares, &(total + minted));
        env.events().publish((soroban_sdk::symbol_short!("deposit"), from), (assets, minted, index));
        Ok(minted)
    }

    /// Redeem `shares` for `shares * index / ONE` assets. Caller authorizes.
    pub fn redeem(env: Env, from: Address, shares: i128) -> Result<i128, Error> {
        from.require_auth();
        if shares <= 0 {
            return Err(Error::InvalidAmount);
        }
        let index = Self::accrue(env.clone());
        let key = DataKey::Shares(from.clone());
        let prev: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if prev < shares {
            return Err(Error::InsufficientShares);
        }
        env.storage().persistent().set(&key, &(prev - shares));
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        let total: i128 = env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalShares, &(total - shares));
        let assets = shares.saturating_mul(index) / ONE;
        env.events().publish((soroban_sdk::symbol_short!("redeem"), from), (shares, assets, index));
        Ok(assets)
    }

    /// Current price per share (9-decimal fixed point).
    pub fn index(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Index).unwrap_or(ONE)
    }

    pub fn apy_bps(env: Env) -> u32 {
        let v: i128 = env.storage().instance().get(&DataKey::ApyBps).unwrap_or(0);
        v as u32
    }

    pub fn shares_of(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Shares(user)).unwrap_or(0)
    }

    /// Current asset value of a user's position (principal + accrued yield).
    pub fn value_of(env: Env, user: Address) -> i128 {
        let shares: i128 = env.storage().persistent().get(&DataKey::Shares(user)).unwrap_or(0);
        let index: i128 = env.storage().instance().get(&DataKey::Index).unwrap_or(ONE);
        shares.saturating_mul(index) / ONE
    }

    pub fn total_shares(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
