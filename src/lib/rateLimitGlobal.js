/**
 * Production-grade rate limiter backed by Upstash Redis.
 * Works across all Vercel serverless instances (unlike the in-process rateLimit.js).
 *
 * Graceful degradation: if Upstash is unreachable or not configured, the request
 * is allowed through with a console warning. Rate limiting is defence-in-depth;
 * endpoint availability takes priority over perfect enforcement.
 *
 * Usage:
 *   const { allowed } = await globalRateLimit(`ocr:${user.id}`, { limit: 20, windowSec: 3600 });
 *   if (!allowed) return Response.json({ error: 'Túl sok kérés.' }, { status: 429 });
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL=
 *   UPSTASH_REDIS_REST_TOKEN=
 */

let _ratelimiter = null;

async function getRatelimiter() {
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
  const ctx = await getRatelimiter();
  if (!ctx) {
    console.warn('[rateLimitGlobal] Upstash not configured — allowing request');
    return { allowed: true, remaining: limit };
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
    console.warn('[rateLimitGlobal] Upstash error — allowing request:', err.message);
    return { allowed: true, remaining: limit };
  }
}
