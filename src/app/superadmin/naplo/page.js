'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ClipboardList, RefreshCw, ChevronLeft, ChevronRight, User, Calendar, Users } from 'lucide-react';

// ── Action label map ──────────────────────────────────────────────────────────
const ACTION_LABELS = {
  // Auth
  'Bejelentkezés':                      { label: 'Login',                       color: 'var(--text-secondary)',  bg: 'var(--bg-subtle)' },
  'Login failed':                       { label: 'Login failed',                color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Logout':                             { label: 'Logout',                      color: 'var(--text-secondary)',  bg: 'var(--bg-subtle)' },
  'Login success':                      { label: 'Login',                       color: 'var(--text-secondary)',  bg: 'var(--bg-subtle)' },
  'Password reset requested':           { label: 'Password reset requested',    color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Password reset completed':           { label: 'Password reset completed',    color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Password reset failed':              { label: 'Password reset failed',       color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Registration failed':                { label: 'Registration failed',         color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Server Error':                       { label: 'Server error',                color: '#fff',                   bg: 'var(--danger)' },
  'Jelszó megváltoztatva':              { label: 'Password changed',            color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Jelszó visszaállítva':               { label: 'Password reset',              color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  // Profile
  'Profil módosítva':                   { label: 'Profile updated',             color: 'var(--accent)',          bg: 'var(--accent-light)' },
  // Users
  'Felhasználó létrehozva':             { label: 'User created',                color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Felhasználó törölve':                { label: 'User deleted',                color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Account registered via invitation':  { label: 'Registered via invite',       color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  // Projects
  'Projekt létrehozva':                 { label: 'Project created',             color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Projekt módosítva':                  { label: 'Project updated',             color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Projekt törölve':                    { label: 'Project deleted',             color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Projekt tagok frissítve':            { label: 'Project members updated',     color: 'var(--accent)',          bg: 'var(--accent-light)' },
  // Project rooms
  'Helyiség létrehozva':                { label: 'Room created',                color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Helyiség módosítva':                 { label: 'Room updated',                color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Helyiség törölve':                   { label: 'Room deleted',                color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Invoices
  'Számla feltöltve':                   { label: 'Invoice uploaded',            color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Számla módosítva':                   { label: 'Invoice updated',             color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Számla törölve':                     { label: 'Invoice deleted',             color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Labour
  'Munkabejegyzés rögzítve':            { label: 'Labour logged',               color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Munkabejegyzés módosítva':           { label: 'Labour updated',              color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Munkabejegyzés törölve':             { label: 'Labour deleted',              color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Quotes
  'Ajánlat létrehozva':                 { label: 'Quote created',               color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ajánlat módosítva':                  { label: 'Quote updated',               color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Ajánlat törölve':                    { label: 'Quote deleted',               color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Ajánlat elküldve':                   { label: 'Quote sent',                  color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  // Client portal responses
  'Ügyfél elfogadta az ajánlatot':      { label: 'Client accepted offer',       color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél elutasította az ajánlatot':   { label: 'Client declined offer',       color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Ügyfél kérdést küldött':             { label: 'Client sent question',        color: 'var(--accent)',          bg: 'var(--accent-light)' },
  // Surveys
  'Felmérés létrehozva':                { label: 'Survey created',              color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Felmérés módosítva':                 { label: 'Survey updated',              color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Felmérés törölve':                   { label: 'Survey deleted',              color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Clients
  'Ügyfél létrehozva':                  { label: 'Client created',              color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél módosítva':                   { label: 'Client updated',              color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Ügyfél törölve':                     { label: 'Client deleted',              color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Collectives
  'Kollektíva létrehozva':              { label: 'Collective created',          color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Kollektíva módosítva':               { label: 'Collective renamed',          color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Kollektíva törölve':                 { label: 'Collective deleted',          color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Kollektíva aktiválva':               { label: 'Collective activated',        color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Tag hozzáadva':                      { label: 'Member added',                color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Tag meghívva':                       { label: 'Member invited',              color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Meghívás elfogadva':                 { label: 'Invitation accepted',         color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Meghívás elutasítva':                { label: 'Invitation declined',         color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Member added':                       { label: 'Member added',                color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Member blocked':                     { label: 'Member blocked',              color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Member unblocked':                   { label: 'Member unblocked',            color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Member removed from collective':     { label: 'Member removed',              color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Member left collective':             { label: 'Member left',                 color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Invitation retracted':               { label: 'Invitation retracted',        color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  // Subscriptions
  'Premium subscription activated':     { label: 'Premium activated',           color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Premium subscription cancelled':     { label: 'Premium cancelled',           color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Premium subscription resumed':       { label: 'Premium resumed',             color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Collective subscription cancelled':  { label: 'Collective sub cancelled',    color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Collective subscription resumed':    { label: 'Collective sub resumed',      color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Collective tier upgraded to basic':  { label: 'Tier → Basic',                color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Collective tier upgraded to standard':{ label: 'Tier → Standard',            color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Collective tier upgraded to pro':    { label: 'Tier → Pro',                  color: '#7c3aed',                bg: '#f5f3ff' },
  // Diary
  'Napló bejegyzés létrehozva':         { label: 'Diary entry created',         color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Napló bejegyzés módosítva':          { label: 'Diary entry updated',         color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Napló bejegyzés törölve':            { label: 'Diary entry deleted',         color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Diary entry published to client':    { label: 'Diary → published to client', color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Diary entry hidden from client':     { label: 'Diary → hidden from client',  color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Diary share link created':           { label: 'Diary share link created',    color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Diary share link deleted':           { label: 'Diary share link deleted',    color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Napló megosztva':                    { label: 'Diary shared',                color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Napló megosztás visszavonva':        { label: 'Diary share revoked',         color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  // Ideas
  'Ötlet létrehozva':                   { label: 'Idea created',                color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ötlet törölve':                      { label: 'Idea deleted',                color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  // Website
  'Website published':                  { label: 'Website published',           color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Website unpublished':                { label: 'Website unpublished',         color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Website slug changed':               { label: 'Website URL changed',         color: 'var(--accent)',          bg: 'var(--accent-light)' },
};

const PAGE_SIZE = 50;

function fmtTs(ts) {
  if (!ts) return '–';
  return new Date(ts).toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function WorkspaceBadge({ workspace }) {
  if (!workspace || workspace.type === 'unknown') {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>–</span>;
  }
  if (workspace.type === 'collective') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
        <Users size={11} /> {workspace.name}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
      <User size={11} /> Personal
    </span>
  );
}

export default function AuditLogPage() {
  const { isSuperAdmin } = useApp();

  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(0);

  const [filterUser,   setFilterUser]   = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [filterWA,     setFilterWA]     = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (filterUser)   params.set('userName', filterUser);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom)   params.set('from', filterFrom + 'T00:00:00');
      if (filterTo)     params.set('to',   filterTo   + 'T23:59:59');
      if (filterWA)     params.set('channel', 'whatsapp');

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
        setTotal(d.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterUser, filterAction, filterFrom, filterTo, filterWA]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <Link href="/superadmin" className="btn btn-secondary mt-4">Back</Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ClipboardList size={15} /> Superadmin
            </div>
            <h1 className="page-title">Audit Log</h1>
            <p className="page-subtitle">All user actions · {total} entries</p>
          </div>
          <button type="button" onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={e => { e.preventDefault(); setPage(0); fetchLogs(); }} className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={12} /> User
            </label>
            <input type="text" className="form-control" placeholder="Name or email…" value={filterUser} onChange={e => setFilterUser(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ClipboardList size={12} /> Event
            </label>
            <select className="form-control" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All events</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> From
            </label>
            <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> To
            </label>
            <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} min={filterFrom || undefined} />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Filter</button>
            <button
              type="button"
              onClick={() => { setFilterWA(w => !w); setPage(0); }}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700,
                fontSize: '0.78rem', cursor: 'pointer', border: 'none',
                background: filterWA ? '#25D366' : 'var(--bg-subtle)',
                color: filterWA ? '#fff' : 'var(--text-secondary)',
              }}
            >
              📱 WA only
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFilterUser(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setFilterWA(false); setPage(0); }}>
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th className="hide-mobile">Workspace</th>
              <th>Event</th>
              <th className="hide-mobile">Target</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No results.</td></tr>
            ) : logs.map(log => {
              const style = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-secondary)', bg: 'var(--bg-subtle)' };
              return (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {fmtTs(log.created_at)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_name || '–'}</div>
                    <div className="show-mobile" style={{ marginTop: '0.2rem' }}>
                      <WorkspaceBadge workspace={log.workspace} />
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <WorkspaceBadge workspace={log.workspace} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        fontSize: '0.775rem', fontWeight: 700,
                        padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)',
                        color: style.color, background: style.bg,
                        whiteSpace: 'nowrap',
                      }}>
                        {style.label}
                      </span>
                      {log.details?.channel === 'whatsapp' && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-pill)',
                          color: '#fff', background: '#25D366', whiteSpace: 'nowrap',
                        }}>
                          📱 WA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hide-mobile" style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    {log.target_name || log.target_id
                      ? <span>{log.target_name || log.target_id}</span>
                      : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {page + 1} / {totalPages}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
