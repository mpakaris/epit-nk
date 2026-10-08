'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF } from '@/lib/constants';
import { FolderKanban, ArrowLeft, Building2, Search, Users, Receipt, Coins } from 'lucide-react';

function SuperAdminProjectsContent() {
  const { isSuperAdmin, loading, entities, projects, invoices, users } = useApp();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState(searchParams.get('entity') || '');

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!isSuperAdmin) return <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}><h2 style={{ color: 'var(--danger)' }}>Access Denied</h2></div>;

  const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));

  const filtered = projects.filter(p => {
    if (entityFilter && p.entity_id !== entityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by entity
  const grouped = entities
    .map(entity => ({
      entity,
      projects: filtered.filter(p => p.entity_id === entity.id),
    }))
    .filter(g => g.projects.length > 0);

  const totalCost = invoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to overview
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <FolderKanban size={15} /> Superadmin
            </div>
            <h1 className="page-title">All Projects</h1>
            <p className="page-subtitle">{projects.length} projects across {entities.length} entities · {formatHUF(totalCost)} total</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.1rem' }}
          />
        </div>
        <select
          className="form-control"
          style={{ minWidth: 160, flex: '0 0 auto' }}
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
        >
          <option value="">All entities</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FolderKanban size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No projects match the current filter.</p>
        </div>
      ) : grouped.map(({ entity, projects: entityProjects }) => {
        const entityInvoices = invoices.filter(inv => entityProjects.some(p => p.id === inv.project_id));
        const entityTotal = entityInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0);

        return (
          <div key={entity.id} style={{ marginBottom: '2rem' }}>
            {/* Entity header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={14} color="#fff" />
                </div>
                <div>
                  <Link href={`/superadmin/entitasok/${entity.id}`} style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {entity.name}
                  </Link>
                </div>
              </div>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {entityProjects.length} project{entityProjects.length !== 1 ? 's' : ''} · {formatHUF(entityTotal)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.65rem' }}>
              {entityProjects.map(project => {
                const projInvoices = invoices.filter(inv => inv.project_id === project.id);
                const projTotal = projInvoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
                const memberCount = (project.members || []).length;

                return (
                  <Link
                    key={project.id}
                    href={`/projektek/${project.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="card" style={{ padding: '0.9rem 1rem', cursor: 'pointer', transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {project.name}
                          </div>
                          {project.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <Users size={13} color="var(--text-muted)" /> {memberCount} tag
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <Receipt size={13} color="var(--text-muted)" /> {projInvoices.length} számla
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                          <Coins size={13} color="var(--accent)" /> {formatHUF(projTotal)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperAdminProjectsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <SuperAdminProjectsContent />
    </Suspense>
  );
}
