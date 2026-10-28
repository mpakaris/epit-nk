const BASE = process.env.TEST_APP_URL || 'http://localhost:3000'

/**
 * Makes an authenticated HTTP request to the running dev server.
 *
 * @param {string} method  GET | POST | PATCH | DELETE
 * @param {string} path    e.g. '/api/surveys'
 * @param {object|null} body  JSON body (omit for GET/DELETE)
 * @param {string} cookie  Cookie header string from signIn()
 * @returns {{ status: number, body: any }}
 */
export async function api(method, path, body, cookie, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  if (cookie) headers['Cookie'] = cookie

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  let json = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    json = await res.json().catch(() => null)
  }

  return { status: res.status, body: json }
}
