/**
 * Signs in a test user and returns a Cookie header string ready to pass
 * to fetch(). Sessions are cached per email for the duration of the process.
 *
 * Cookie format mirrors @supabase/ssr v0.12 exactly: raw JSON session,
 * chunked at 3180 URL-encoded chars under key sb-{ref}-auth-token[.N].
 */

const MAX_CHUNK = 3180
const cache = {}

function buildCookieHeader(cookieName, sessionJson) {
  const encoded = encodeURIComponent(sessionJson)
  if (encoded.length <= MAX_CHUNK) {
    return `${cookieName}=${sessionJson}`
  }
  const chunks = []
  let remaining = encoded
  let idx = 0
  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_CHUNK)
    const lastEsc = head.lastIndexOf('%')
    if (lastEsc > MAX_CHUNK - 3) head = head.slice(0, lastEsc)
    let decoded = ''
    while (head.length > 0) {
      try { decoded = decodeURIComponent(head); break }
      catch { head = head.slice(0, head.length - 3) }
    }
    chunks.push({ name: `${cookieName}.${idx}`, value: decoded })
    remaining = remaining.slice(encodeURIComponent(decoded).length)
    idx++
  }
  return chunks.map(c => `${c.name}=${c.value}`).join('; ')
}

export async function signIn(email, password) {
  if (cache[email]) return cache[email]

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Auth failed for ${email}: ${await res.text()}`)

  const session = await res.json()
  const ref = new URL(url).hostname.split('.')[0]
  const cookie = buildCookieHeader(`sb-${ref}-auth-token`, JSON.stringify(session))

  cache[email] = { cookie, userId: session.user.id }
  return cache[email]
}
