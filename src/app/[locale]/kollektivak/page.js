'use client';

import useMobile from '@/hooks/useMobile';
import KollektivakMobile from './mobile/KollektivakMobile';
import KollektivakDesktop from './desktop/KollektivakDesktop';

export default function KollektivakPage() {
  const isMobile = useMobile();
  if (isMobile) return <KollektivakMobile />;
  return <KollektivakDesktop />;
}
