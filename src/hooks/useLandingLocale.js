'use client';

import { useState, useEffect, useCallback } from 'react';

const VALID = ['hu', 'de', 'en'];

function detect() {
  if (typeof document === 'undefined') return 'hu';
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (m && VALID.includes(m[1])) return m[1];
  return 'hu';
}

export function useLandingLocale() {
  const [locale, setLocaleState] = useState('hu');
  useEffect(() => { setLocaleState(detect()); }, []);

  const setLocale = useCallback((loc) => {
    if (!VALID.includes(loc)) return;
    document.cookie = `NEXT_LOCALE=${loc};path=/;max-age=31536000;SameSite=Lax`;
    setLocaleState(loc);
  }, []);

  return [locale, setLocale];
}
