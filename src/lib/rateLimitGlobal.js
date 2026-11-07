/**
 * Rate limiter with optional Upstash Redis backend.
 * Falls back to in-process sliding window (rateLimit.js) when Upstash is not configured.
 *
 * In-process fallback is sufficient for single-region Vercel deployments with low traffic.
 * Add Upstash env vars later if cross-instance accuracy becomes important.
 *
 * Usage:
 *   const { allowed } = await globalRateLimit(`ocr:${user.id}`, { limit: 20, windowSec: 3600 });
 *   if (!allowed) return Response.json({ error: 'Túl sok kérés.' }, { status: 429 });
 *
 * Optional env vars (Upstash backend):
 *   UPSTASH_REDIS_REST_URL=
 *   UPSTASH_REDIS_REST_TOKEN=
 */

import { rateLimit } from '@/lib/rateLimit';

let _ratelimiter = null;

async function getUpstashLimiter() {
  if (_ratelimiter) return _ratelimiter;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis }      = await import('@upstash/redis');
    const { Ratelimit }  = await import('@upstash/ratelimit');
    _ratelimiter = { Redis, Ratelimit, redis: new Redis({ url, token }) };
    return _ratelimiter;
  } catch (err) {
    console.warn('[rateLimitGlobal] failed to load @upstash packages:', err.message);
    return null;
  }
}

/**
 * @param {string} key       - Unique rate-limit key (e.g. "ocr:userId", "contact:ip")
 * @param {{ limit: number, windowSec: number }} opts
 * @returns {Promise<{ allowed: boolean, remaining: number }>}
 */
export async function globalRateLimit(key, { limit = 10, windowSec = 3600 } = {}) {
  const ctx = await getUpstashLimiter();

  if (!ctx) {
    // In-process fallback — resets on cold start but enforces within a single instance
    return rateLimit(key, { limit, windowMs: windowSec * 1000 });
  }

  try {
    const limiter = new ctx.Ratelimit({
      redis:    ctx.redis,
      limiter:  ctx.Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix:   'epitek_rl',
    });

    const { success, remaining } = await limiter.limit(key);
    return { allowed: success, remaining: remaining ?? 0 };
  } catch (err) {
    console.warn('[rateLimitGlobal] Upstash error — falling back to in-process:', err.message);
    return rateLimit(key, { limit, windowMs: windowSec * 1000 });
  }
}
