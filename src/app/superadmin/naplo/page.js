'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ClipboardList, RefreshCw, ChevronLeft, ChevronRight, Building2, User, Calendar } from 'lucide-react';

const ACTION_LABELS = {
  'Bejelentkezés':              { label: 'Login',                color: 'var(--text-secondary)',  bg: 'var(--bg-subtle)' },
  'Jelszó megváltoztatva':      { label: 'Password changed',     color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Jelszó visszaállítva':       { label: 'Password reset',       color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Felhasználó létrehozva':     { label: 'User created',         color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Felhasználó törölve':        { label: 'User deleted',         color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Projekt létrehozva':         { label: 'Project created',      color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Projekt módosítva':          { label: 'Project updated',      color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Projekt törölve':            { label: 'Project deleted',      color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Projekt tagok frissítve':    { label: 'Members updated',      color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Számla feltöltve':           { label: 'Invoice uploaded',     color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Számla módosítva':           { label: 'Invoice updated',      color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Számla törölve':             { label: 'Invoice deleted',      color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Munkabejegyzés rögzítve':    { label: 'Labour logged',        color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Munkabejegyzés törölve':     { label: 'Labour deleted',       color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Ajánlat létrehozva':         { label: 'Quote created',        color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél létrehozva':          { label: 'Client created',       color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél módosítva':           { label: 'Client updated',       color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Ügyfél törölve':             { label: 'Client deleted',       color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'diary_entry_created':        { label: 'Diary entry created',  color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'diary_entry_deleted':        { label: 'Diary entry deleted',  color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'diary_share_token_created':  { label: 'Share link created',   color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'diary_share_token_deleted':  { label: 'Share link deleted',   color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'entity_updated':             { label: 'Entity updated',       color: 'var(--accent)',          bg: 'var(--accent-light)' },
};

const PAGE_SIZE = 50;

function fmtTs(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogPage() {
  const { isSuperAdmin, entities } = useApp();

  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(0);

  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (filterEntity) params.set('entityId', filterEntity);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom)   params.set('from', filterFrom + 'T00:00:00');
      if (filterTo)     params.set('to',   filterTo   + 'T23:59:59');

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
        setTotal(d.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction, filterFrom, filterTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilter = (e) => { e.preventDefault(); setPage(0); fetchLogs(); };

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
          <ArrowLeft size={15} /> Back to entities
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ClipboardList size={15} /> Superadmin
            </div>
            <h1 className="page-title">Audit Log</h1>
            <p className="page-subtitle">All system events tracked · {total} entries</p>
          </div>
          <button type="button" onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilter} className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Building2 size={12} /> Entity
            </label>
            <select className="form-control" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
              <option value="">All entities</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ClipboardList size={12} /> Event
            </label>
            <select className="form-control" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All events</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> From date
            </label>
            <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> To date
            </label>
            <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} min={filterFrom || undefined} />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Filter</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFilterEntity(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setPage(0); }}>
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
              <th className="hide-mobile">Entity</th>
              <th>User</th>
              <th>Event</th>
              <th className="hide-mobile">Target</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No results.</td></tr>
            ) : logs.map(log => {
              const style = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-secondary)', bg: 'var(--bg-subtle)' };
              return (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {fmtTs(log.created_at)}
                  </td>
                  <td className="hide-mobile" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {log.entity?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_name || '–'}</div>
                    <div className="show-mobile" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.entity?.name || ''}</div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.775rem', fontWeight: 700,
                      padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)',
                      color: style.color, background: style.bg,
                      whiteSpace: 'nowrap',
                    }}>
                      {style.label}
                    </span>
                  </td>
                  <td className="hide-mobile" style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    {log.target_name || log.target_id || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>–</span>}
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
