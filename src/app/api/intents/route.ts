import { NextResponse } from "next/server";
import { discoverIntents } from "@/lib/telegraph";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await discoverIntents()); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 502 }); }
}
