'use client';

import useMobile from '@/hooks/useMobile';
import OfferListDesktop from './OfferListDesktop';
import OfferListMobile from './mobile/OfferListMobile';

export default function QuotesListPage() {
  const isMobile = useMobile();
  if (isMobile) return <OfferListMobile />;
  return <OfferListDesktop />;
}
