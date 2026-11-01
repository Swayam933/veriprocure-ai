import { Wallet, JsonRpcProvider, Contract, formatEther, formatUnits } from "ethers";
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
if (!key) {
  console.error("EVM_PRIVATE_KEY missing in .env.local");
  process.exit(1);
}

const rpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new JsonRpcProvider(rpc);
const wallet = new Wallet(key, provider);

console.log("Checking wallet:", wallet.address);
try {
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`Sepolia ETH: ${formatEther(ethBalance)} ETH`);

  const usdcContract = new Contract(
    "0xcc194e1a843B658526D0D5C431f670028582Ae17",
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  const usdcBalance = await usdcContract.balanceOf(wallet.address);
  console.log(`Telegraph Test USDC: ${formatUnits(usdcBalance, 6)} USDC`);
} catch (e) {
  console.error("Failed to query network:", e.message);
}

