#![no_std]

//! # Glint TipJar
//!
//! Soroban contract that records tip messages for Glint creators.
//!
//! ## Trust model
//!
//! The server (Glint backend) is the only authorized writer (`admin`).
//! After an x402 payment settles, the server calls `record_tip` with the
//! tipper address, recipient, amount, and optional message. The server is
//! trusted to pass the correct values — it's already trusted for serving the
//! paywalled content and handling payments.
//!
//! The tip message is NOT cryptographically authored by the tipper on-chain.
//! This is a deliberate trade-off for simplicity: message authorship is
//! vouched for by the Glint server, not by the tipper's signature. For
//! financial auditing, the x402/USDC transfer itself is the authoritative
//! record — the message is social metadata on top.
//!
//! ## Storage
//!
//! - `DataKey::Admin` (instance) — the server address allowed to write
//! - `DataKey::Tips(recipient)` (persistent) — `Vec<TipMessage>` per creator
//!
//! On every `record_tip`, TTL is extended so tip history doesn't expire as
//! long as there is activity. For completely inactive creators, data will
//! eventually be archived and can be restored by paying rent.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String, Vec,
};

/// Minimum TTL threshold before extending (~7 days at 5 second ledger).
const TTL_THRESHOLD_LEDGERS: u32 = 120_000;

/// Target TTL when extending (~30 days at 5 second ledger).
const TTL_EXTEND_TO_LEDGERS: u32 = 518_400;

/// Maximum message length (bytes). Matches the server-side limit.
const MAX_MESSAGE_LEN: u32 = 280;

/// A single tip message recorded on-chain.
#[contracttype]
#[derive(Clone)]
pub struct TipMessage {
    /// Address of the tipper (as reported by the server — not cryptographically verified here).
    pub from: Address,
    /// Amount in the token's smallest unit (stroops for USDC = 7 decimals).
    pub amount: i128,
    /// Optional free-form note from the tipper. Empty string = no note.
    pub note: String,
    /// Ledger timestamp when the tip was recorded.
    pub timestamp: u64,
    /// Hash of the x402 USDC settlement transaction (32 bytes). Lets clients
    /// deep-link each wall item to Stellar Expert for on-chain verification.
    pub tx_hash: BytesN<32>,
}

#[contracttype]
pub enum DataKey {
    /// Singleton: the server address allowed to write.
    Admin,
    /// Per-recipient tip list.
    Tips(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    MessageTooLong = 3,
    NegativeAmount = 4,
}

#[contract]
pub struct TipJar;

#[contractimpl]
impl TipJar {
    /// Initialize the contract with an admin (the server's Stellar address).
    ///
    /// This is explicit instead of `__constructor` to give the deploy script
    /// full control of when/how init happens.
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);
        Ok(())
    }

    /// Return the admin address.
    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Record a new tip message. Only the admin (server) can call this.
    ///
    /// # Arguments
    ///
    /// * `from` - Tipper's Stellar address (passed by server, not cryptographically verified here).
    /// * `to` - Recipient's Stellar address.
    /// * `amount` - Tip amount in token smallest unit.
    /// * `note` - Optional message. Use empty string for no note.
    /// * `tx_hash` - Hash of the x402 USDC settlement tx. Stored so clients
    ///   can link each wall entry to the on-chain payment.
    pub fn record_tip(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        note: String,
        tx_hash: BytesN<32>,
    ) -> Result<(), Error> {
        // Only the configured admin (server) can record tips.
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        // Validate inputs.
        if amount < 0 {
            return Err(Error::NegativeAmount);
        }
        if note.len() > MAX_MESSAGE_LEN {
            return Err(Error::MessageTooLong);
        }

        // Load existing tips for this recipient, append the new one.
        let key = DataKey::Tips(to.clone());
        let mut tips: Vec<TipMessage> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env));

        tips.push_back(TipMessage {
            from,
            amount,
            note,
            timestamp: env.ledger().timestamp(),
            tx_hash,
        });

        // Persist and keep the entry alive.
        env.storage().persistent().set(&key, &tips);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD_LEDGERS, TTL_EXTEND_TO_LEDGERS);

        Ok(())
    }

    /// Return all tip messages for a recipient, newest first.
    ///
    /// Storage keeps messages in insertion order (append-only); the contract
    /// reverses on read so every caller sees the same ordering without having
    /// to re-sort client-side. Returns an empty Vec if the recipient has
    /// never received a tip.
    pub fn get_tips(env: Env, to: Address) -> Vec<TipMessage> {
        let stored: Vec<TipMessage> = env
            .storage()
            .persistent()
            .get(&DataKey::Tips(to))
            .unwrap_or_else(|| Vec::new(&env));

        let mut reversed: Vec<TipMessage> = Vec::new(&env);
        for i in (0..stored.len()).rev() {
            reversed.push_back(stored.get(i).unwrap());
        }
        reversed
    }

    /// Return the number of tip messages recorded for a recipient.
    pub fn tip_count(env: Env, to: Address) -> u32 {
        let tips: Vec<TipMessage> = env
            .storage()
            .persistent()
            .get(&DataKey::Tips(to))
            .unwrap_or_else(|| Vec::new(&env));
        tips.len()
    }
}

mod test;
