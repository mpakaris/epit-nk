'use client';
import { Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import ProjectsListClient from '@/app/projektek/ProjectsListClient';
import PageSpinner from '@/components/PageSpinner';

export default function DemoProjectenPage() {
  const { currentUser, activeCollectiveId } = useApp();
  return (
    <Suspense fallback={<PageSpinner />}>
    <ProjectsListClient
      initialProjects={[]}
      initialInvoices={[]}
      initialLabourEntries={[]}
      initialUsers={[]}
      initialClients={[]}
      initialQuotes={[]}
      currentUser={currentUser}
      isAdmin={false}
      isSuperAdmin={false}
      impersonating={null}
      effectiveEntityId={activeCollectiveId}
    />
    </Suspense>
  );
}
