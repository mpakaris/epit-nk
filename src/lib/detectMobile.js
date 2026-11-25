import { headers, cookies } from 'next/headers';

/**
 * Server-side mobile detection.
 * Priority order:
 *   1. `viewport` cookie (manual override — set by DeviceToggle or test tooling)
 *   2. `Sec-CH-UA-Mobile` hint (Chromium)
 *   3. User-Agent string fallback
 *
 * Returns true when the client is a mobile/tablet device.
 * Never call from client components.
 */
export async function detectMobile() {
  const cookieStore = await cookies();
  const override = cookieStore.get('viewport')?.value;
  if (override === 'mobile') return true;
  if (override === 'desktop') return false;

  const headerStore = await headers();
  const uaMobile = headerStore.get('sec-ch-ua-mobile');
  if (uaMobile === '?1') return true;
  if (uaMobile === '?0') return false;

  const ua = headerStore.get('user-agent') || '';
  return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}
