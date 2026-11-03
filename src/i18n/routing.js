import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hu', 'de', 'en'],
  defaultLocale: 'hu',
  localePrefix: 'never',
  // Empty pathnames: all locales use the same URL path.
  // Locale is detected from the NEXT_LOCALE cookie; only content language changes.
  pathnames: {},
});
