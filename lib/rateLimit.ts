// Basic in-memory per-key rate limiter. Best-effort only: serverless instances
// don't share memory, so this caps abuse per warm instance rather than globally.
// Sufficient for V1 cost protection on the paid /api/rate and /api/transcribe
// routes; swap for a shared store (e.g. Upstash) if stricter limits are needed.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}
