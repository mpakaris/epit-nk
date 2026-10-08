'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PageSpinner from '@/components/PageSpinner';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useApp();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.replace('/login');
      } else if (currentUser.must_change_password) {
        router.replace('/change-password');
      } else if (currentUser.role === 'superadmin') {
        router.replace('/superadmin');
      } else if (currentUser.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/projektek');
      }
    }
  }, [currentUser, loading, router]);

  return <PageSpinner />;
}
