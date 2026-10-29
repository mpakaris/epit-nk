/**
 * fetchJson — thin wrapper around fetch with consistent error handling.
 *
 * Throws an Error (with .message = server error string) on:
 *   - network failure
 *   - HTTP status >= 400  (parses { error } from JSON body if available)
 *
 * Usage:
 *   const data = await fetchJson('/api/foo', { method: 'POST', body: JSON.stringify(payload) });
 *
 * For POST/PATCH/PUT with a JSON body pass the body as a plain object and it
 * will be serialised automatically, or pass a pre-serialised string.
 */
export async function fetchJson(url, options = {}) {
  const { body, headers = {}, ...rest } = options;

  const isJsonBody = body !== null && body !== undefined && typeof body !== 'string';

  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : body,
  });

  let json;
  try { json = await res.json(); } catch { json = {}; }

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json;
}
