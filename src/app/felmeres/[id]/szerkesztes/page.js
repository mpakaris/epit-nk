'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SurveyEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/felmeres/${id}`); }, [id, router]);
  return null;
}
