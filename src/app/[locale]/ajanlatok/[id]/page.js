'use client';

import useMobile from '@/hooks/useMobile';
import OfferDetailMobile from '../mobile/OfferDetailMobile';
import OfferDetailDesktop from './desktop/OfferDetailDesktop';
import { useParams } from 'next/navigation';

export default function QuoteDetailPage() {
  const isMobile = useMobile();
  const { id } = useParams();
  if (isMobile) return <OfferDetailMobile quoteId={id} />;
  return <OfferDetailDesktop />;
}
