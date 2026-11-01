# VeriProcure AI

**Telegraph Hackathon Season II — Track 03: Apps & Agents / Mission 10: Model Economy**

VeriProcure AI is a solo-built machine-customer application. It purchases code-generation intelligence, independently purchases a requirements/reference answer, and purchases an LLM evaluation through Telegraph. It records the actual returned Intent, Miner, observed cost, latency, receipt headers, signal hash and signal lookup result.

## Status and honest limitations

This is an implementation starter with the three-call workflow and audit persistence wired in. It has **not** yet been validated against a live paid testnet wallet in this environment. Before calling it a completed hackathon entry, run the real integration checks below.

The Engine auto-router receives natural-language queries. Each query asks for a specific mission Intent, but the app checks and records the actual returned `intent`; it does not assume routing succeeded. A run is marked `completed` only when all three returned Intent names match, all three signal lookups succeed, and all three Telegraph receipts are present. Otherwise it is retained as `needs_review` or `partial`.

The evaluator score is an LLM assessment, not ground truth. This starter does not claim deterministic correctness or a cost-per-verified-correct-answer leaderboard yet. That requires isolated execution of task-specific tests and a repeatable benchmark harness.

## Requirements

- Docker Engine and Docker Compose v2
- Node.js 20+ (22 recommended) and npm for local wallet setup
- Ethereum Sepolia ETH for gas
- Telegraph test USDC

## 1. Prepare local environment

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`. Set a strong local `POSTGRES_PASSWORD` and retain a conservative `MAX_REQUEST_USD=0.02`.

## 2. Create or register a dedicated Sepolia test wallet

```bash
npm run wallet:create
```

The script writes the private key to `.env.local`, sets restrictive file permissions and prints only the public address. It refuses to overwrite an existing key. Never share the private key or seed phrase, and never use a mainnet wallet.

For a production-style self-serve deployment, the app also exposes a wallet form in the dashboard that accepts a Sepolia wallet address and private key and saves the configuration server-side. This allows end users to add their own Sepolia wallet for x402 payments without modifying the source code.

## 3. Fund with test assets

Follow `docs/WALLET_SETUP.md`:
1. Fund the generated address with Sepolia ETH from a reputable faucet.
2. Mint 10 Telegraph test USDC using `npm run wallet:mint-usdc`.
3. Check the mint transaction on a Sepolia block explorer.

## 4. Run with Docker

```bash
docker compose --env-file .env.local up --build
```

Open http://localhost:3000.

Stop the containers:

```bash
docker compose --env-file .env.local down
```

Remove the database volume only if you intentionally want to delete local history:

```bash
docker compose --env-file .env.local down -v
```

## 5. Three-purchase workflow

1. `CODE_GENERATION`: procure a proposed implementation.
2. `QUESTION_ANSWERING`: independently procure requirements, facts and an acceptance checklist.
3. `LLM_OUTPUT_EVALUATION`: procure an assessment against the task and reference.
4. Preserve each actual returned Intent and Miner, `cost_usd`, `duration_ms`, `signal_hash`, `X-TELEGRAPH-RECEIPT` and `PAYMENT-RESPONSE`.
5. Verify each signal using `GET /engine/v1/signal/{signal_hash}`.
6. Persist every completed step immediately, so a later failure does not erase earlier paid evidence.

Each payment challenge is inspected before the x402 SDK signs it. `MAX_REQUEST_USD` is the per-request ceiling. Three calls at a $0.02 ceiling create a maximum configured run exposure of $0.06, excluding gas. A daily spend ceiling is also enforced. Actual prices are read from each live 402 challenge, not assumed.

## API routes

- `GET /api/health` — server configuration status, without secrets
- `GET /api/intents` — live Intent catalogue
- `GET /api/intents/CODE_GENERATION` — live schema for one Intent
- `GET /api/miners?intent=CODE_GENERATION` — current Miner availability
- `GET /api/readiness` — schema and Miner-coverage checks for the three required Intents
- `GET /api/history` — recent runs, including partial runs
- `GET /api/leaderboard` — observed provider economics, with limitations stated
- `GET /api/signals?hash=0x...` — signal lookup
- `POST /api/procure` with `{ "task": "..." }` — performs the three paid requests

## Required live verification

Use the canonical testnet node:

`https://devnode.telegraphprotocol.com`

The official docs identify these endpoints:

```bash
curl https://devnode.telegraphprotocol.com/engine/v1/intents
curl https://devnode.telegraphprotocol.com/engine/v1/intents/CODE_GENERATION
curl 'https://devnode.telegraphprotocol.com/api/miners?intent=CODE_GENERATION'
curl https://devnode.telegraphprotocol.com/engine/v1/intents/QUESTION_ANSWERING
curl 'https://devnode.telegraphprotocol.com/api/miners?intent=QUESTION_ANSWERING'
curl https://devnode.telegraphprotocol.com/engine/v1/intents/LLM_OUTPUT_EVALUATION
curl 'https://devnode.telegraphprotocol.com/api/miners?intent=LLM_OUTPUT_EVALUATION'
```

Do not infer live Miner availability from the marketing page. The live catalogue is authoritative. The Engine may auto-route a natural-language query to another Intent; inspect the returned `intent` and mark mismatches as non-qualifying until the request is corrected to use the exact canonical schema.

## Hackathon acceptance work still required

- Run the three actual paid calls on Sepolia and verify the exact returned Intent for each.
- Verify that every paid response includes the expected Telegraph receipt and that each signal lookup is reproducible.
- Build task-specific gold tests and an isolated execution runner with no network, CPU/memory/time limits and disposable filesystem.
- Only compute cost per verified correct answer when the deterministic test suite passes; display benchmark coverage and sample count.
- Add user authentication, per-user wallet authorization, public-route protection, rate limiting and monitoring before any public deployment.
- Add automated tests for over-budget 402 challenges, unsupported payment networks, missing receipts, signal lookup failures, no compatible Miner, partial runs and successful three-call procurement.
- Capture a 2–5 minute demo with real testnet evidence and provide judge-friendly reproduction instructions.

## Production deployment checklist

Before publishing to GitHub or deploying publicly, complete the following:

1. Move all secrets to a real secret manager (Azure Key Vault, Vercel Secrets, Docker secrets, or the host secret vault).
2. Use separate production and test configuration. Never reuse `.env.local` or development database credentials in production.
3. Set `NODE_ENV=production`, `ALLOW_DEMO_AUTH=false`, and a strong `AUTH_SECRET`.
4. Configure a production-grade PostgreSQL database and keep it separate from local/dev data.
5. Replace the in-memory rate limiter with a distributed limiter if the app is exposed publicly or scaled horizontally.
6. Confirm all wallet actions require authenticated users and that wallet authorization is tied to the signed-in account.
7. Keep `MAX_REQUEST_USD` and `MAX_DAILY_SPEND_USD` conservative, and never allow a wallet containing real funds to be used for the app.
8. Use monitored logs, health checks, and alerting, but never log private keys, raw wallet payloads, or auth tokens.
9. Only publish a public repo after removing any internal values, private wallets, local addresses, or environment files with secrets.
10. Keep the public UI free of internal details and wallet metadata; display status only, not private config.

A production example environment file is available at `.env.production.example`; copy it to a secure host-managed configuration and fill in real values without committing them.

## Security

The private key is server-side only. `.env.local` and `.env.production` are gitignored and must never be committed. Use a dedicated test wallet and low limits. Do not expose the procurement API publicly before adding authentication and per-user authorization. The testnet wallet must not contain valuable assets.

## Official references

- Hackathon: https://hackathon.telegraphprotocol.com/
- Official rules: https://hackathon.telegraphprotocol.com/rules
- Model Economy mission: https://hackathon.telegraphprotocol.com/missions/model-economy
- Start Here: https://docs.telegraphprotocol.com/docs/using/consume-intelligence
- x402 payments and receipts: https://docs.telegraphprotocol.com/docs/using/x402-inference
- Engine API: https://docs.telegraphprotocol.com/docs/using/engine-ask
