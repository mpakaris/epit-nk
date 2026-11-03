import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';

// Build flat first-segment → { locale, canonicalPath } lookup from pathnames
const slugMap = {};
for (const [canonical, localeMap] of Object.entries(routing.pathnames)) {
  if (typeof localeMap === 'string') continue; // same path for all locales (e.g. /dashboard)
  for (const [locale, localizedPath] of Object.entries(localeMap)) {
    if (locale === routing.defaultLocale) continue; // HU paths are canonical, no lookup needed
    // First segment of the localized path (strip leading slash)
    const firstSeg = localizedPath.split('/')[1];
    if (firstSeg && !firstSeg.startsWith('[')) {
      slugMap[firstSeg] = { locale, canonical };
    }
  }
}

function getLocaleFromRequest(request) {
  const { pathname } = request.nextUrl;
  const firstSeg = pathname.split('/')[1];

  // 1. Slug map: non-HU localized first segment
  if (firstSeg && slugMap[firstSeg]) {
    return { locale: slugMap[firstSeg].locale, fromSlug: true, canonical: slugMap[firstSeg].canonical };
  }

  // 2. NEXT_LOCALE cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale)) {
    return { locale: cookieLocale, fromSlug: false };
  }

  // 3. Accept-Language header
  const acceptLang = request.headers.get('accept-language') || '';
  for (const part of acceptLang.split(',')) {
    const lang = part.trim().split(';')[0].split('-')[0].toLowerCase();
    if (routing.locales.includes(lang)) {
      return { locale: lang, fromSlug: false };
    }
  }

  // 4. Default
  return { locale: routing.defaultLocale, fromSlug: false };
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const { locale, fromSlug, canonical } = getLocaleFromRequest(request);

  let internalPath;
  if (fromSlug) {
    // Replace the localized first segment with the canonical segment
    // e.g. /angebote/123 → /ajanlatok/123
    const rest = pathname.split('/').slice(2).join('/');
    const canonicalBase = canonical; // e.g. /ajanlatok
    internalPath = rest ? `${canonicalBase}/${rest}` : canonicalBase;
  } else {
    internalPath = pathname;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${internalPath}`;
  url.search = search;

  const response = NextResponse.rewrite(url);

  // Keep locale cookie in sync
  if (fromSlug) {
    response.cookies.set('NEXT_LOCALE', locale, { path: '/', sameSite: 'lax' });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|szakemberek|clients|p/|invitations|auth|login|change-password|impressum|adatkezeles|aszf|about|checkout-popup-success|portal|demo).*)',
  ],
};
