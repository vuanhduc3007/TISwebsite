export type RateLimitStorage = {
  increment: (scope: string, hash: string, windowStart: Date, expiresAt: Date) => Promise<void>;
  count: (scope: string, hash: string, windowStart: Date) => Promise<number | undefined>;
  prune: () => Promise<void>;
};

export async function consumeFixedWindow(
  storage: RateLimitStorage, scope: string, keyHash: string, limit: number, windowSeconds: number, now = Date.now()
) {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Invalid rate limit configuration.");
  }
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + windowMs * 2);
  await storage.increment(scope, keyHash, windowStart, expiresAt);
  const count = await storage.count(scope, keyHash, windowStart);
  await storage.prune().catch(() => undefined);
  return {
    allowed: (count ?? limit + 1) <= limit,
    retryAfter: Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000))
  };
}
