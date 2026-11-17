'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

export default function RoomEditorPage() {
  const { id } = useParams();
  const router  = useRouter();
  const { isDemoMode } = useApp();

  useEffect(() => {
    router.replace(isDemoMode ? `/demo/felmeres/${id}` : `/felmeres/${id}`);
  }, [id, isDemoMode, router]);

  return null;
}
