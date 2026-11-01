# Public-safe repo checklist

Use this before pushing to GitHub or deploying publicly.

## Security and secrets
- [ ] Remove all local `.env*` files from the repo and keep only safe templates such as `.env.example` and `.env.production.example`.
- [ ] Confirm `.gitignore` excludes `.env`, `.env.*`, local DB files, wallet JSON files, private keys, and secret directories.
- [ ] Store real secrets in the host secret manager: Vercel Environment Variables, Azure Key Vault, Docker secrets, or a managed secret store.
- [ ] Ensure no private keys, wallet addresses, RPC auth tokens, API tokens, admin credentials, or testnet funds metadata are committed anywhere.
- [ ] Verify no plaintext session tokens, cookies, or auth material appear in logs or source files.

## App hardening
- [ ] Authentication is enabled for wallet and procurement actions.
- [ ] Wallet authorization is per user, not global.
- [ ] Production and test environment values are separate.
- [ ] Rate limiting and request throttling are enabled for public routes.
- [ ] Logging is redacted and never exposes keys, tokens, or full user payloads.
- [ ] Health and status endpoints reveal no private or internal configuration.
- [ ] Security headers are enabled and the app is configured for public browser use.

## UI and public exposure
- [ ] Remove internal labels, debug data, and private configuration values from the public dashboard.
- [ ] Keep only safe status indicators like wallet-ready, network, and operation status.
- [ ] Avoid exposing internal wallet metadata, transaction payloads, RPC URLs, or proprietary identifiers in the UI.
- [ ] Ensure sign-in/sign-up flows are clean, obvious, and user-friendly for demo/presentation use.

## Deployment and hosting
- [ ] Use a dedicated production database and separate production secrets.
- [ ] Set `NODE_ENV=production` and keep `ALLOW_DEMO_AUTH=false`.
- [ ] Configure a conservative spend cap for x402 and a dedicated Sepolia test wallet only.
- [ ] Confirm the deployed app uses hosted secrets and not committed environment files.
- [ ] Keep the repo public-safe and avoid including any demo wallet or local infrastructure details.

## Final GitHub prep
- [ ] Run a final local build before pushing.
- [ ] Ensure the repo contains only source, templates, and deployment config that is safe for publication.
- [ ] Review commit history for accidental secrets or local config.
- [ ] Verify the README and docs do not mention private internal values.
- [ ] Keep the project description and screenshots aligned with the final public-ready product.
