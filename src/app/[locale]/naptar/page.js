'use client';

import useMobile from '@/hooks/useMobile';
import CalendarMobile from './mobile/CalendarMobile';
import CalendarDesktop from './desktop/CalendarDesktop';

export default function CalendarPage() {
  const isMobile = useMobile();
  if (isMobile) return <CalendarMobile />;
  return <CalendarDesktop />;
}
