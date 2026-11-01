import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  return NextResponse.json({
    ok: true,
    authenticated: Boolean(user),
    user: user ? { id: user.id, email: user.email, role: user.role } : null
  });
}
