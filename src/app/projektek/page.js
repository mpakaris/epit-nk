'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF } from '@/lib/constants';
import { FolderKanban, Users, ArrowUpRight, TrendingUp, TrendingDown, CheckCircle2, Plus, AlertCircle } from 'lucide-react';
import CalendarWidget from '@/components/CalendarWidget';
import Modal from '@/components/Modal';

export default function ProjectsListPage() {
  const { currentUser, projects, invoices, labourEntries, users, isAdmin, isSuperAdmin, impersonating, effectiveEntityId, createProject } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const myProjects = projects;

  const openCreate = () => {
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd('');
    setMemberIds(currentUser ? [currentUser.id] : []);
    setError('');
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createProject({ name: projName, description: projDesc, memberIds, startDate: projStart || null, endDate: projEnd || null, entityId: effectiveEntityId });
      setShowCreate(false);
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (uid) => setMemberIds(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  // Don't show create button when superadmin is browsing without god mode
  const canCreate = currentUser && !(isSuperAdmin && !impersonating);

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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canCreate && (
              <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
                <Plus size={15} /> Új Projekt
              </button>
            )}
            {isAdmin && (
              <Link href="/admin/projektek" className="btn btn-secondary btn-sm">
                Admin felület
              </Link>
            )}
          </div>
        </div>
      </div>

      {!(isSuperAdmin && !impersonating) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <CalendarWidget />
        </div>
      )}

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
          {myProjects.map(project => {
            const projectMemberUsers = users.filter(u => (project.members || []).includes(u.id));
            const fin = calculateProjectFinancials(project, invoices, labourEntries, projectMemberUsers, currentUser?.id);

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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Új projekt létrehozása">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-name">Projekt neve *</label>
            <input id="mp-name" type="text" className="form-control" required autoFocus value={projName} onChange={e => setProjName(e.target.value)} placeholder="pl. Balatoni Nyaraló Felújítás" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-desc">Leírás</label>
            <textarea id="mp-desc" rows={2} className="form-control" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Rövid leírás…" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-start">Kezdés</label>
              <input id="mp-start" type="date" className="form-control" value={projStart} onChange={e => setProjStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-end">Befejezés</label>
              <input id="mp-end" type="date" className="form-control" min={projStart || undefined} value={projEnd} onChange={e => setProjEnd(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <label className="form-label">Résztvevők</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 'var(--radius-sm)', cursor: u.id === currentUser?.id ? 'default' : 'pointer', fontSize: '0.825rem', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={memberIds.includes(u.id)}
                    disabled={u.id === currentUser?.id}
                    onChange={() => toggleMember(u.id)}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>{u.display_name}</span>
                  {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 'var(--radius-pill)', padding: '0.05rem 0.4rem', fontWeight: 700, flexShrink: 0 }}>én</span>}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Létrehozás...' : 'Projekt létrehozása'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
