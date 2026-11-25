'use client';

import useMobile from '@/hooks/useMobile';
import SablonokMobile from './mobile/SablonokMobile';
import SablonokDesktop from './desktop/SablonokDesktop';

export default function SablonokPage() {
  const isMobile = useMobile();
  if (isMobile) return <SablonokMobile />;
  return <SablonokDesktop />;
}
