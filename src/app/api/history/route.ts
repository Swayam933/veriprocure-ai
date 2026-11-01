import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const items = await prisma.procurementRun.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
