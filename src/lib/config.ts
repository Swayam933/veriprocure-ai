import fs from "node:fs";

export type AppConfig = {
  nodeEnv: string;
  authCookieName: string;
  authSecret: string;
  sessionTtlMs: number;
  rateLimitPerMinute: number;
  rateLimitBurst: number;
  allowDemoAuth: boolean;
  adminEmail: string;
  adminPassword: string;
  productionMode: boolean;
};

const defaultConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  authCookieName: process.env.AUTH_COOKIE_NAME || "veriprocure_session",
  authSecret: resolveSecretEnv("AUTH_SECRET", "veriprocure-dev-secret-change-me") ?? "veriprocure-dev-secret-change-me",
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8),
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 10),
  rateLimitBurst: Number(process.env.RATE_LIMIT_BURST || 20),
  allowDemoAuth: String(process.env.ALLOW_DEMO_AUTH ?? (process.env.NODE_ENV !== "production" ? "true" : "false")).toLowerCase() === "true",
  adminEmail: process.env.ADMIN_EMAIL || "admin@veriprocure.ai",
  adminPassword: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  productionMode: (process.env.NODE_ENV || "development") === "production"
};

export function getAppConfig(): AppConfig {
  const config: AppConfig = { ...defaultConfig };

  const secretFile = process.env.AUTH_SECRET_FILE;
  if (secretFile && fs.existsSync(secretFile)) {
    config.authSecret = fs.readFileSync(secretFile, "utf8").trim();
  }

  if (!config.authSecret) {
    config.authSecret = "veriprocure-dev-secret-change-me";
  }

  return config;
}

export function resolveSecretEnv(name: string, fallback?: string): string | undefined {
  const direct = process.env[name];
  if (direct && direct.trim()) return direct.trim();

  const fileEnv = process.env[`${name}_FILE`];
  if (fileEnv && fs.existsSync(fileEnv)) {
    return fs.readFileSync(fileEnv, "utf8").trim();
  }

  return fallback;
}

export function isProductionMode(): boolean {
  return (process.env.NODE_ENV || "development") === "production";
}
