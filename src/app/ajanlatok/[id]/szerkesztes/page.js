'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function QuoteEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/ajanlatok/${id}`); }, [id, router]);
  return null;
}
