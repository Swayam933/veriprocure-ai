import { NextResponse } from "next/server";
import { discoverMiners } from "@/lib/telegraph";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get("intent") || undefined;
    return NextResponse.json(await discoverMiners(intent));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
