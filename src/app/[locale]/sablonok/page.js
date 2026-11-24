'use client';

import useMobile from '@/hooks/useMobile';
import SablonokMobile from './mobile/SablonokMobile';

export default function SablonokPage() {
  const isMobile = useMobile();
  // Desktop view will be added in a later PR (AGENT_BRIEF §4)
  if (isMobile) return <SablonokMobile />;
  return <SablonokMobile />;
}
