const SENSITIVE_KEYS = /password|secret|token|private|key/i;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 12 && value.startsWith("0x") ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEYS.test(k) ? "[REDACTED]" : redactValue(v)
      ])
    );
  }
  return value;
}

export function logEvent(event: string, metadata: Record<string, any> = {}) {
  if (typeof console !== "undefined") {
    const payload = {
      timestamp: new Date().toISOString(),
      event,
      metadata: redactValue(metadata)
    };
    console.info(JSON.stringify(payload));
  }
}

export function logError(event: string, error: unknown, metadata: Record<string, any> = {}) {
  if (typeof console !== "undefined") {
    const payload = {
      timestamp: new Date().toISOString(),
      level: "error",
      event,
      message: error instanceof Error ? error.message : String(error),
      metadata: redactValue(metadata)
    };
    console.error(JSON.stringify(payload));
  }
}
