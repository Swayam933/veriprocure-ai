# Dedicated Telegraph test wallet setup

Do this locally. Never send a private key, seed phrase, keystore password or recovery phrase to ChatGPT, GitHub, screenshots, or a teammate.

## 1. Generate a wallet

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
# Set POSTGRES_PASSWORD and MAX_REQUEST_USD before continuing
npm run wallet:create
```

This creates `.env.local` and stores the private key there. It prints only the public address. The script refuses to overwrite an existing `EVM_PRIVATE_KEY`.

## 2. Fund Sepolia ETH

Use a reputable Ethereum Sepolia faucet. Fund only the address printed by the wallet script. ETH is needed for gas when minting test USDC. Never use mainnet funds.

## 3. Mint Telegraph test USDC

After Sepolia ETH arrives:

```bash
npm run wallet:mint-usdc
```

This mints 10 test USDC from the Telegraph-documented Sepolia test token contract:

`0xcc194e1a843B658526D0D5C431f670028582Ae17`

The official docs show the same token and mint function. Check the transaction on a Sepolia explorer.

## 4. Configure spend limits

In `.env.local`:

```env
MAX_REQUEST_USD=0.02
MAX_DAILY_SPEND_USD=0.25
```

This is a per-request ceiling. VeriProcure performs three independent purchases, so the maximum configured exposure for one full run is $0.06 plus gas, assuming all three challenges are at or below the ceiling. Actual prices come from each live 402 challenge.

## 5. Safety

- Dedicated test wallet only.
- Do not fund with real assets.
- Do not commit `.env.local`.
- Do not set the key in `NEXT_PUBLIC_*`.
- Keep the spend ceiling low.
- Check the wallet balance and live challenge before testing.
