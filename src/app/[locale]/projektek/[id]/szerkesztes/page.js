'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';

export default function ProjectEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/projektek/${id}`); }, [id, router]);
  return null;
}
