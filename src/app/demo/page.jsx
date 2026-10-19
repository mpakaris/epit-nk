'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoEntryPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/demo/dashboard'); }, []);
  return null;
}
