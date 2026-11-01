import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionForUser, ensureUserExists, setSessionCookie, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent, logError } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rate = checkRateLimit(`auth-login:${forwarded}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please wait a moment and try again." }, { status: 429 });
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const normalizedEmail = email.toLowerCase();

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = (await ensureUserExists()) ?? null;
      if (!user || user.email !== normalizedEmail) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
    }

    const [salt, storedHash] = user.passwordHash.split(":");
    if (!salt || !storedHash || !verifyPassword(password, salt, storedHash)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const { token } = await createSessionForUser(user.id);
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role }
    });

    logEvent("user_login", { userId: user.id, email: user.email });
    return setSessionCookie(response, token);
  } catch (error: any) {
    logError("auth_login_failed", error);
    const message = error?.issues ? error.issues.map((issue: any) => issue.message).join("; ") : error.message || "Login failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
