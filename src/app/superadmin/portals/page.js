'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ExternalLink, Search, Users } from 'lucide-react';
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
        // Group clients by email, deduplicate
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
            <Users size={20} /> Ügyfél portálok
          </h1>
          <p className="page-subtitle">{clients.length} egyedi email-cím</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: 420 }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Keresés email vagy név alapján…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          {query ? 'Nincs találat.' : 'Még nincs email-címmel rendelkező ügyfél.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((c, i) => (
            <div
              key={c.email}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {c.email}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {[...c.names].join(', ')}
                  {' · '}
                  <span>{c.records.length} vállalkozó</span>
                </div>
              </div>
              <Link
                href={`/portal/dashboard?as=${encodeURIComponent(c.email)}`}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
              >
                <ExternalLink size={13} /> Portál megnyitása
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
