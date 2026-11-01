type RateEntry = { timestamps: number[] };

const buckets = new Map<string, RateEntry>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key) ?? { timestamps: [] };
  const valid = entry.timestamps.filter((ts) => now - ts < windowMs);
  valid.push(now);
  buckets.set(key, { timestamps: valid });

  const allowed = valid.length <= maxRequests;
  const resetAt = valid.length > 0 ? valid[0] + windowMs : now + windowMs;

  return {
    allowed,
    retryAfterMs: allowed ? 0 : Math.max(0, resetAt - now),
    remaining: Math.max(0, maxRequests - valid.length),
    limit: maxRequests,
    windowMs
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
