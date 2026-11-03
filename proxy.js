import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all paths that go through [locale], excluding:
     * - Next.js internals + static files
     * - API routes
     * - Routes outside [locale]: demo, szakemberek, clients/[id] portal,
     *   p/[token] diary share, invitations, auth, login, change-password,
     *   impressum, adatkezeles, aszf, about, checkout-popup-success, portal
     *
     * Note: "clients/" (with slash) is excluded so /clients/[id] (public portal)
     * is unaffected, but /clients (EN translation of /ugyfelek) still works.
     * Note: ".+" (not ".*") so the root "/" goes to src/app/page.js directly.
     */
    '/((?!_next|api|favicon\\.ico|demo|szakemberek|clients/|p/|invitations|auth|login|change-password|impressum|adatkezeles|aszf|about|checkout-popup-success|portal).+)',
  ],
};
