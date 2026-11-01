import { Wallet } from "ethers";
import { appendFileSync, chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const wallet = Wallet.createRandom();
const envPath = ".env.local";
let current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const keyLine = current.match(/^EVM_PRIVATE_KEY=(.*)$/m);

if (keyLine && keyLine[1].trim()) {
  console.error(`${envPath} already contains a populated EVM_PRIVATE_KEY. Refusing to overwrite it.`);
  process.exit(1);
}

if (keyLine) {
  current = current.replace(/^EVM_PRIVATE_KEY=.*$/m, `EVM_PRIVATE_KEY=${wallet.privateKey}`);
  writeFileSync(envPath, current, { mode: 0o600 });
} else {
  const line = `\n# Dedicated Ethereum Sepolia test wallet generated locally\nEVM_PRIVATE_KEY=${wallet.privateKey}\n`;
  appendFileSync(envPath, line, { mode: 0o600 });
}
chmodSync(envPath, 0o600);

console.log("Created a dedicated wallet and saved its private key to .env.local.");
console.log(`Public address: ${wallet.address}`);
console.log("Keep .env.local private. Never paste your private key or seed phrase into chat.");
console.log("Next: fund this address with Sepolia ETH, then mint Telegraph test USDC as described in docs/WALLET_SETUP.md.");
