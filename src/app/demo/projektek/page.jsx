'use client';
import { useApp } from '@/context/AppContext';
import ProjectsListClient from '@/app/projektek/ProjectsListClient';

export default function DemoProjectenPage() {
  const { currentUser, activeCollectiveId } = useApp();
  return (
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
  );
}
