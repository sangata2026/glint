# Glint — RWA Project

> **Placeholder README.** This is a generic starting point for a Real World
> Assets (RWA) project built on Stellar. Replace this section with your own
> project description, goals, and documentation.

Glint is an RWA application on Stellar. It combines public, low-fee USDC
payments with a zero-knowledge privacy layer, so value can move both openly and
privately while every action stays provable on-chain.

Two supported paths:

- **Public payments** — an x402 USDC payment with an on-chain record; works for
  both humans (browser) and automated agents (HTTP).
- **Private (ZK)** — a single fixed-amount deposit into a shared pool, then
  several anonymous, on-chain-verifiable actions that no one can link back to
  the depositor's wallet. See [Private Layer (ZK)](#private-layer-zk).

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router, TypeScript, Turbopack)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) (linting + formatting)
- [@stellar/stellar-sdk](https://www.npmjs.com/package/@stellar/stellar-sdk) — Stellar network client
- [@stellar/freighter-api](https://www.npmjs.com/package/@stellar/freighter-api) — Freighter wallet connect
- [x402-stellar](https://www.npmjs.com/package/x402-stellar) — x402 payment protocol on Stellar
- [Noir](https://noir-lang.org/) + UltraHonk (`bb.js`) — in-browser ZK proving
- [Soroban](https://developers.stellar.org/docs/build/smart-contracts) — pool, tip, and UltraHonk verifier contracts
- pnpm (via corepack)

## Live deployment (Stellar Testnet)

This project is deployed and running on Stellar Testnet. The frontend reads
these ids from server env at runtime (`/api/patronage/config`), so nothing is
baked into the client bundle.

| Component | Contract ID |
| --------- | ----------- |
| TipJar (public tip wall) | [`CD6L33UBVYR6UJJY3SALQ7RENNYKZZN4XY6FVQPQOYL2XR6TGYECV45O`](https://stellar.expert/explorer/testnet/contract/CD6L33UBVYR6UJJY3SALQ7RENNYKZZN4XY6FVQPQOYL2XR6TGYECV45O) |
| Patronage pool (private ZK pool) | [`CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW`](https://stellar.expert/explorer/testnet/contract/CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW) |
| UltraHonk verifier | [`CB5EBKT6WUST5LBZTSDLPH2H33BCFILUSPZVWQ5ASU4W3TYRT3ECFV4B`](https://stellar.expert/explorer/testnet/contract/CB5EBKT6WUST5LBZTSDLPH2H33BCFILUSPZVWQ5ASU4W3TYRT3ECFV4B) |
| USDC SAC (canonical testnet USDC) | [`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |

The pool admin + x402 relayer is a dedicated testnet account,
[`GCU5MT5FVCQ5HIHCZ2EHPPS3ASCMERFIHNQELEUGI5YT7JPLVC7QIO27`](https://stellar.expert/explorer/testnet/account/GCU5MT5FVCQ5HIHCZ2EHPPS3ASCMERFIHNQELEUGI5YT7JPLVC7QIO27)
(SEP-0005 index 2, derived from `TEST_MNEMONIC`).

## Setup (run locally)

This repo ships a ready-to-run `.env.local` for the deployment above (it is
gitignored — it holds the dedicated testnet server key). No contract
configuration is required; just install and run:

```bash
corepack enable pnpm   # first time only
pnpm install
pnpm dev               # http://localhost:3000
```

**Requirements:** Node.js >= 20.9.0 and, to sign deposits/tips from the UI, a
Stellar wallet ([Freighter](https://freighter.app/)) with testnet XLM + USDC
(get USDC by swapping XLM on the testnet DEX — see "Deploy from scratch").

**Scripts:** `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint` · `pnpm format`.

## Environment

`.env.local` (gitignored) holds all runtime configuration:

```
# Stellar RPC endpoints
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# x402 payment flow
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_STELLAR_NETWORK=stellar:testnet

# Deployed Soroban contract ids
TIPJAR_CONTRACT_ID=CD6L33UBVYR6UJJY3SALQ7RENNYKZZN4XY6FVQPQOYL2XR6TGYECV45O
PATRONAGE_CONTRACT_ID=CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW
VERIFIER_CONTRACT_ID=CB5EBKT6WUST5LBZTSDLPH2H33BCFILUSPZVWQ5ASU4W3TYRT3ECFV4B
USDC_SAC=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

# Server signer = pool admin + x402 relayer (SEP-0005 m/44'/148'/{index}')
TEST_MNEMONIC="<24-word testnet mnemonic>"
SERVER_ACCOUNT_INDEX=2

# Storage backend: anything but "firestore" uses local JSON files (.data/)
STORE_TYPE=json

# Stellar CLI identity used by the dev scripts (verify-proof / patronage-e2e)
STELLAR_SOURCE=glint-server
```

## Deploy from scratch

Everything below targets Stellar Testnet and needs the
[Stellar CLI](https://developers.stellar.org/docs/tools/cli) (`stellar`), Rust
with the `wasm32v1-none` target, Node/pnpm, and — only if you change the circuit
— [Noir](https://noir-lang.org/) `nargo` 1.0.0-beta.9 + `bb` 0.87.0.

```bash
# 1. Create + fund a dedicated testnet account (this becomes admin + relayer).
#    Use a 24-word mnemonic and SEP-0005 index 2 so it matches the app's
#    hd-wallet derivation. Import its secret as the CLI identity `glint-server`.
stellar keys generate glint-server --network testnet --fund --hd-path 2

# 2. Build the two in-repo Soroban contracts.
(cd contracts/tipjar     && stellar contract build)   # -> tipjar.wasm
(cd contracts/patronage  && stellar contract build)   # -> patronage.wasm

# 3. Deploy the TipJar and initialize it with your admin.
TIPJAR=$(stellar contract deploy \
  --wasm contracts/tipjar/target/wasm32v1-none/release/tipjar.wasm \
  --source glint-server --network testnet)
stellar contract invoke --id "$TIPJAR" --source glint-server --network testnet \
  -- init --admin $(stellar keys public-key glint-server)

# 4. Build + deploy the UltraHonk verifier. The pool cross-calls an external
#    verifier that fits the testnet compute budget:
#    https://github.com/yugocabrio/rs-soroban-ultrahonk
#    (add `overflow-checks = true` to its [profile.release] if the CLI asks).
git clone https://github.com/yugocabrio/rs-soroban-ultrahonk
(cd rs-soroban-ultrahonk/contracts/rs-soroban-ultrahonk && stellar contract build)
VERIFIER=$(stellar contract deploy \
  --wasm rs-soroban-ultrahonk/target/wasm32v1-none/release/rs_soroban_ultrahonk.wasm \
  --source glint-server --network testnet \
  -- --vk_bytes-file-path circuits/patronage/target/vk)

# 5. Deploy the patronage pool wired to the verifier + USDC SAC.
USDC=$(stellar contract id asset --asset \
  USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet)
PATRONAGE=$(stellar contract deploy \
  --wasm contracts/patronage/target/wasm32v1-none/release/patronage.wasm \
  --source glint-server --network testnet \
  -- --admin $(stellar keys public-key glint-server) --verifier "$VERIFIER" --token "$USDC")

# 6. Put TIPJAR / PATRONAGE / VERIFIER / your mnemonic into .env.local (above).
```

To fund the account with **testnet USDC** (needed to deposit/tip), add a USDC
trustline and swap XLM for USDC on the testnet DEX:

```bash
stellar tx new change-trust --source glint-server --network testnet \
  --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
stellar tx new path-payment-strict-send --source glint-server --network testnet \
  --send-asset native --send-amount 500000000 \
  --destination $(stellar keys public-key glint-server) \
  --dest-asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --dest-min 800000000
```

---

# Private Layer (ZK)

**One private deposit lets a supporter take several anonymous, on-chain-verifiable
actions — none of them linkable to their wallet.**

From a single deposit into a shared pool, a supporter can:

1. **Pay privately** — the pool pays out; unlinkable to the deposit.
2. **Post an anonymous message** — shown as a verified "$X supporter", no wallet.
3. **Vote in a poll** — stake-weighted, one vote per poll per deposit.

It follows the classic privacy-pool / Tornado pattern — deposit a `commitment`,
later prove Merkle membership and reveal a single-use `nullifier` to act, without
revealing which deposit is yours.

## How it works

Three steps. Step 1 uses the supporter's wallet; steps 2–3 never do.

```
STEP 1 — DEPOSIT  (once, signed by the supporter's wallet)

   supporter's browser                          Pool contract (Soroban)
   ┌──────────────────────────┐    deposit()    ┌────────────────────────┐
   │ build a secret note      │ ──────────────► │ pull USDC into the pool│
   │ + commitment, sign with  │   (Freighter)   │ add commitment to the  │
   │ Freighter                │                 │ tier's Merkle tree     │
   └──────────────────────────┘                 └────────────────────────┘


STEP 2 — ACT  (any time later — NO wallet, NO signature)

   supporter's browser                          server (relayer)         Pool
   ┌──────────────────────────┐   proof over   ┌───────────────┐
   │ prove "my commitment is  │ ─────────────► │ relay the tx  │ ──► withdraw / post / vote
   │ in the tree" (noir_js +  │  POST /api/    │ (tx source =  │     (verified on-chain,
   │ bb.js), reveal nullifier │  patronage/*   │  the server)  │      single-use nullifier)
   └──────────────────────────┘                └───────┬───────┘
                                                       │ also records the action
                                                       ▼ off-chain, with its tx hash

STEP 3 — SEE  (anyone)

   Activity wall / Polls ── read ──► each item links to its on-chain tx,
                                     proving the source is the server, not a wallet.
```

- **Step 1** is the only step the supporter signs. The pool custodies the USDC.
- **Step 2** carries only a proof and is **relayed by the server**, so the tx source
  is never the supporter's wallet. Trust comes entirely from the proof + a
  single-use nullifier.
- The **server runs no `bb.js`**: it just returns the raw leaf list; the Merkle path
  and the proof are built in the browser (which already loads `bb.js`).

## Design decisions

- **Fixed tiers, one tree each.** Deposits come in fixed amounts
  ($0.1 / $1 / $5 / $10 / $100), and each denomination has its own Merkle tree.
  Fixed amounts make deposits look identical; the `tier` is bound into the proof,
  so a $1 deposit can never withdraw $10.
- **Commitment** = `Poseidon(nullifier, secret, creator, tier)`, computed in the
  browser — the pool never learns the secret.
- **Domain-separated nullifiers.** `nullifier_hash = H(nullifier, domain, sub_id)`
  with `domain` = WITHDRAW / MESSAGE / VOTE (and `sub_id` = poll id for votes).
  One deposit can pay once, message once, and vote once **per poll** — each action
  reveals a different nullifier.
- **Recipient binding, no registry.** The supporter names the payout `recipient`
  when proving; it is bound into the proof via
  `action_data == keccak256(recipient) mod r`, so the relayer cannot redirect funds.
- **Stake-weighted voting.** A vote adds its deposit `tier` to the tally (not +1),
  so influence is proportional to money staked (1×$100 == 100×$1).
- **Bounded root history.** Each deposit changes that tier's root; the pool keeps
  the last 30 roots per tier in a ring buffer.
- **Activity wall.** The server indexes every relayed action with its tx hash into
  an off-chain store, so the public feed can link each item to its on-chain tx.

## Unified circuit

One Noir circuit, one verification key, one verifier instance serve all three
actions. Its 7 public inputs (positional) are:

```
[root, nullifier_hash, creator, tier, domain, sub_id, action_data]
```

`action_data` binds the action: `keccak(recipient)` for a payment,
`keccak(message)` for a message, the vote `choice` for a vote — all checked
on-chain. See [`circuits/patronage/src/main.nr`](circuits/patronage/src/main.nr).

## Contracts

The current testnet ids are in [Live deployment](#live-deployment-stellar-testnet);
to stand up your own, see [Deploy from scratch](#deploy-from-scratch).
Contract-level detail lives in
[`contracts/patronage/README.md`](contracts/patronage/README.md) (the private
pool) and [`contracts/tipjar/README.md`](contracts/tipjar/README.md) (the public
tip wall).

## Validation

- `pnpm tsc --noEmit`, `pnpm biome check`, and `pnpm build` are clean.
- `cargo test -p patronage` — unit tests over the pool logic (deposit/withdraw/
  post/vote happy paths, double-spend, unknown/evicted root, wrong domain,
  recipient + message binding, cross-tier replay, verification failure, and
  root-history eviction).
- Poseidon (commitment + nullifier) matches bb.js ↔ Noir ↔ Rust
  (`scripts/poseidon-check.ts`).
- `scripts/verify-proof.ts` proves the circuit and verifies it on a deployed
  verifier (no USDC needed; set `VERIFIER_CONTRACT_ID`).
- `scripts/patronage-e2e.ts` drives the message flow end-to-end on testnet
  (deposit → Merkle path → proof → on-chain `post` → wall).

## Limitations (by design / known)

- **Note backup.** The deposit note (the secret) lives in the browser's
  localStorage, keyed by wallet + creator. It is not backed up — losing the
  browser store loses the ability to act on that deposit.
- **Stake-weighted, not one-person-one-vote** (see design decisions above).
- **Activity feed is an off-chain index** — server-trusted for display, but every
  item is still verifiable via its on-chain tx.
- **Anonymity needs a crowd.** Depositing then immediately acting in an empty pool
  links the two by timing; the anonymity set grows with the number of depositors.
- **Testnet only** in its current configuration. Redeploy fresh for any other
  environment.
