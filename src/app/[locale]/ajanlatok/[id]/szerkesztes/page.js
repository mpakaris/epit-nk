'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';

export default function QuoteEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/ajanlatok/${id}`); }, [id, router]);
  return null;
}
