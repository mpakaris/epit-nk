'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Search, Users, ChevronRight } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

export default function SuperadminPortalsPage() {
  const router = useRouter();
  const { isSuperAdmin, loading, dataReady } = useApp();
  const [clients, setClients]   = useState([]);
  const [fetching, setFetching] = useState(true);
  const [query, setQuery]       = useState('');

  useEffect(() => {
    if (!dataReady) return;
    if (!isSuperAdmin) { router.replace('/dashboard'); return; }
    fetch('/api/superadmin/data')
      .then(r => r.json())
      .then(data => {
        const all = data.clients || [];
        const byEmail = {};
        for (const c of all) {
          const key = (c.email || '').toLowerCase().trim();
          if (!key) continue;
          if (!byEmail[key]) byEmail[key] = { email: key, names: new Set(), records: [] };
          byEmail[key].names.add(c.name);
          byEmail[key].records.push(c);
        }
        setClients(Object.values(byEmail).sort((a, b) => a.email.localeCompare(b.email)));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [dataReady, isSuperAdmin]);

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const filtered = query.trim()
    ? clients.filter(c =>
        c.email.includes(query.toLowerCase()) ||
        [...c.names].some(n => n.toLowerCase().includes(query.toLowerCase()))
      )
    : clients;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Superadmin
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> Client Portals
          </h1>
          <p className="page-subtitle">{clients.length} unique email {clients.length === 1 ? 'address' : 'addresses'}</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by email or name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          {query ? 'No results found.' : 'No clients with email addresses yet.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((c, i) => (
            <Link
              key={c.email}
              href={`/superadmin/portals/${encodeURIComponent(c.email)}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                textDecoration: 'none', color: 'inherit',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {c.email}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {[...c.names].filter(Boolean).join(', ') || '—'}
                  {' · '}
                  <span>{c.records.length} {c.records.length === 1 ? 'contractor' : 'contractors'}</span>
                </div>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
