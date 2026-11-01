import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/lib/config";

const APP_CONFIG = getAppConfig();

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256");
  return { salt, hash: derived.toString("hex") };
}

export function createUserPasswordHash(password: string) {
  return hashPassword(password);
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

export function getSessionCookieName() {
  return APP_CONFIG.authCookieName;
}

export async function ensureUserExists() {
  const { adminEmail, adminPassword, allowDemoAuth } = APP_CONFIG;
  const existing = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (existing) return existing;

  if (!allowDemoAuth) return null;

  const { salt, hash } = hashPassword(adminPassword);
  return prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: `${salt}:${hash}`,
      role: "admin"
    }
  });
}

export function getCookieHeaderValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const [key, ...rest] = segment.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function getCurrentUserFromRequest(req: Request): Promise<SessionUser | null> {
  const cookieHeader = req.headers.get("cookie");
  const token = getCookieHeaderValue(cookieHeader, getSessionCookieName());
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: { tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: { gt: new Date() } },
    include: { user: true }
  });

  if (!session || !session.user || !session.user.isActive) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role
  };
}

export async function createSessionForUser(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + APP_CONFIG.sessionTtlMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function revokeSessionForUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.round(APP_CONFIG.sessionTtlMs / 1000)
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    throw new Error("Authentication required.");
  }
  return user;
}
