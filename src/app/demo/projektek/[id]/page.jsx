'use client';

import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import ProjectDetailClient from '@/app/projektek/[id]/ProjectDetailClient';

export default function DemoProjectDetailPage() {
  const { id } = useParams();
  const { projects, invoices, labourEntries, users, clients, currentUser } = useApp();

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Projekt nem található</h2>
      </div>
    );
  }

  const projectInvoices = invoices.filter(i => i.project_id === id);
  const projectLabour   = labourEntries.filter(e => e.project_id === id);
  const client          = clients.find(c => c.id === project.client_id) || null;

  return (
    <ProjectDetailClient
      project={project}
      initialUsers={users}
      initialInvoices={projectInvoices}
      initialLabourEntries={projectLabour}
      client={client}
      clients={clients}
      currentUser={currentUser}
      isAdmin={false}
    />
  );
}
