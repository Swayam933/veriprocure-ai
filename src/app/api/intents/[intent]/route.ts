import { NextResponse } from "next/server";
import { discoverIntent } from "@/lib/telegraph";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ intent: string }> }) {
  try {
    const { intent } = await context.params;
    return NextResponse.json(await discoverIntent(intent));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
