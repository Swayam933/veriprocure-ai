import { NextResponse } from "next/server";
import { z } from "zod";
import { clearWalletConfig, readWalletConfig, writeWalletConfig } from "@/lib/wallet-config";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const walletSchema = z.object({
  address: z.string().trim().min(1),
  privateKey: z.string().trim().min(1),
  rpcUrl: z.string().trim().url().optional().or(z.literal("")),
  network: z.string().trim().optional(),
  usdcContractAddress: z.string().trim().optional()
});

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      configured: false,
      source: "none",
      network: "Sepolia",
      provider: "Telegraph Protocol",
      authorizedWallets: 0,
      message: "Sign in to configure a Sepolia wallet."
    });
  }

  const saved = await readWalletConfig();
  const authorized = await prisma.walletAuthorization.findFirst({ where: { userId: user.id } });

  return NextResponse.json({
    ok: true,
    authenticated: true,
    configured: Boolean(process.env.EVM_PRIVATE_KEY || saved?.privateKey || authorized),
    source: process.env.EVM_PRIVATE_KEY ? "environment" : saved ? "server-config" : "none",
    network: "Sepolia",
    provider: "Telegraph Protocol",
    authorizedWallets: authorized ? 1 : 0
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rate = checkRateLimit(`wallet:${forwarded}:${user.id}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Too many wallet updates. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.` }, { status: 429 });
    }

    const body = await request.json();
    const parsed = walletSchema.parse(body);
    const normalizedAddress = parsed.address.trim();

    const saved = await writeWalletConfig({
      address: normalizedAddress,
      privateKey: parsed.privateKey,
      rpcUrl: parsed.rpcUrl || undefined,
      network: parsed.network || "Ethereum Sepolia testnet",
      usdcContractAddress: parsed.usdcContractAddress || undefined
    });

    await prisma.walletAuthorization.upsert({
      where: { userId_address: { userId: user.id, address: normalizedAddress.toLowerCase() } },
      update: { label: parsed.network || "Sepolia" },
      create: { userId: user.id, address: normalizedAddress.toLowerCase(), label: parsed.network || "Sepolia" }
    });

    const walletAddress = saved.address ? saved.address.slice(0, 8) + "…" + saved.address.slice(-4) : "configured";
    logEvent("wallet_saved", { userId: user.id, address: walletAddress });

    return NextResponse.json({
      ok: true,
      message: "Sepolia wallet configuration saved successfully.",
      configured: Boolean(saved.address && saved.privateKey),
      source: "server-config"
    });
  } catch (error: any) {
    logError("wallet_save_failed", error);
    const message = error?.issues
      ? error.issues.map((issue: any) => issue.message).join("; ")
      : error.message || "Wallet configuration failed.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  await clearWalletConfig();
  await prisma.walletAuthorization.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, message: "Saved wallet configuration cleared." });
}
