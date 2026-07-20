<div align="center">

<img width="2849" height="1564" alt="Screenshot from 2026-07-20 16-58-12" src="https://github.com/user-attachments/assets/4a0445fb-b153-445b-8d53-57f78b7e6e95" />


<img src="https://img.shields.io/badge/Stellar-Soroban-7B2FBE?style=for-the-badge" />
<img src="https://img.shields.io/badge/Rust-1.70%2B-red?style=for-the-badge" />
<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge" />
<img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge" />
<img src="https://img.shields.io/badge/Noir-UltraHonk-2A2A2A?style=for-the-badge" />
<img src="https://img.shields.io/badge/Status-Live%20on%20Testnet-brightgreen?style=for-the-badge" />

# Glint

> **Zero-Knowledge USDC Tipping dApp on Stellar Soroban**
>
> One private deposit into a shared pool lets a supporter pay, message, and vote for a creator — anonymously, with every action still provable on-chain. Or tip publicly over x402 in ~5 seconds. Zero platform fee either way.

</div>

---

## Live Demo

| Surface | URL |
|---|---|
| **Frontend (Vercel)** | https://glint-one-fawn.vercel.app/ |
| **Backend / Relayer (Render)** | https://glint-1rtn.onrender.com |
| **Stellar Expert** | https://stellar.expert/explorer/testnet |
| **Demo Video** | [Drive Link](https://glint-one-fawn.vercel.app/) |

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [Architecture](#2-architecture)
3. [Zero-Knowledge Layer](#3-zero-knowledge-layer)
4. [Smart Contracts](#4-smart-contracts)
5. [Contract Deployment Addresses](#5-contract-deployment-addresses)
6. [Verified On-Chain Transactions](#6-verified-on-chain-transactions)
7. [Frontend](#7-frontend)
8. [Backend & Relayer API](#8-backend--relayer-api)
9. [Technology Stack](#9-technology-stack)
10. [Installation](#10-installation)
11. [Environment Variables](#11-environment-variables)
12. [Smart Contract Deployment Guide](#12-smart-contract-deployment-guide)
13. [Testing](#13-testing)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Event & Activity Indexing](#15-event--activity-indexing)
16. [Security Model](#16-security-model)
17. [Troubleshooting](#17-troubleshooting)
18. [Screenshots](#18-screenshots)
19. [Git History](#19-git-history)
20. [User Feedback Implementation](#20-user-feedback-implementation)

---

## 1. What This Is

Glint is a **micropayment tipping dApp** for creators on Stellar Soroban where supporters can back a creator two ways:

- **Public tipping** — an x402 USDC tip with a note on a public wall; **cryptographically settled** and recorded on-chain, and it works for both humans in a browser and AI agents over plain HTTP.
- **Private Patronage (ZK)** — a single fixed-amount deposit into a shared pool, then several **anonymous, on-chain-verifiable actions** (private payment to the creator, anonymous "$X supporter" message, stake-weighted poll vote) — **none of them linkable** to the supporter's wallet, or to each other.

This is not a custodial tip jar. The private path is a Tornado-style privacy pool: **deposit a commitment, later prove Merkle membership and reveal a single-use nullifier** to act, without ever revealing which deposit is yours.

### Why Private Patronage?

On any public chain, tipping a creator publishes the link between your wallet and who you support — forever. Glint's answer: **prove you deposited without revealing which deposit is yours**. A Noir + UltraHonk proof lets the pool verify you own a valid, unspent deposit (right tier, right creator, not double-spent) while the paying transaction is relayed by the server, so your wallet never appears on-chain for the action.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       SUPPORTER'S BROWSER                        │
│                                                                  │
│  Next.js 16 + React 19            noir_js + bb.js (UltraHonk)     │
│  ┌─────────────────────┐         ┌────────────────────────────┐  │
│  │  Tip UI / Patronage │────────▶│  build commitment + note   │  │
│  │  Activity wall/polls│         │  rebuild Merkle path        │  │
│  │  Freighter wallet   │         │  prove membership + nullif. │  │
│  └──────────┬──────────┘         │  Secret note STAYS HERE     │  │
│             │                    └──────────────┬─────────────┘  │
│    deposit()│ (signed once)        proof (no wallet, no sig)      │
└─────────────┼──────────────────────────────────┼────────────────┘
              │                                  │
              │                                  ▼
              │        ┌─────────────────────────────────────────┐
              │        │        NEXT.JS API RELAYER (server)      │
              │        │  POST /api/patronage/{withdraw,post,vote}│
              │        │  relays the tx from the server keypair   │
              │        │  indexes each action off-chain (+tx hash)│
              │        └───────────────────┬─────────────────────┘
              │                            │ relayed tx (source = server)
              ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SOROBAN SMART CONTRACTS                       │
│                                                                  │
│  TipJar ───── Patronage pool ───── UltraHonk verifier           │
│  (public wall)  (Merkle trees +     (cross-contract proof         │
│                  nullifiers)          verification)               │
└─────────────────────────────────────────────────────────────────┘
```

> **Split deploy:** the same Next.js app runs both roles. The **Render** deployment serves the API (holds the server keypair + contract ids); the **Vercel** deployment is a stateless frontend that proxies `/api/*` to Render via `BACKEND_URL` (see `next.config.ts`). Secrets live only on the backend.

### Component Responsibilities

| Component | Language | Responsibility |
|---|---|---|
| `circuits/patronage` | Noir + UltraHonk | One unified circuit / VK for all three actions; in-browser proving |
| `contracts/tipjar` | Rust/Soroban | Public tip wall; server admin records tips after x402 settlement |
| `contracts/patronage` | Rust/Soroban | Privacy pool: per-tier Merkle trees, nullifiers, recipient binding, verifier cross-call |
| external UltraHonk verifier | Rust/Soroban | On-chain proof verification, cross-called by the pool |
| `src/app/api` | TypeScript | Relayer routes (withdraw/post/vote), read routes, tip + creator APIs |
| `src/lib` | TypeScript | Chain access, x402 middleware, Poseidon/notes/Merkle, HD wallet, stores |
| `src/app` + `src/components` | Next.js 16 | Tip UI, private patronage UI, activity wall, polls, wallet |

### Project Structure

```
glint/
├── circuits/patronage/          # Noir circuit (unified) + compiled UltraHonk artifacts
│   ├── src/main.nr              # ONE circuit: WITHDRAW / MESSAGE / VOTE
│   └── target/                  # glint_patronage.json, vk, vk_fields.json
│
├── contracts/                   # Two SEPARATE Soroban Cargo workspaces
│   ├── tipjar/                  # public tip wall            (soroban-sdk 25)
│   └── patronage/               # ZK privacy pool            (soroban-sdk 26 — BN254 host fns)
│
├── src/                         # Next.js 16 app (frontend + API relayer)
│   ├── app/
│   │   ├── api/                 # tip, patronage/*, creators, health
│   │   ├── [slug]/ browse/ create/ dashboard/ wallet/
│   │   └── page.tsx             # landing
│   ├── components/              # creator/, wallet/, ui/, layout/
│   ├── lib/                     # stellar.ts, soroban-tx.ts, patronage/, freighter/,
│   │                            #   x402-server.ts, creators/, hd-wallet.ts
│   ├── hooks/                   # use-stellar-wallet.ts
│   └── stores/                  # zustand wallet store
│
├── scripts/                     # poseidon-check, verify-proof, patronage-e2e, test-x402
├── .github/workflows/           # deploy.yml (contracts → Render backend → Vercel CD)
├── next.config.ts               # BACKEND_URL /api proxy (frontend/backend split)
└── README.md                    # This file
```

---

## 3. Zero-Knowledge Layer

### Circuit Overview

**One** Noir circuit (`circuits/patronage/src/main.nr`), one verification key, one deployed verifier instance serve **all three** anonymous actions — a `domain` field separates them.

| Property | Value |
|---|---|
| Proof system | UltraHonk (Barretenberg `bb`), `keccak` oracle hash |
| Circuit language | Noir (`nargo` 1.0.0-beta.9 + `bb` 0.87.0, **pinned**) |
| Hash | Poseidon2 |
| Merkle tree depth | `TREE_DEPTH = 20` |
| Public inputs | 7 positional (below) |
| Where it runs | **Browser only** — the server never runs `bb.js` |

### Public Inputs (positional — the contract parses them by position)

```
[root, nullifier_hash, creator, tier, domain, sub_id, action_data]
```

The statement proved, without revealing which wallet or deposit is yours:

> *"I know the secret behind a commitment that (a) is a member of the tier-`tier` Merkle tree with root `root`, and (b) was deposited for `creator`; here is the single-use `nullifier_hash` for action `domain`/`sub_id`, bound to `action_data`."*

### On-Chain Binding (enforced by `contracts/patronage`)

```
root            ∈ that tier's 30-root history ring buffer   (membership, anti-stale)
nullifier_hash  == H(nullifier, domain, sub_id)             (single-use, marked spent)
tier            bound into the commitment                    ($1 deposit can't withdraw $10)
domain          WITHDRAW=1 · MESSAGE=2 · VOTE=3 (sub_id=poll) (independent single-use)
action_data     == keccak256(recipient) mod r                (relayer can't redirect funds)
```

### Commitment & Nullifier Derivation

```
commitment      = Poseidon(nullifier, secret, creator, tier)   // built in the browser
nullifier_hash  = H(nullifier, domain, sub_id)                 // domain-separated
```

The pool never learns `secret`. One deposit can **pay once, message once, and vote once per poll** — each action reveals a *different* nullifier, so even your own actions can't be linked to each other.

### Proving Flow (browser)

1. Fetch raw leaves from `/api/patronage/leaves`.
2. Rebuild the Merkle path locally (`src/lib/patronage/merkle.ts`).
3. Generate the UltraHonk proof in-browser (`noir_js` + `bb.js`, `client.ts`).
4. POST the proof to `/api/patronage/{withdraw,post,vote}` — the server relays it.

> `@aztec/bb.js` and `@noir-lang/noir_js` are pinned and kept in `serverExternalPackages` (`next.config.ts`) so their wasm stays out of the bundler.

---

## 4. Smart Contracts

### TipJar (`contracts/tipjar/`)

Public tip wall. The **server admin is the only writer** — it calls `record_tip` after x402 settlement.

```rust
pub fn init(env, admin: Address) -> Result<(), Error>
pub fn admin(env) -> Result<Address, Error>
pub fn record_tip(env, to, from, amount, asset, message, ...) -> Result<(), Error>
pub fn get_tips(env, to: Address) -> Vec<TipMessage>
pub fn tip_count(env, to: Address) -> u32
```

### Patronage pool (`contracts/patronage/`)

Privacy pool — **one Merkle tree per fixed tier** ($0.1 / $1 / $5 / $10 / $100), a 30-root history ring buffer per tier, domain-separated nullifiers, and recipient binding. Verifies proofs by **cross-contract call to the external UltraHonk verifier**. Requires `soroban-sdk 26` for BN254 host functions — **do not downgrade**.

```rust
pub fn __constructor(env, admin, verifier, token)
pub fn create_poll(env, creator, ...) -> u32
pub fn deposit(env, from, creator, tier, commitment)          // wallet-signed
pub fn withdraw(env, root, nullifier_hash, creator, tier, recipient, proof, ...)
pub fn post(env, root, nullifier_hash, creator, tier, msg_hash, proof, ...)
pub fn vote(env, root, nullifier_hash, creator, tier, poll_id, choice, proof, ...)
pub fn get_wall(env, creator: BytesN<32>) -> Vec<AnonMessage>
pub fn get_root(env, tier: i128) -> Option<BytesN<32>>
pub fn get_leaves(env, tier: i128) -> Vec<BytesN<32>>
pub fn is_nullifier_used(env, nullifier_hash: BytesN<32>) -> bool
pub fn get_tally(env, creator: BytesN<32>, poll_id: u32) -> Vec<i128>
```

`withdraw`/`post`/`vote` flow: check `root` is a known root of that tier → `verify` proof via the verifier contract → enforce `nullifier_hash` unused (then mark spent) → enforce `action_data` binding → perform the action (pay `tier` USDC / append message / add `tier` to tally).

### UltraHonk verifier (external)

The pool cross-calls an external verifier that fits the testnet compute budget: [`yugocabrio/rs-soroban-ultrahonk`](https://github.com/yugocabrio/rs-soroban-ultrahonk), deployed against the in-repo VK (`circuits/patronage/target/vk`).

> Per-contract API detail: [`contracts/patronage/README.md`](contracts/patronage/README.md) and [`contracts/tipjar/README.md`](contracts/tipjar/README.md).

---

## 5. Contract Deployment Addresses

**Network:** Stellar Testnet · The frontend reads these ids from server env at runtime (`/api/patronage/config`) — nothing is baked into the client bundle.

| Contract | Address |
|---|---|
| **TipJar** (public tip wall) | `CD6L33UBVYR6UJJY3SALQ7RENNYKZZN4XY6FVQPQOYL2XR6TGYECV45O` |
| **Patronage pool** (private ZK pool) | `CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW` |
| **UltraHonk verifier** | `CB5EBKT6WUST5LBZTSDLPH2H33BCFILUSPZVWQ5ASU4W3TYRT3ECFV4B` |

**Supporting addresses:**

| | Address |
|---|---|
| USDC SAC (canonical testnet USDC) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| USDC issuer (classic) | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| Pool admin + x402 relayer | `GCU5MT5FVCQ5HIHCZ2EHPPS3ASCMERFIHNQELEUGI5YT7JPLVC7QIO27` |

The admin/relayer is a dedicated testnet account (SEP-0005 index 2, derived from `TEST_MNEMONIC`).

> [View on Stellar Expert →](https://stellar.expert/explorer/testnet/contract/CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW)

---

## 6. Verified On-Chain Transactions

Every anonymous action lands on-chain from the **server keypair**, never the supporter's wallet — that unlinkability is the whole point, and it's publicly checkable on Stellar Expert.

| Action | Contract call | On-chain effect | Signed by |
|---|---|---|---|
| Deposit | `patronage.deposit` | Commitment added to the tier's Merkle tree | Supporter's wallet |
| Private pay | `patronage.withdraw` | `tier` USDC paid to `recipient`, nullifier burned | **Server (relayed)** |
| Anon message | `patronage.post` | "$X supporter" appended to the wall, nullifier burned | **Server (relayed)** |
| Poll vote | `patronage.vote` | `tier` added to the tally, nullifier burned | **Server (relayed)** |
| Public tip | `tipjar.record_tip` | Tip + note recorded after x402 settlement | Server admin |

> Live tx hashes appear on each creator's **activity wall** and **public tip wall**, each deep-linking to Stellar Expert. Fill the table below in with your own run:

| Step | Transaction Hash | Ledger |
|---|---|---|
| Deposit | `<tx-hash>` | Testnet |
| Private withdraw | `<tx-hash>` | Testnet |
| Anonymous post | `<tx-hash>` | Testnet |

### Read Pool State Directly

```bash
# Current Merkle root for the $1 tier (returns a BytesN<32>)
stellar contract invoke \
  --id CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW \
  --source glint-server --network testnet \
  -- get_root --tier 10000000

# Has a nullifier already been spent? (double-spend check)
stellar contract invoke \
  --id CDF7PJNDPVMSAWKBFFROSRSIFPDTRRS54JOXIQ3LWFBZRZZCY2OW5YFW \
  --source glint-server --network testnet \
  -- is_nullifier_used --nullifier_hash <hex32>
# → true / false
```

---

## 7. Frontend

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Freighter API v6 · Biome

### Pages

| Route | Description |
|---|---|
| `/` | Landing page — the two ways to support, how privacy works |
| `/browse` | Directory of creators |
| `/create` | Claim a handle / create a profile |
| `/dashboard` | Creator dashboard — stats, edit profile, polls |
| `/[slug]` | A creator's public page — public tip wall + private patronage + polls |
| `/wallet` | Freighter integration demo — detect → connect → balance → send XLM |

### Design System — "warm paper"

Light-mode, warm-cream aesthetic driven by CSS custom properties (`--color-bg`, `--color-surface`, `--color-ink`, olive-green `--color-accent`, semantic success/error/warn). Fraunces display serif for headings, JetBrains Mono for addresses/labels, Inter for body. Shared `Card` / `Button` primitives keep every surface on-brand.

### Frontend Integration Files

**`src/lib/stellar.ts`** — network config + Horizon access:
```typescript
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export async function loadBalances(address: string): Promise<AccountBalances>
export async function buildXlmPaymentTx(from, to, amount): Promise<string>
export async function submitSignedTx(signedXdr: string): Promise<string>
```

**`src/lib/patronage/client.ts`** — in-browser UltraHonk proving:
```typescript
// noir_js witness + bb.js proof generation, entirely client-side
// (the server only returns raw leaves; it never runs bb.js)
```

---

## 8. Backend & Relayer API

**Stack:** Next.js 16 route handlers (Node) · server keypair derived from `TEST_MNEMONIC` (SEP-0005 index 2) · off-chain index (Firestore in prod, JSON files in `.data/` locally, chosen by `STORE_TYPE`).

The backend is the **relayer**: it accepts a browser-generated proof and submits the transaction from the server keypair, so the action is unlinkable to the deposit. **It never runs `bb.js`.**

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tip/[slug]` | x402 USDC tip → `record_tip` after settlement |
| `GET` | `/api/tip-messages/[slug]` | Public tip wall for a creator |
| `POST` | `/api/patronage/withdraw` | Relay a private payment proof |
| `POST` | `/api/patronage/post` | Relay an anonymous message proof |
| `POST` | `/api/patronage/vote` | Relay a poll vote proof |
| `GET` | `/api/patronage/leaves` | Raw Merkle leaves (browser rebuilds the path) |
| `GET` | `/api/patronage/config` | Pool contract id + tiers for the browser |
| `GET` | `/api/patronage/wall/[slug]` | Anonymous activity wall |
| `GET` | `/api/patronage/poll/[slug]` | Poll + tally |
| `GET` | `/api/patronage/activity/[slug]` | Indexed activity feed (with tx hashes) |
| `GET` | `/api/patronage/spent` | Spent-nullifier lookup |
| `GET/POST` | `/api/creators`, `/api/creators/[slug]`, `/api/creators/by-wallet` | Creator CRUD |
| `GET` | `/api/health` | Liveness probe |

### Relayed Action Service

1. Browser POSTs `{ proof, publicInputs, ...args }`.
2. Server validates the shape and rate-limits (`src/lib/rate-limit.ts`).
3. Server builds + signs the Soroban tx from the server keypair (`src/lib/soroban-tx.ts`, `server.ts`).
4. Contract verifies the proof (cross-call), enforces the nullifier + binding, performs the action.
5. Server indexes the action off-chain with its tx hash, so the activity wall can deep-link it.

---

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar Soroban |
| Contract language | Rust (`#![no_std]`) — `soroban-sdk 25` (tipjar) / `26` (patronage) |
| Build target | `wasm32v1-none` |
| ZK proof system | UltraHonk (Barretenberg) over the in-repo Noir circuit |
| Circuit language | Noir (`nargo` 1.0.0-beta.9) |
| Proof library | `@aztec/bb.js` 0.87.0 + `@noir-lang/noir_js` 1.0.0-beta.9 (browser) |
| Payments | x402 (`@x402/core`, `@x402/fetch`, `@x402/stellar`) |
| Frontend | Next.js 16 / React 19 / TypeScript |
| Styling | Tailwind CSS v4 |
| Wallet | Freighter API v6 |
| State | Zustand 5 |
| Network client | `@stellar/stellar-sdk` 14 |
| Off-chain index | Firestore (prod) / JSON files (local), via `STORE_TYPE` |
| Lint / format | Biome (2-space) |
| Package manager | pnpm (via corepack) |
| CI/CD | GitHub Actions |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## 10. Installation

### Prerequisites

```bash
rustup target add wasm32v1-none
# Stellar CLI: https://developers.stellar.org/docs/tools/cli
# Node.js >= 20.9.0
corepack enable pnpm
# Only if you change the circuit: Noir nargo 1.0.0-beta.9 + bb 0.87.0
```

### Clone + Install

This repo ships a ready-to-run `.env.local` for the live deployment above (it is gitignored — it holds the dedicated testnet server key). No contract configuration is required to run locally.

```bash
git clone https://github.com/sangata2026/glint.git
cd glint
pnpm install
```

### Build Contracts

```bash
(cd contracts/tipjar    && stellar contract build)   # -> tipjar.wasm
(cd contracts/patronage && stellar contract build)   # -> patronage.wasm
```

### Run Development

```bash
pnpm dev        # → http://localhost:3000
```

**Requirements to sign deposits/tips from the UI:** a Stellar wallet ([Freighter](https://freighter.app/)) with testnet XLM + USDC (get USDC by swapping XLM on the testnet DEX — see [Smart Contract Deployment Guide](#12-smart-contract-deployment-guide)).

**Scripts:** `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint` · `pnpm format`.

---

## 11. Environment Variables

### `.env.local` (gitignored — all runtime configuration)

```env
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

# Only on the Vercel frontend: proxy /api/* to the Render backend
BACKEND_URL=https://glint-1rtn.onrender.com
```

### GitHub Secrets & Variables (CD)

| Name | Kind | Value |
|---|---|---|
| `STELLAR_SECRET_KEY` | Secret | Deployer/admin secret (opt-in — contract deploy skips if unset) |
| `RENDER_API_KEY` | Secret | Render API key |
| `RENDER_SERVICE_ID` | Secret | Render backend service id |
| `VERCEL_TOKEN` | Secret | Vercel deployment token |
| `VERCEL_ORG_ID` | Variable | Vercel org id |
| `VERCEL_PROJECT_ID` | Variable | Vercel project id |
| `BACKEND_URL` | Variable | Render backend URL (default `https://glint-1rtn.onrender.com`) |

---

## 12. Smart Contract Deployment Guide

Everything targets Stellar Testnet and needs the Stellar CLI (`stellar`), Rust with the `wasm32v1-none` target, and Node/pnpm.

### Fund a deployer

```bash
# Dedicated testnet account = admin + relayer. Use SEP-0005 index 2 so it
# matches the app's hd-wallet derivation. Imported as CLI identity glint-server.
stellar keys generate glint-server --network testnet --fund --hd-path 2
```

### Build

```bash
(cd contracts/tipjar    && stellar contract build)
(cd contracts/patronage && stellar contract build)
```

### Deploy + Initialize

```bash
# 1. TipJar + init with your admin
TIPJAR=$(stellar contract deploy \
  --wasm contracts/tipjar/target/wasm32v1-none/release/tipjar.wasm \
  --source glint-server --network testnet)
stellar contract invoke --id "$TIPJAR" --source glint-server --network testnet \
  -- init --admin $(stellar keys public-key glint-server)

# 2. UltraHonk verifier (external repo, built against the in-repo VK)
git clone https://github.com/yugocabrio/rs-soroban-ultrahonk
(cd rs-soroban-ultrahonk/contracts/rs-soroban-ultrahonk && stellar contract build)
VERIFIER=$(stellar contract deploy \
  --wasm rs-soroban-ultrahonk/target/wasm32v1-none/release/rs_soroban_ultrahonk.wasm \
  --source glint-server --network testnet \
  -- --vk_bytes-file-path circuits/patronage/target/vk)

# 3. Patronage pool wired to the verifier + USDC SAC
USDC=$(stellar contract id asset --asset \
  USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet)
PATRONAGE=$(stellar contract deploy \
  --wasm contracts/patronage/target/wasm32v1-none/release/patronage.wasm \
  --source glint-server --network testnet \
  -- --admin $(stellar keys public-key glint-server) --verifier "$VERIFIER" --token "$USDC")

# 4. Put TIPJAR / PATRONAGE / VERIFIER / your mnemonic into .env.local
```

### Fund with testnet USDC

```bash
stellar tx new change-trust --source glint-server --network testnet \
  --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
stellar tx new path-payment-strict-send --source glint-server --network testnet \
  --send-asset native --send-amount 500000000 \
  --destination $(stellar keys public-key glint-server) \
  --dest-asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --dest-min 800000000
```

### Gotchas

| Issue | Fix |
|---|---|
| Pool rejects a valid proof | VK on-chain must match the pinned `bb` 0.87.0 build — rebuild + redeploy the verifier |
| `nargo` / `bb` version drift | Toolchain is pinned (nargo 1.0.0-beta.9 + bb 0.87.0) — don't bump casually |
| `soroban-sdk` downgrade breaks patronage | Patronage needs `26` for BN254 host functions — do not downgrade |
| Verifier build fails on overflow | Add `overflow-checks = true` to its `[profile.release]` |

---

## 13. Testing

There is **no JS test framework**. Validation = `pnpm tsc --noEmit` + `pnpm biome check` + `pnpm build`, plus Rust unit tests and tsx validation scripts.

### Test Summary

| Suite | Runner | What it covers |
|---|---|---|
| Patronage contract | `cargo test -p patronage` | deposit/withdraw/post/vote happy paths, double-spend, unknown/evicted root, wrong domain, recipient + message binding, cross-tier replay, verification failure, root-history eviction |
| TipJar contract | `pnpm contract:test` | public tip wall record/read |
| Poseidon parity | `pnpm tsx scripts/poseidon-check.ts` | bb.js ↔ Noir ↔ Rust Poseidon agree |
| Proof + verify | `pnpm tsx scripts/verify-proof.ts` | prove the circuit + verify on the deployed verifier (no USDC) |
| Full E2E | `pnpm tsx scripts/patronage-e2e.ts` | testnet deposit → Merkle path → proof → on-chain `post` → wall |
| x402 tip | `pnpm test:x402` | x402 tip flow against `TEST_URL` |

### Run Contract Tests

```bash
cd contracts/patronage && cargo test -p patronage
```

### Run ZK Parity + E2E

```bash
pnpm tsx scripts/poseidon-check.ts     # Poseidon parity
pnpm tsx scripts/verify-proof.ts       # prove + on-chain verify (no USDC)
pnpm tsx scripts/patronage-e2e.ts      # full testnet deposit → proof → post → wall
```

### Static Checks

```bash
pnpm tsc --noEmit && pnpm biome check && pnpm build
```

---

## 14. CI/CD Pipeline

### CD (`.github/workflows/deploy.yml`) — push to `main` only

Contracts deploy first (opt-in — needs `STELLAR_SECRET_KEY`, skips by default). The backend (Render) and frontend (Vercel) deploy after, wired to the ids *this run* just deployed when contracts redeployed, falling back to the currently-live ids otherwise.

```yaml
jobs:
  deploy-contract:      # Stellar testnet (opt-in via STELLAR_SECRET_KEY)
    - dtolnay/rust-toolchain@stable (targets: wasm32v1-none)
    - cargo binstall stellar-cli
    - build + deploy tipjar, patronage, UltraHonk verifier
    - expose fresh ids as job outputs

  deploy-backend:       # Render
    needs: [deploy-contract]
    - upsert TIPJAR/PATRONAGE/VERIFIER_CONTRACT_ID (only if contracts redeployed)
    - POST Render deploys API → redeploy

  deploy-frontend:      # Vercel
    needs: [deploy-contract, deploy-backend]
    - npx vercel deploy --prod --token $VERCEL_TOKEN
    - BACKEND_URL → the Render backend (frontend proxies /api/* to it)
```

Each job **warn-and-skips** when its secrets are absent, so the pipeline is safe to enable incrementally.

<!-- Paste CI/CD pipeline screenshot here -->

---

## 15. Event & Activity Indexing

Glint pairs on-chain truth with an off-chain index so the public feeds stay fast while every item remains independently verifiable.

### On-Chain Reads

| Contract | Method | Returns |
|---|---|---|
| Patronage | `get_root(tier)` | Current Merkle root for a tier |
| Patronage | `get_leaves(tier)` | Raw leaves (browser rebuilds the path) |
| Patronage | `get_wall(creator)` | Anonymous "$X supporter" messages |
| Patronage | `get_tally(creator, poll_id)` | Stake-weighted vote tally |
| Patronage | `is_nullifier_used(hash)` | Double-spend check |
| TipJar | `get_tips(to)` / `tip_count(to)` | Public tip wall |

### Off-Chain Index

The relayer records every relayed action (withdraw/post/vote) and public tip into the store selected by `STORE_TYPE` (Firestore in prod, JSON files in `.data/` locally). Each indexed item carries its **on-chain tx hash**, so the activity wall and polls deep-link straight to Stellar Expert — the index is for display, the chain is the source of truth.

---

## 16. Security Model

### What Is Proven On-Chain

| Claim | Mechanism | On-Chain Check |
|---|---|---|
| Supporter owns a real deposit | Merkle membership | `root` ∈ that tier's 30-root history |
| Deposit hasn't been used for this action | Single-use nullifier | `is_nullifier_used == false`, then marked spent |
| Right denomination | Tier bound into the commitment | `tier` public input pays `tier`'s amount |
| Funds go to the intended creator | Recipient binding | `action_data == keccak256(recipient) mod r` |
| One vote per (deposit, poll) | Domain separation | `nullifier_hash = H(nullifier, VOTE, poll_id)` |

### What the Relayer Cannot Do

- Redirect a private payment (recipient is bound into the proof).
- Forge membership (needs a valid UltraHonk proof against the on-chain VK).
- Double-spend a deposit (nullifier is burned atomically).
- Link a deposit to an action (the action tx source is the server, not the wallet).
- Reuse a $1 deposit to withdraw $10 (tier is bound into the commitment).

### Known Limitations (by design)

- **Note backup.** The deposit note (the secret) lives in browser localStorage, keyed by wallet + creator — not backed up. Lose the store, lose the ability to act on that deposit.
- **Stake-weighted, not one-person-one-vote.** A vote adds its `tier` to the tally (1×$100 == 100×$1).
- **Activity feed is an off-chain index** — server-trusted for display, but every item is verifiable via its on-chain tx.
- **Anonymity needs a crowd.** Depositing then immediately acting in an empty pool links the two by timing; the anonymity set grows with depositors.
- **Testnet only** in its current configuration.

---

## 17. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Pool rejects a valid proof | On-chain VK ≠ your `bb` build | Rebuild verifier with pinned `bb` 0.87.0 and redeploy |
| `bb.js` wasm path errors | Package left in the bundler | Keep `@aztec/bb.js` + `@noir-lang/noir_js` in `serverExternalPackages` |
| Frontend `/api/*` calls 404 in prod | `BACKEND_URL` unset on Vercel | Set `BACKEND_URL` to the Render backend URL |
| Can't act after redeploying the pool | Old notes point at the old tree | Notes are per-deployment; redeploy fresh and re-deposit |
| USDC tip/deposit simulation fails | No USDC trustline/balance | Add trustline + swap XLM→USDC on the testnet DEX (§12) |
| Contract deploy job skipped in CI | `STELLAR_SECRET_KEY` unset | Add it in repo Settings → Secrets (opt-in by design) |
| `soroban-sdk` build error on patronage | SDK downgraded below 26 | Restore `26` — BN254 host functions require it |

---

## 18. Screenshots

### Landing Page — Desktop

> The two ways to support, how the privacy works, featured creators.

<img width="2849" height="1564" alt="Screenshot from 2026-07-20 16-58-12" src="https://github.com/user-attachments/assets/5136fce5-7ed7-4399-b7c5-46e9bc2df50e" />


### Mobile Responsive UI

> Stacked single-column layout — every surface accessible on a phone.

<div align="center">
  <img
    src="https://github.com/user-attachments/assets/c5c22a0f-2efc-409e-abe2-6226f282af19"
    alt="Screenshot from 2026-07-20 16-58-51"
    width="280"
  />
</div>


### CI/CD Pipeline Running

> GitHub Actions — contract deploy → Render backend → Vercel frontend, all green.

<img width="2841" height="1109" alt="Screenshot from 2026-07-20 16-59-31" src="https://github.com/user-attachments/assets/c2ef9570-5b48-4755-b267-b0fa2ee729b6" />


---

## 19. Git History

Meaningful commits with logical development progression:

| # | Commit Message | Description |
|---|---|---|
| 1 | `feat(wallet): add Freighter signer integration` | Freighter connect + signer foundation |
| 2 | `feat(wallet): add zustand wallet store` | Wallet state (address, balances, auto-reconnect) |
| 3 | `feat(creators): add creator store abstraction, types and validation` | Store abstraction (Firestore / JSON) |
| 4 | `feat(tipjar): add tipjar contract client and tip event helpers` | Public tip wall client |
| 5 | `feat(x402): add x402 payment middleware and Next HTTP adapter` | x402 USDC payment flow |
| 6 | `feat(patronage): add Poseidon hashing and field encoding helpers` | Poseidon parity across bb.js/Noir/Rust |
| 7 | `feat(patronage): add secret notes, deposit builder and Merkle path rebuild` | Client-side notes + Merkle |
| 8 | `feat(patronage): add in-browser UltraHonk proof client and error mapping` | Browser-only proving |
| 9 | `feat(patronage): add server relayer and off-chain activity/poll index` | Relayer + off-chain index |
| 10 | `feat(patronage): add withdraw, post and vote relayer API routes` | The three anonymous actions |
| 11 | `feat(circuit): add unified Noir patronage circuit and compiled artifacts` | One circuit / one VK / one verifier |
| 12 | `feat(contracts): add tipjar Soroban contract (public tip wall)` | TipJar contract |
| 13 | `feat(contracts): add patronage privacy-pool Soroban contract` | Merkle trees, nullifiers, verifier cross-call |
| 14 | `feat(creator-ui): add profile, tipping, wall and private-patronage components` | Creator-facing UI |
| 15 | `feat(config): proxy /api/* to BACKEND_URL when set (split frontend/backend deploy)` | Vercel/Render split |
| 16 | `feat(wallet): add /wallet Freighter integration demo (Level 1)` | Wallet demo route |
| 17 | `fix(wallet): restore site header on /wallet and match warm-paper theme` | Header + theme fix |
| 18 | `ci: add CD pipeline (contracts → Render backend → Vercel frontend)` | GitHub Actions CD |

---

## 20. User Feedback Implementation

Each row maps a specific issue found while actually using the app to the fix shipped for it.

| # | User Feedback | Implementation | Commit |
|---|---|---|---|
| 1 | Wallet balance is visible, but there's no way to actually send XLM or verify the full connect → balance → send flow without leaving the app for Freighter's own popup. | Added a self-contained `/wallet` route: `lib/stellar-wallet.ts` (detect/connect/sign), `lib/stellar-sdk.ts` (fetch balance / build / submit native payment), a `useWallet()` hook, and a panel with a tx-hash success banner linking to stellar.expert. | [`9bafd7e`](https://github.com/sangata2026/glint/commit/9bafd7e) |
| 2 | Navigating to the wallet page makes the site navbar disappear — the header is per-page, and the new route forgot to render it, so it reads as a broken, detached screen. | Rendered `<SiteHeader />` on `/wallet` inside the standard page shell, restoring the wordmark + nav + connect pill (and the active "Wallet" link). | [`89ba1d6`](https://github.com/sangata2026/glint/commit/89ba1d6) |
| 3 | The wallet page doesn't look like the rest of Glint — it uses a generic indigo/emerald palette with dark-mode variants instead of the app's warm-paper theme, so it feels bolted on. | Restyled `StellarWalletPanel` with the design tokens and `Card` / `Button` primitives (olive accent, Fraunces + JetBrains Mono, semantic success/error colors) so it reads as the same product. | [`89ba1d6`](https://github.com/sangata2026/glint/commit/89ba1d6) |
| 4 | Frontend secrets (server keypair, contract ids) shouldn't ship to the browser host, but the single app bundles API and UI together — hosting can't be split cleanly. | Added a `BACKEND_URL` rewrite in `next.config.ts` that proxies `/api/*` to a standalone backend, so the Vercel frontend stays stateless and secrets live only on the Render backend. | [`3b81e21`](https://github.com/sangata2026/glint/commit/3b81e21) |

---

## License

MIT © 2026 Glint

---

<div align="center">
  <sub>Built on Stellar Soroban · Proven by Noir + UltraHonk · One deposit, three anonymous actions</sub>
</div>
