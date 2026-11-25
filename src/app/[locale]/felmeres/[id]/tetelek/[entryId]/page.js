'use client';

import useMobile from '@/hooks/useMobile';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ItemsMobile from '@/app/[locale]/felmeres/mobile/ItemsMobile';

export default function ItemsPage() {
  const isMobile = useMobile();
  const { id }   = useParams();
  const router   = useRouter();

  useEffect(() => {
    if (isMobile === false) {
      router.replace(`/felmeres/${id}`);
    }
  }, [isMobile, id, router]);

  if (isMobile === false) return null;
  return <ItemsMobile />;
}
