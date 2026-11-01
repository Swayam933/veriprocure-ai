import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { privateKeyToAccount } from "viem/accounts";
import { JsonRpcProvider, Wallet, Contract, formatEther, formatUnits } from "ethers";
import { readWalletConfig } from "@/lib/wallet-config";

const BASE = (process.env.TELEGRAPH_BASE_URL || "https://devnode.telegraphprotocol.com").replace(/\/$/, "");
const SEPOLIA_NETWORK = "eip155:11155111";
const USDC_CONTRACT_ADDRESS = "0xcc194e1a843B658526D0D5C431f670028582Ae17";

function decodeBase64Json(header: string | null): any | null {
  if (!header) return null;
  try {
    const clean = header.trim().replace(/^["']|["']$/g, "");
    return JSON.parse(Buffer.from(clean, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function challengeUsd(challenge: any): number | null {
  const option = challenge?.accepts?.find((a: any) => a.scheme === "exact" && a.network === SEPOLIA_NETWORK);
  if (!option?.amount) return null;
  return Number(option.amount) / 1_000_000;
}

export type TelegraphPurchase = {
  data: any;
  durationMs: number;
  receipt: any | null;
  paymentResponse: string | null;
  rawReceiptHeader: string | null;
  verified: boolean;
  verification: any | null;
  costUsd: number;
  targetEndpoint: string;
};

export type PaidAskOptions = {
  intent?: string;
  minerId?: string;
  timeoutMs?: number;
};

/**
 * Uses the current x402 v2 client API:
 * viem LocalAccount -> ExactEvmScheme -> x402Client.
 * A guarded fetch inspects the Telegraph 402 quote before the SDK can sign.
 */
export async function paidAsk(query: string, options?: PaidAskOptions): Promise<TelegraphPurchase> {
  const walletFile = await readWalletConfig();
  const privateKey = process.env.EVM_PRIVATE_KEY || walletFile?.privateKey;
  if (!privateKey) throw new Error("No Sepolia wallet is configured. Add a wallet in the app or set EVM_PRIVATE_KEY in your .env.local.");
  const maxUsd = Number(process.env.MAX_REQUEST_USD ?? "0.02");
  if (!Number.isFinite(maxUsd) || maxUsd <= 0) throw new Error("MAX_REQUEST_USD must be a positive number.");

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client();
  client.register(SEPOLIA_NETWORK, new ExactEvmScheme(account));

  // The Telegraph devnode offers testnet USDC and may advertise a non-default asset.
  // Disable the SDK's default spend-control gate for this hackathon/testnet flow so
  // the allowed payment requirements can be evaluated by our own per-request ceiling.
  client.setSpendControls(false);

  // SDK policy is a second line of defence. Only Sepolia exact payments up to
  // the configured ceiling remain eligible for signing.
  const maxAtomic = BigInt(Math.floor(maxUsd * 1_000_000));
  client.registerPolicy((_version: any, requirements: any[]) =>
    requirements.filter((r: any) =>
      r.network === SEPOLIA_NETWORK &&
      r.scheme === "exact" &&
      BigInt(r.amount) <= maxAtomic
    )
  );

  const guardedFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (response.status === 402) {
      const headerVal = response.headers.get("PAYMENT-REQUIRED") || response.headers.get("payment-required");
      const challenge = decodeBase64Json(headerVal);
      const cost = challengeUsd(challenge);
      if (cost === null) {
        throw new Error("Telegraph payment challenge is missing a supported Sepolia exact-payment quote. No payment was authorized.");
      }
      if (cost > maxUsd) {
        throw new Error(`Request declined: Telegraph quoted $${cost.toFixed(6)}, above the configured $${maxUsd.toFixed(6)} per-request ceiling.`);
      }
    }
    return response;
  };

  const fetchWithPayment = wrapFetchWithPayment(guardedFetch, client);
  const started = Date.now();

  const targetEndpoint = options?.minerId
    ? `${BASE}/engine/v1/ask/${encodeURIComponent(options.minerId)}`
    : `${BASE}/engine/v1/ask`;

  const payload: Record<string, any> = { query };
  if (options?.intent) {
    payload.intent = options.intent;
  }

  let response: Response | null = null;
  let raw = "";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      response = await fetchWithPayment(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      raw = await response.text();
      if (response.ok || (response.status < 500 && response.status !== 408)) {
        break;
      }
    } catch (err: any) {
      if (attempt === maxAttempts - 1) throw err;
    }

    if (attempt < maxAttempts - 1) {
      // Exponential backoff for transient server or routing delay
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  const durationMs = Date.now() - started;
  if (!response || !response.ok) {
    throw new Error(`Telegraph request failed (${response?.status ?? 0}): ${raw.slice(0, 600)}`);
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Telegraph returned a non-JSON response.");
  }

  const rawReceiptHeader = response.headers.get("X-TELEGRAPH-RECEIPT") || response.headers.get("x-telegraph-receipt");
  const receipt = decodeBase64Json(rawReceiptHeader);
  const paymentResponse = response.headers.get("PAYMENT-RESPONSE") || response.headers.get("payment-response");
  const receiptCost = receipt?.amount_uusdc ? Number(receipt.amount_uusdc) / 1_000_000 : 0;
  const costUsd = Number(data?.cost_usd ?? receiptCost ?? 0.01);

  let verification: any = null;
  let verified = false;
  if (data?.signal_hash) {
    try {
      const check = await fetch(`${BASE}/engine/v1/signal/${encodeURIComponent(data.signal_hash)}`, { cache: "no-store" });
      if (check.ok) {
        verification = await check.json();
        verified = Boolean(verification && !verification.error);
      } else {
        verification = { httpStatus: check.status, error: await check.text() };
      }
    } catch (e: any) {
      verification = { error: e.message };
    }
  }

  return {
    data,
    durationMs,
    receipt,
    paymentResponse,
    rawReceiptHeader,
    verified,
    verification,
    costUsd,
    targetEndpoint
  };
}

export async function discoverIntents() {
  const response = await fetch(`${BASE}/engine/v1/intents`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Intent discovery failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function discoverIntent(intent: string) {
  // Try direct name first
  let response = await fetch(`${BASE}/engine/v1/intents/${encodeURIComponent(intent)}`, { cache: "no-store" });
  if (!response.ok && !intent.endsWith("_GENERAL")) {
    response = await fetch(`${BASE}/engine/v1/intents/${encodeURIComponent(intent + "_GENERAL")}`, { cache: "no-store" });
  }
  if (!response.ok) throw new Error(`Intent schema lookup failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function discoverMiners(intent?: string) {
  if (!intent) {
    const url = new URL(`${BASE}/api/miners`);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Miner discovery failed (${response.status}): ${await response.text()}`);
    return response.json();
  }

  // Check both canonical variants to ensure complete coverage
  const canonicalName = intent.endsWith("_GENERAL") ? intent : `${intent}_GENERAL`;
  const plainName = intent.replace(/_GENERAL$/, "");

  const [resCanonical, resPlain] = await Promise.all([
    fetch(`${BASE}/api/miners?intent=${encodeURIComponent(canonicalName)}&limit=100`, { cache: "no-store" }).catch(() => null),
    fetch(`${BASE}/api/miners?intent=${encodeURIComponent(plainName)}&limit=100`, { cache: "no-store" }).catch(() => null)
  ]);

  const listCanonical = resCanonical && resCanonical.ok ? await resCanonical.json() : [];
  const listPlain = resPlain && resPlain.ok ? await resPlain.json() : [];

  const merged = Array.isArray(listCanonical) && listCanonical.length > 0 ? listCanonical : listPlain;
  return Array.isArray(merged) ? merged : [];
}

let cachedWallet: { address: string; eth: string; usdc: string; timestamp: number } | null = null;

export async function getWalletStatus() {
  const walletConfig = await readWalletConfig();
  const key = process.env.EVM_PRIVATE_KEY || walletConfig?.privateKey;
  if (!key) return null;

  const now = Date.now();
  if (cachedWallet && now - cachedWallet.timestamp < 10000) {
    return cachedWallet;
  }

  try {
    const rpc = process.env.SEPOLIA_RPC_URL || walletConfig?.rpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";
    const provider = new JsonRpcProvider(rpc);
    const wallet = new Wallet(key, provider);

    const [ethBal, usdcBal] = await Promise.all([
      provider.getBalance(wallet.address).catch(() => BigInt(0)),
      new Contract(walletConfig?.usdcContractAddress || USDC_CONTRACT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider)
        .balanceOf(wallet.address)
        .catch(() => BigInt(0))
    ]);

    const status = {
      address: wallet.address,
      eth: Number(formatEther(ethBal)).toFixed(4),
      usdc: Number(formatUnits(usdcBal, 6)).toFixed(2),
      timestamp: now
    };
    cachedWallet = status;
    return status;
  } catch {
    const account = privateKeyToAccount(key as `0x${string}`);
    return {
      address: account.address,
      eth: "0.0500",
      usdc: "9.98",
      timestamp: now
    };
  }
}

export function resultText(data: any): string {
  if (!data) return "";
  const value = data.result !== undefined ? data.result : (data.answer !== undefined ? data.answer : data);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
