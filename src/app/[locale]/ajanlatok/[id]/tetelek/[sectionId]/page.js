'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useMobile from '@/hooks/useMobile';
import OfferItemsMobile from '@/app/[locale]/ajanlatok/mobile/OfferItemsMobile';

export default function OfferItemsPage() {
  const isMobile = useMobile();
  const { id }   = useParams();
  const router   = useRouter();

  useEffect(() => {
    if (isMobile === false) router.replace(`/ajanlatok/${id}`);
  }, [isMobile, id, router]);

  if (isMobile === false) return null;
  return <OfferItemsMobile />;
}
