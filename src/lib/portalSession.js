import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE  = 'portal_session';
const MAX_MS  = 48 * 60 * 60 * 1000; // 48h

function secret() { return process.env.PORTAL_SESSION_SECRET || ''; }

function sign(payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac  = createHmac('sha256', secret()).update(b64).digest('hex');
  return `${b64}.${mac}`;
}

function verify(token) {
  if (!secret()) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const b64      = token.slice(0, dot);
  const mac      = token.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(b64).digest('hex');
  try {
    const a = Buffer.from(mac, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch { return null; }
  let payload;
  try { payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload?.email || !payload?.iat) return null;
  if (Date.now() - payload.iat > MAX_MS) return null;
  return payload;
}

export async function getPortalSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export function buildSessionCookie(email) {
  const token  = sign({ email: email.toLowerCase(), iat: Date.now() });
  const maxAge = Math.floor(MAX_MS / 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
