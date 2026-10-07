'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ClipboardList, RefreshCw, ChevronLeft, ChevronRight, Building2, User, Calendar } from 'lucide-react';

const ACTION_LABELS = {
  'Bejelentkezés':              { color: 'var(--text-secondary)',  bg: 'var(--bg-subtle)' },
  'Jelszó megváltoztatva':      { color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Jelszó visszaállítva':       { color: 'var(--warning-text)',    bg: 'var(--warning-bg)' },
  'Felhasználó létrehozva':     { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Felhasználó törölve':        { color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Projekt létrehozva':         { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Projekt módosítva':          { color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Projekt törölve':            { color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Projekt tagok frissítve':    { color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Számla feltöltve':           { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Számla módosítva':           { color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Számla törölve':             { color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Munkabejegyzés rögzítve':    { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Munkabejegyzés törölve':     { color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
  'Ajánlat létrehozva':         { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél létrehozva':          { color: 'var(--success-text)',    bg: 'var(--success-bg)' },
  'Ügyfél módosítva':           { color: 'var(--accent)',          bg: 'var(--accent-light)' },
  'Ügyfél törölve':             { color: 'var(--danger-text)',     bg: 'var(--danger-bg)' },
};

const PAGE_SIZE = 50;

function fmtTs(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  return d.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/superadmin" className="btn btn-secondary mt-4">Vissza</Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az entitásokhoz
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ClipboardList size={15} /> Superadmin
            </div>
            <h1 className="page-title">Audit napló</h1>
            <p className="page-subtitle">Minden rendszeresemény nyomkövetése · {total} bejegyzés</p>
          </div>
          <button type="button" onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Frissítés
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilter} className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Building2 size={12} /> Entitás
            </label>
            <select className="form-control" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
              <option value="">Összes entitás</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ClipboardList size={12} /> Esemény
            </label>
            <select className="form-control" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">Minden esemény</option>
              {Object.keys(ACTION_LABELS).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> Dátumtól
            </label>
            <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={12} /> Dátumig
            </label>
            <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} min={filterFrom || undefined} />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Szűrés</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFilterEntity(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setPage(0); }}>
              Törlés
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Időpont</th>
              <th className="hide-mobile">Entitás</th>
              <th>Felhasználó</th>
              <th>Esemény</th>
              <th className="hide-mobile">Célpont</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Betöltés...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nincs találat.</td></tr>
            ) : logs.map(log => {
              const style = ACTION_LABELS[log.action] || { color: 'var(--text-secondary)', bg: 'var(--bg-subtle)' };
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
                      {log.action}
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
