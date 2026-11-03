'use client';

import { useParams } from 'next/navigation';
import LandingPage from '../page';

const VALID_LOCALES = ['hu', 'de', 'en'];

// This page is served when the middleware rewrites the root "/" to "/{locale}".
// Guard against the [locale] segment accidentally matching app paths
// (e.g. /ugyfelek, /kunden) when the client-side router resolves before
// the middleware rewrites to the two-segment form /{locale}/{path}.
export default function LocaleRootPage() {
  const { locale } = useParams();
  if (!VALID_LOCALES.includes(locale)) return null;
  return <LandingPage />;
}
