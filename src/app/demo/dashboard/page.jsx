'use client';

import useMobile from '@/hooks/useMobile';
import DashboardDesktop from '@/app/[locale]/dashboard/desktop/DashboardDesktop';
import DashboardMobile from '@/app/[locale]/dashboard/mobile/DashboardMobile';

export default function DemoDashboardPage() {
  const isMobile = useMobile();
  if (isMobile) return <DashboardMobile />;
  return <DashboardDesktop />;
}
