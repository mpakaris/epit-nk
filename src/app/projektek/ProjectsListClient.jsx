'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF } from '@/lib/constants';
import { FolderKanban, Users, TrendingUp, TrendingDown, CheckCircle2, Plus, AlertCircle } from 'lucide-react';
import CalendarWidget from '@/components/CalendarWidget';
import Modal from '@/components/Modal';

export default function ProjectsListClient({
  initialProjects,
  initialInvoices,
  initialLabourEntries,
  initialUsers,
  initialClients,
  initialQuotes,
  currentUser,
  isAdmin,
  isSuperAdmin,
  impersonating,
  effectiveEntityId,
}) {
  const router = useRouter();
  const { createClient: ctxCreateClient } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [projClientId, setProjClientId] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Inline new-client state
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddr, setNewClientAddr] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const openCreate = () => {
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd('');
    setProjClientId('');
    setMemberIds(currentUser ? [currentUser.id] : []);
    setError('');
    setShowNewClient(false);
    setShowCreate(true);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const c = await ctxCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddr.trim(), entityId: effectiveEntityId });
      setProjClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddr('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!projClientId) { setError('Ügyfél megadása kötelező! Válasszon meglévőt vagy hozzon létre újat.'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          description: projDesc,
          memberIds,
          startDate: projStart || null,
          endDate: projEnd || null,
          clientId: projClientId || null,
          entityId: effectiveEntityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a projekt létrehozásakor');
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (uid) => setMemberIds(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  const canCreate = currentUser && !(isSuperAdmin && !impersonating);

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Saját Projektek</h1>
            <p className="page-subtitle">Építkezési költségmegosztás és egyenleg</p>
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
          <CalendarWidget
            projects={initialProjects}
            clients={initialClients || []}
            quotes={initialQuotes || []}
          />
        </div>
      )}

      {initialProjects.length === 0 ? (
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
          {initialProjects.map(project => {
            const projectMemberUsers = initialUsers.filter(u => (project.members || []).includes(u.id));
            const fin = calculateProjectFinancials(project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser?.id);

            return (
              <div
                key={project.id}
                className="card card-interactive"
                onClick={() => router.push(`/projektek/${project.id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                      {project.name}
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {project.description || 'Nincs részletes leírás.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    <Users size={14} color="var(--accent)" />
                    <span>{fin.memberCount} résztvevő</span>
                  </div>

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
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Összköltség</div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }} className="text-mono">{formatHUF(fin.totalCost)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rád eső rész</div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-secondary)' }} className="text-mono">{formatHUF(fin.equalShare)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Általad fizetve</div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--accent)' }} className="text-mono">{formatHUF(fin.ownPaid)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                  <div>
                    {fin.balance > 0 ? (
                      <span className="balance-pill positive"><TrendingUp size={13} /><span>+{formatHUF(fin.balance)} túlfizetés</span></span>
                    ) : fin.balance < 0 ? (
                      <span className="balance-pill negative"><TrendingDown size={13} /><span>{formatHUF(fin.balance)} tartozás</span></span>
                    ) : (
                      <span className="balance-pill neutral"><CheckCircle2 size={13} /><span>0 Ft</span></span>
                    )}
                  </div>
                  <Link
                    href={`/projektek/${project.id}/feltoltes`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.3rem' }}
                    onClick={e => e.stopPropagation()}
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

          {/* Client — required */}
          <div className="form-group">
            <label className="form-label">Megrendelő *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ flex: 1, borderColor: !projClientId ? 'var(--warning-border)' : undefined }}
                value={projClientId}
                onChange={e => setProjClientId(e.target.value)}
              >
                <option value="">– Válasszon ügyfelet –</option>
                {(initialClients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => { setNewClientError(''); setShowNewClient(v => !v); }}>
                <Plus size={14} /> Új ügyfél
              </button>
            </div>
            {projClientId && (
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem' }}>
                ✓ {(initialClients || []).find(c => c.id === projClientId)?.name}
              </div>
            )}
          </div>

          {/* Inline new client */}
          {showNewClient && (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
              {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.55rem' }}>{newClientError}</div>}
              <form onSubmit={handleCreateClient}>
                <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Pl. Horváth Béla" autoFocus /></div>
                <div className="grid-2col">
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddr} onChange={e => setNewClientAddr(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creatingClient}>{creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}</button>
                </div>
              </form>
            </div>
          )}

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
              {initialUsers.map(u => (
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
