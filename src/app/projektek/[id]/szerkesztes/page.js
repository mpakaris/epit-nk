'use client';
import { useParams, redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectEditRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/projektek/${id}`); }, [id]);
  return null;
}
