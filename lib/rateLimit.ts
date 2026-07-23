// Rate limiter for the paid/storage routes (rate, transcribe, upload, sessions).
//
// Prefers a shared Upstash Redis store so limits hold *across* Vercel's
// ephemeral serverless instances — the in-memory version below only caps abuse
// per warm instance, so a burst that spins up new instances slips past it, and
// the routes it guards cost real money (AssemblyAI, Gemini, R2).
//
// Upstash is optional. Without UPSTASH_REDIS_REST_URL + _TOKEN (local dev,
// preview, CI) it falls back to the in-memory limiter, and if a configured
// Upstash call throws it falls back too — a Redis blip degrades to per-instance
// limiting rather than taking the route down.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

// --- In-memory fallback ------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
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

// --- Upstash (shared) --------------------------------------------------------

// One Ratelimit instance per (limit, window) pair; created lazily and reused so
// we don't rebuild sliding-window state on every request.
const limiters = new Map<string, Ratelimit>();
let redis: Redis | null | undefined; // undefined = not yet resolved, null = unconfigured

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "rl",
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// --- Public API --------------------------------------------------------------

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return rateLimitMemory(key, limit, windowMs);

  try {
    const { success, reset } = await limiter.limit(key);
    if (success) return { ok: true };
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfterSec };
  } catch (err) {
    // Never let a Redis problem block a legitimate request — fall back to the
    // per-instance limiter, which still provides some protection.
    console.error("Upstash rate limit failed, falling back to in-memory:", err);
    return rateLimitMemory(key, limit, windowMs);
  }
}
