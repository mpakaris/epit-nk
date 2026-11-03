import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hu', 'de', 'en'],
  defaultLocale: 'hu',
  localePrefix: 'never',
  pathnames: {
    '/dashboard': '/dashboard',

    '/ajanlatok': { hu: '/ajanlatok', de: '/angebote', en: '/offers' },
    '/ajanlatok/uj': { hu: '/ajanlatok/uj', de: '/angebote/neu', en: '/offers/new' },
    '/ajanlatok/[id]': { hu: '/ajanlatok/[id]', de: '/angebote/[id]', en: '/offers/[id]' },

    '/felmeres': { hu: '/felmeres', de: '/aufmass', en: '/surveys' },
    '/felmeres/[id]': { hu: '/felmeres/[id]', de: '/aufmass/[id]', en: '/surveys/[id]' },

    '/projektek': { hu: '/projektek', de: '/projekte', en: '/projects' },
    '/projektek/[id]': { hu: '/projektek/[id]', de: '/projekte/[id]', en: '/projects/[id]' },

    '/ugyfelek': { hu: '/ugyfelek', de: '/kunden', en: '/customers' },
    '/ugyfelek/[id]': { hu: '/ugyfelek/[id]', de: '/kunden/[id]', en: '/customers/[id]' },

    '/naptar': { hu: '/naptar', de: '/kalender', en: '/calendar' },
    '/naplo': { hu: '/naplo', de: '/tagebuch', en: '/diary' },
    '/naplo/[id]': { hu: '/naplo/[id]', de: '/tagebuch/[id]', en: '/diary/[id]' },

    '/weboldalam': { hu: '/weboldalam', de: '/meine-website', en: '/my-website' },
    '/otletek': { hu: '/otletek', de: '/ideen', en: '/ideas' },
    '/kollektivak': { hu: '/kollektivak', de: '/kollektive', en: '/collectives' },

    '/profil': { hu: '/profil', de: '/profil', en: '/profile' },
    '/elofizetes': { hu: '/elofizetes', de: '/abonnement', en: '/subscription' },
    '/katalogus': { hu: '/katalogus', de: '/katalog', en: '/catalogue' },
    '/osszes': { hu: '/osszes', de: '/alle', en: '/all' },
  },
});
