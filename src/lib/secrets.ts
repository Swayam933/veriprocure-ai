import fs from "node:fs";
import { resolveSecretEnv } from "@/lib/config";

export function getSecret(name: string, fallback?: string): string | undefined {
  return resolveSecretEnv(name, fallback);
}

export function readSecretFile(pathValue?: string): string | undefined {
  if (!pathValue) return undefined;
  try {
    if (fs.existsSync(pathValue)) {
      return fs.readFileSync(pathValue, "utf8").trim();
    }
  } catch {
    // ignore missing secret files for local/dev flows
  }
  return undefined;
}

export function getWalletKey(): string | undefined {
  return getSecret("EVM_PRIVATE_KEY") ?? readSecretFile(process.env.EVM_PRIVATE_KEY_FILE);
}
