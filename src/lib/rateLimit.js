/**
 * Lightweight in-process rate limiter.
 * Works per-instance (sufficient for Vercel's single-region deployments).
 * Uses a sliding window approach with automatic cleanup.
 */

const windows = new Map(); // key → [timestamp, ...]

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const cutoff = now - windowMs;

  const hits = (windows.get(key) || []).filter(t => t > cutoff);
  hits.push(now);
  windows.set(key, hits);

  // Prevent memory growth — prune stale keys every ~1000 checks
  if (Math.random() < 0.001) {
    for (const [k, v] of windows) {
      if (v.every(t => t <= cutoff)) windows.delete(k);
    }
  }

  return { allowed: hits.length <= limit, remaining: Math.max(0, limit - hits.length) };
}

export function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
