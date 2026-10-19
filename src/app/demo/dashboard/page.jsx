'use client';

import { useApp } from '@/context/AppContext';
import DashboardClient from '@/app/dashboard/DashboardClient';

export default function DemoDashboardPage() {
  const { currentUser, activeCollectiveId } = useApp();
  return (
    <DashboardClient
      initialProjects={[]}
      initialInvoices={[]}
      initialLabourEntries={[]}
      initialUsers={[]}
      initialClients={[]}
      initialQuotes={[]}
      initialSurveys={[]}
      currentUser={currentUser}
      isAdmin={false}
      isSuperAdmin={false}
      impersonating={null}
      effectiveEntityId={activeCollectiveId}
    />
  );
}
