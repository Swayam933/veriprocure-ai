import { promises as fs } from "node:fs";
import path from "node:path";

export type SavedWalletConfig = {
  address?: string;
  privateKey?: string;
  rpcUrl?: string;
  network?: string;
  usdcContractAddress?: string;
  updatedAt?: string;
};

const DEFAULT_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const DEFAULT_USDC_CONTRACT = "0xcc194e1a843B658526D0D5C431f670028582Ae17";
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), ".veriprocure-wallet.json");

function sanitizeAddress(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return /^0x[a-fA-F0-9]{40}$/i.test(normalized) ? normalized : undefined;
}

function sanitizePrivateKey(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  return /^0x[a-fA-F0-9]{64}$/i.test(normalized) ? normalized : undefined;
}

export function resolveWalletConfigPath(): string {
  return process.env.VERIPROCURE_WALLET_PATH || DEFAULT_CONFIG_PATH;
}

export async function readWalletConfig(): Promise<SavedWalletConfig | null> {
  const configPath = resolveWalletConfigPath();

  try {
    const content = await fs.readFile(configPath, "utf8");
    if (!content.trim()) return null;
    const parsed = JSON.parse(content) as SavedWalletConfig;
    if (!parsed || typeof parsed !== "object") return null;

    const address = sanitizeAddress(parsed.address);
    const privateKey = sanitizePrivateKey(parsed.privateKey);
    if (!address && !privateKey) return null;

    return {
      address: address ?? parsed.address,
      privateKey,
      rpcUrl: parsed.rpcUrl || DEFAULT_RPC_URL,
      network: parsed.network || "Ethereum Sepolia testnet",
      usdcContractAddress: parsed.usdcContractAddress || DEFAULT_USDC_CONTRACT,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export async function writeWalletConfig(input: Partial<SavedWalletConfig>): Promise<SavedWalletConfig> {
  const configPath = resolveWalletConfigPath();
  const address = sanitizeAddress(input.address);
  const privateKey = sanitizePrivateKey(input.privateKey);

  if (!address || !privateKey) {
    throw new Error("A valid Sepolia wallet address and private key are required.");
  }

  const next: SavedWalletConfig = {
    address,
    privateKey,
    rpcUrl: input.rpcUrl || DEFAULT_RPC_URL,
    network: input.network || "Ethereum Sepolia testnet",
    usdcContractAddress: input.usdcContractAddress || DEFAULT_USDC_CONTRACT,
    updatedAt: new Date().toISOString()
  };

  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(next, null, 2), { mode: 0o600, encoding: "utf8" });
  return next;
}

export async function clearWalletConfig(): Promise<void> {
  const configPath = resolveWalletConfigPath();
  try {
    await fs.unlink(configPath);
  } catch {
    // no-op if the file does not exist
  }
}

export function getConfiguredWalletPrivateKey(): string | undefined {
  return process.env.EVM_PRIVATE_KEY || undefined;
}

export function getConfiguredWalletAddress(): string | undefined {
  if (process.env.EVM_PRIVATE_KEY) {
    try {
      const { privateKeyToAccount } = require("viem/accounts");
      return privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`).address;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
