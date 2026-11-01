import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  if (!hash || !/^0x[a-fA-F0-9]{16,}$/.test(hash)) {
    return NextResponse.json({ error: "A valid signal hash is required." }, { status: 400 });
  }
  const base = (process.env.TELEGRAPH_BASE_URL || "https://devnode.telegraphprotocol.com").replace(/\/$/, "");
  const response = await fetch(`${base}/engine/v1/signal/${encodeURIComponent(hash)}`, { cache: "no-store" });
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" } });
}
