'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';

export default function SurveyEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/felmeres/${id}`); }, [id, router]);
  return null;
}
