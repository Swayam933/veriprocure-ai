import { NextResponse } from "next/server";
import { getWalletStatus } from "@/lib/telegraph";
import { readWalletConfig } from "@/lib/wallet-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const wallet = await getWalletStatus();
  const saved = await readWalletConfig();
  const walletConfigured = Boolean(process.env.EVM_PRIVATE_KEY || saved?.privateKey);

  return NextResponse.json({
    ok: true,
    walletConfigured,
    walletConnected: Boolean(wallet && walletConfigured),
    network: "Sepolia testnet",
    provider: "Telegraph Protocol",
    status: walletConfigured ? "ready" : "needs-wallet"
  });
}
