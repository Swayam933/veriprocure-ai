import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionForUser, createUserPasswordHash, setSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent, logError } from "@/lib/logger";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8).optional()
});

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rate = checkRateLimit(`auth-signup:${forwarded}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many account creation attempts. Please wait a moment and try again." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = signupSchema.parse(body);
    const normalizedEmail = parsed.email.toLowerCase();

    if (parsed.confirmPassword && parsed.confirmPassword !== parsed.password) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const { salt, hash } = createUserPasswordHash(parsed.password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: `${salt}:${hash}`,
        role: "user"
      }
    });

    const { token } = await createSessionForUser(user.id);
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role }
    });

    logEvent("user_signup", { userId: user.id, email: user.email });
    return setSessionCookie(response, token);
  } catch (error: any) {
    logError("auth_signup_failed", error);
    const message = error?.issues
      ? error.issues.map((issue: any) => issue.message).join("; ")
      : error.message || "Account creation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
