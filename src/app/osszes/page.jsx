'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ChevronLeft, ClipboardList, FileText, Folder, Search } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import CompactRow from '@/components/mobile/CompactRow';

const SECTIONS = [
  { key: 'felmeres', label: 'Felmérések', icon: ClipboardList, color: '#2563eb' },
  { key: 'ajanlat',  label: 'Ajánlatok',  icon: FileText,      color: '#7c3aed' },
  { key: 'projekt',  label: 'Projektek',  icon: Folder,        color: '#059669' },
];

export default function OsszesPage() {
  const { loading, dataReady, clients, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';
  const searchParams = useSearchParams();
  const workspace = searchParams.get('workspace'); // 'personal' | collective UUID

  const [combined, setCombined]   = useState(null);
  const [fetching, setFetching]   = useState(true);
  const [search,   setSearch]     = useState('');

  useEffect(() => {
    if (!dataReady) return;
    fetch('/api/workspace/combined', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCombined(d); setFetching(false); })
      .catch(() => setFetching(false));
  }, [dataReady]);

  if (loading || !dataReady || fetching) return <PageSpinner />;

  // Pick the right slice of combined data based on ?workspace= param
  let surveys, quotes, projects, workspaceName;
  if (!workspace || workspace === 'personal') {
    surveys  = combined?.personal?.surveys  || [];
    quotes   = combined?.personal?.quotes   || [];
    projects = combined?.personal?.projects || [];
    workspaceName = 'Személyes';
  } else {
    const col = (combined?.collectives || []).find(c => c.id === workspace);
    const sharedSurveys  = combined?.shared?.surveys  || [];
    const sharedQuotes   = combined?.shared?.quotes   || [];
    const sharedProjects = combined?.shared?.projects || [];
    surveys  = sharedSurveys.filter(s => s.collective_id === workspace);
    quotes   = sharedQuotes.filter(q => q.collective_id === workspace);
    projects = sharedProjects.filter(p => p.collective_id === workspace);
    workspaceName = col?.name || 'Kollektíva';
  }

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);
  const clientName = item => clients?.find(c => c.id === item.client_id)?.name;
  const byDate = (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);

  const filter = list => {
    const sorted = [...list].sort(byDate);
    if (!q) return sorted;
    return sorted.filter(item =>
      norm(item.name || item.title).includes(q) ||
      norm(clientName(item)).includes(q)
    );
  };

  const filteredSurveys  = filter(surveys);
  const filteredQuotes   = filter(quotes);
  const filteredProjects = filter(projects);
  const isEmpty = filteredSurveys.length === 0 && filteredQuotes.length === 0 && filteredProjects.length === 0;

  return (
    <div className="container page-body">
      {/* Mobile header */}
      <div className="list-page-mobile-header" style={{ marginBottom: 20 }}>
        <Link
          href={`${navPrefix}/dashboard`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 15, fontWeight: 600, color: '#475569',
            textDecoration: 'none', height: 44, marginBottom: 4,
          }}
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Kezdőlap
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: '38px', marginBottom: 16 }}>
          {workspaceName}
        </h1>
        <div className="mobile-search-wrap">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Keresés cím vagy ügyfél szerint…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop header */}
      <div className="page-header list-page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{workspaceName}</h1>
            <p className="page-subtitle">Felmérések, ajánlatok és projektek egy helyen</p>
          </div>
        </div>
      </div>

      {/* Desktop search */}
      <div className="hide-mobile" style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Keresés cím vagy ügyfél szerint…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            {search ? 'Nincs találat.' : 'Nincsenek dokumentumok ebben a munkaterületen.'}
          </p>
        </div>
      ) : (
        <>
          {SECTIONS.map(({ key, label, icon: Icon, color }) => {
            const items =
              key === 'felmeres' ? filteredSurveys :
              key === 'ajanlat'  ? filteredQuotes  :
                                   filteredProjects;
            if (items.length === 0) return null;

            const href = item =>
              key === 'felmeres' ? `${navPrefix}/felmeres/${item.id}`  :
              key === 'ajanlat'  ? `${navPrefix}/ajanlatok/${item.id}` :
                                   `${navPrefix}/projektek/${item.id}`;

            return (
              <section key={key} style={{ marginBottom: 32 }}>
                <div style={{
                  fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
                  {label}
                  <span style={{ fontWeight: 600, opacity: 0.7 }}>· {items.length}</span>
                </div>
                {items.map(item => (
                  <CompactRow
                    key={item.id}
                    href={href(item)}
                    title={item.name || item.title}
                    meta={clientName(item)}
                    type={key}
                    isShared={!!item.collective_id}
                  />
                ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
