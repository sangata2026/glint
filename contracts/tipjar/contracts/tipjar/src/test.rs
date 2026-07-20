#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env, String,
};

fn hash(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

fn setup() -> (Env, Address, Address, TipJarClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TipJar, ());
    let client = TipJarClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    (env, contract_id, admin, client)
}

fn short(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

#[test]
fn init_sets_admin() {
    let (_, _, admin, client) = setup();
    assert_eq!(client.admin(), admin);
}

#[test]
fn init_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TipJar, ());
    let client = TipJarClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    // Second init must error.
    let result = client.try_init(&admin);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn record_tip_appends() {
    let (env, _, _, client) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let h1 = hash(&env, 0x11);
    let h2 = hash(&env, 0x22);

    client.record_tip(&from, &to, &1_000_000, &short(&env, "nice work"), &h1);
    client.record_tip(&from, &to, &2_000_000, &short(&env, "keep going"), &h2);

    let tips = client.get_tips(&to);
    assert_eq!(tips.len(), 2);

    // Contract returns newest-first, so index 0 is the second tip recorded.
    let newest = tips.get(0).unwrap();
    assert_eq!(newest.amount, 2_000_000);
    assert_eq!(newest.note, short(&env, "keep going"));
    assert_eq!(newest.tx_hash, h2);

    let oldest = tips.get(1).unwrap();
    assert_eq!(oldest.from, from);
    assert_eq!(oldest.amount, 1_000_000);
    assert_eq!(oldest.note, short(&env, "nice work"));
    assert_eq!(oldest.tx_hash, h1);

    assert_eq!(client.tip_count(&to), 2);
}

#[test]
fn recipients_are_isolated() {
    let (env, _, _, client) = setup();

    let from = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.record_tip(&from, &alice, &100, &short(&env, "for alice"), &hash(&env, 1));
    client.record_tip(&from, &bob, &200, &short(&env, "for bob"), &hash(&env, 2));
    client.record_tip(&from, &alice, &300, &short(&env, "for alice again"), &hash(&env, 3));

    assert_eq!(client.tip_count(&alice), 2);
    assert_eq!(client.tip_count(&bob), 1);

    // Newest-first: "for alice again" (300) before "for alice" (100).
    let alice_tips = client.get_tips(&alice);
    assert_eq!(alice_tips.get(0).unwrap().amount, 300);
    assert_eq!(alice_tips.get(1).unwrap().amount, 100);

    let bob_tips = client.get_tips(&bob);
    assert_eq!(bob_tips.get(0).unwrap().amount, 200);
}

#[test]
fn empty_note_allowed() {
    let (env, _, _, client) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    client.record_tip(&from, &to, &100, &short(&env, ""), &hash(&env, 0));

    let tips = client.get_tips(&to);
    assert_eq!(tips.len(), 1);
    assert_eq!(tips.get(0).unwrap().note, short(&env, ""));
}

#[test]
fn long_note_rejected() {
    let (env, _, _, client) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // 281 chars — over the 280 limit.
    let long = "x".repeat(281);
    let long_string = String::from_str(&env, &long);

    let result = client.try_record_tip(&from, &to, &100, &long_string, &hash(&env, 0));
    assert_eq!(result, Err(Ok(Error::MessageTooLong)));
    assert_eq!(client.tip_count(&to), 0);
}

#[test]
fn negative_amount_rejected() {
    let (env, _, _, client) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let result = client.try_record_tip(&from, &to, &-1, &short(&env, "nope"), &hash(&env, 0));
    assert_eq!(result, Err(Ok(Error::NegativeAmount)));
    assert_eq!(client.tip_count(&to), 0);
}

#[test]
fn get_tips_empty_for_unknown_recipient() {
    let (env, _, _, client) = setup();
    let unknown = Address::generate(&env);
    assert_eq!(client.tip_count(&unknown), 0);
    assert_eq!(client.get_tips(&unknown).len(), 0);
}

#[test]
fn record_tip_requires_admin_auth() {
    // This test verifies that record_tip triggers an auth check for admin.
    // With mock_all_auths, the actual check passes; we verify the auth entry
    // is recorded on the admin address, not on the tipper or recipient.
    let (env, _, admin, client) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    client.record_tip(&from, &to, &100, &short(&env, "auth test"), &hash(&env, 0));

    // The mock_all_auths mode accepts any call; `env.auths()` returns
    // the authorizations that were asked for. The first element should be
    // the admin address.
    let auths = env.auths();
    assert!(
        auths.iter().any(|(addr, _)| addr == &admin),
        "expected admin auth to be required"
    );
}

#[test]
fn uninitialized_contract_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(TipJar, ());
    let client = TipJarClient::new(&env, &contract_id);

    // admin() fails
    let result = client.try_admin();
    assert_eq!(result, Err(Ok(Error::NotInitialized)));

    // record_tip fails
    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let result = client.try_record_tip(
        &from,
        &to,
        &100,
        &String::from_str(&env, ""),
        &hash(&env, 0),
    );
    assert_eq!(result, Err(Ok(Error::NotInitialized)));
}
