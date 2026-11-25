'use client';

import useMobile from '@/hooks/useMobile';
import ElofizetesPageMobile from './mobile/ElofizetesPageMobile';
import ElofizetesDesktop from './desktop/ElofizetesDesktop';

export default function ElofizetesPage() {
  const isMobile = useMobile();
  if (isMobile) return <ElofizetesPageMobile />;
  return <ElofizetesDesktop />;
}
