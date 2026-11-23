'use client';

import useMobile from '@/hooks/useMobile';
import ClientsListMobile from './mobile/ClientsListMobile';
import ClientsDesktop from './desktop/ClientsDesktop';

export default function AdminClientsPage() {
  const isMobile = useMobile();
  if (isMobile) return <ClientsListMobile />;
  return <ClientsDesktop />;
}
