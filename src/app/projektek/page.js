'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF } from '@/lib/constants';
import { FolderKanban, Users, ArrowUpRight, TrendingUp, TrendingDown, CheckCircle2, Plus } from 'lucide-react';

export default function ProjectsListPage() {
  const { currentUser, projects, invoices, users, isAdmin } = useApp();

  const myProjects = projects.filter(p => {
    if (isAdmin) return true;
    return (p.members || []).includes(currentUser?.id);
  });

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Saját Projektek</h1>
            <p className="page-subtitle">
              Építkezési költségmegosztás és egyenleg
            </p>
          </div>
          {isAdmin && (
            <Link href="/admin/projektek" className="btn btn-secondary btn-sm">
              Admin felület
            </Link>
          )}
        </div>
      </div>

      {myProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FolderKanban size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Nincsenek elérhető projektek
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', fontSize: '0.875rem' }}>
            Jelenleg még nem vették fel egyetlen építkezési projektbe sem. Kérje meg az adminisztrátort a hozzárendeléshez!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {myProjects.map(project => {
            const projectMemberUsers = users.filter(u => (project.members || []).includes(u.id));
            const fin = calculateProjectFinancials(project, invoices, projectMemberUsers, currentUser?.id);

            return (
              <div 
                key={project.id} 
                className="card"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '1rem',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <Link href={`/projektek/${project.id}`} style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                        {project.name}
                      </h3>
                    </Link>
                    <Link href={`/projektek/${project.id}`}>
                      <ArrowUpRight size={18} color="var(--text-muted)" />
                    </Link>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {project.description || 'Nincs részletes leírás.'}
                  </p>

                  {/* Members */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    <Users size={14} color="var(--accent)" />
                    <span>{fin.memberCount} résztvevő</span>
                  </div>

                  {/* Clean Financial Strip */}
                  <div 
                    style={{ 
                      background: 'var(--bg-subtle)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '0.75rem 0.85rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.4rem',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Összköltség
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }} className="text-mono">
                        {formatHUF(fin.totalCost)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Rád eső rész
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-secondary)' }} className="text-mono">
                        {formatHUF(fin.equalShare)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Általad fizetve
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--accent)' }} className="text-mono">
                        {formatHUF(fin.ownPaid)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Balance Status & Quick Upload Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                  <div>
                    {fin.balance > 0 ? (
                      <span className="balance-pill positive">
                        <TrendingUp size={13} />
                        <span>+{formatHUF(fin.balance)} túlfizetés</span>
                      </span>
                    ) : fin.balance < 0 ? (
                      <span className="balance-pill negative">
                        <TrendingDown size={13} />
                        <span>{formatHUF(fin.balance)} tartozás</span>
                      </span>
                    ) : (
                      <span className="balance-pill neutral">
                        <CheckCircle2 size={13} />
                        <span>0 Ft</span>
                      </span>
                    )}
                  </div>

                  <Link 
                    href={`/projektek/${project.id}/feltoltes`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.3rem' }}
                  >
                    <Plus size={14} /> Számla hozzáadása
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
