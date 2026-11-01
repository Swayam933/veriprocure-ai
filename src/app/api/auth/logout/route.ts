import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUserFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const response = NextResponse.json({ ok: true, loggedOut: true });

  if (user) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.session.deleteMany({ where: { userId: user.id } });
  }

  return clearSessionCookie(response);
}
