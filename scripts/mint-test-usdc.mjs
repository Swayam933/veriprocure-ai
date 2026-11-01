import { Wallet, JsonRpcProvider, Contract, parseUnits } from "ethers";
import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnvFile(".env.local");

const key = process.env.EVM_PRIVATE_KEY;
if (!key) throw new Error("EVM_PRIVATE_KEY missing. Run npm run wallet:create first.");
const rpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new JsonRpcProvider(rpc);
const wallet = new Wallet(key, provider);
const token = new Contract(
  "0xcc194e1a843B658526D0D5C431f670028582Ae17",
  ["function mint(address to,uint256 amount)"],
  wallet
);
const amount = parseUnits("10", 6);
console.log(`Minting 10 test USDC to ${wallet.address} on Sepolia...`);
const tx = await token.mint(wallet.address, amount);
console.log(`Submitted: ${tx.hash}`);
const receipt = await tx.wait();
console.log(`Confirmed in block ${receipt.blockNumber}.`);
