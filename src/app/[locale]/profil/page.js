'use client';

import useMobile from '@/hooks/useMobile';
import ProfileMobile from './mobile/ProfileMobile';
import ProfileDesktop from './desktop/ProfileDesktop';

export default function ProfilPage() {
  const isMobile = useMobile();
  if (isMobile) return <ProfileMobile />;
  return <ProfileDesktop />;
}
