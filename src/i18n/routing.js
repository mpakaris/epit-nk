import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hu', 'de', 'en'],
  defaultLocale: 'hu',
  localePrefix: 'never',
});
