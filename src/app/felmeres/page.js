'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { Ruler, Plus, Search, ChevronLeft, Users } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import ItemCard from '@/components/mobile/ItemCard';
import WorkspaceSectionHeader from '@/components/mobile/WorkspaceSectionHeader';
import ExpandButton from '@/components/mobile/ExpandButton';

const PREVIEW_COUNT = 3;

function surveyStatus(s) {
  if (s.status === 'done')     return 'done';
  if (s.status === 'reopened') return 'reopened';
  return 'active';
}

export default function SurveyListPage() {
  const {
    loading, dataReady, clients, users, isAdmin, currentUser,
    deleteSurvey, updateSurvey, isDemoMode,
  } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [search,         setSearch]         = useState('');
  const [combined,       setCombined]       = useState(null);
  const [fetching,       setFetching]       = useState(true);
  const [expandPersonal, setExpandPersonal] = useState(false);
  const [expandShared,   setExpandShared]   = useState({});
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [alertModal,     setAlertModal]     = useState(null);

  useEffect(() => {
    if (!dataReady) return;
    fetch('/api/workspace/combined', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { personal: { surveys: [] }, shared: { surveys: [] }, collectives: [] })
      .then(d => { setCombined(d); setFetching(false); })
      .catch(() => setFetching(false));
  }, [dataReady]);

  const handleDelete = (survey) => {
    const photoCount = (survey._photo_count || 0) + (survey._layout_count || 0);
    const parts = [];
    if (photoCount)            parts.push(`${photoCount} fotó/videó`);
    if (survey._drawing_count) parts.push(`${survey._drawing_count} vázlat`);
    const extra = parts.length ? ` Véglegesen törlődik: ${parts.join(', ')}.` : '';
    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést?${extra} Ez nem vonható vissza.`,
      onConfirm: async () => {
        try { await deleteSurvey(survey.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      },
    });
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);

  const applySearch = (list) => {
    if (!q) return list;
    return list.filter(s => {
      const client = clients.find(c => c.id === s.client_id);
      return norm(s.title).includes(q) || norm(client?.name).includes(q) || norm(s.location).includes(q);
    });
  };

  const personalAll      = combined?.personal?.surveys || [];
  const sharedAll        = combined?.shared?.surveys   || [];
  const collectives      = combined?.collectives       || [];
  const filteredPersonal = applySearch(personalAll);
  const sharedByColl     = collectives.map(col => ({
    ...col,
    surveys: applySearch(sharedAll.filter(s => s.collective_id === col.id)),
  }));

  const isEmpty = filteredPersonal.length === 0 && sharedByColl.every(c => c.surveys.length === 0);

  const renderSurveyCard = (survey) => {
    const client = clients.find(c => c.id === survey.client_id);
    return (
      <ItemCard
        key={survey.id}
        href={`${navPrefix}/felmeres/${survey.id}`}
        title={survey.title}
        clientName={client?.name}
        date={survey.date || survey.created_at}
        status={surveyStatus(survey)}
        photoUrls={survey._preview_urls || []}
        isShared={!!survey.collective_id}
        onDelete={(survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id) ? () => handleDelete(survey) : undefined}
      />
    );
  };

  return (
    <div className="container page-body">

      {/* ── Mobile-only header ── */}
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
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '38px', marginBottom: 16 }}>
          Felmérések
        </h1>
        {/* Mobile search */}
        <div className="mobile-search-wrap">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Keresés név vagy ügyfél szerint"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="page-header list-page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Felmérések</h1>
            <p className="page-subtitle">Helyszíni felmérések és fotódokumentációk</p>
          </div>
          {currentUser && (
            <Link href={`${navPrefix}/felmeres/uj`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új felmérés
            </Link>
          )}
        </div>
      </div>

      {/* Desktop search */}
      <div className="hide-mobile" style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Keresés cím, ügyfél, helyszín alapján…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {isEmpty ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Ruler size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} aria-hidden="true" />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {search ? 'Nincs találat' : 'Nincsenek felmérések'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {search ? 'Próbáljon más keresési feltételt.' : 'Hozza létre az első felmérést.'}
          </p>
          {!search && (
            <Link href={`${navPrefix}/felmeres/uj`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új felmérés
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Personal section ── */}
          <WorkspaceSectionHeader
            type="personal"
            count={filteredPersonal.length}
          />
          {filteredPersonal.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Nincs személyes felmérés.
            </p>
          ) : (
            <>
              <div className="card-grid">
                {(expandPersonal ? filteredPersonal : filteredPersonal.slice(0, PREVIEW_COUNT)).map(renderSurveyCard)}
              </div>
              <ExpandButton
                total={filteredPersonal.length}
                showing={PREVIEW_COUNT}
                expanded={expandPersonal}
                onToggle={() => setExpandPersonal(v => !v)}
              />
            </>
          )}

          {/* ── Collective sections ── */}
          {sharedByColl.map(col => (
            <div key={col.id} className="collective-inset-panel" style={{ marginTop: 24 }}>
              <WorkspaceSectionHeader
                type="collective"
                name={col.name}
                count={col.surveys.length}
              />
              {col.surveys.length === 0 ? (
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Nincs megosztott felmérés ebben a kollektívában.
                </p>
              ) : (
                <>
                  <div className="card-grid">
                    {(expandShared[col.id] ? col.surveys : col.surveys.slice(0, PREVIEW_COUNT)).map(renderSurveyCard)}
                  </div>
                  <ExpandButton
                    total={col.surveys.length}
                    showing={PREVIEW_COUNT}
                    expanded={!!expandShared[col.id]}
                    onToggle={() => setExpandShared(v => ({ ...v, [col.id]: !v[col.id] }))}
                  />
                </>
              )}
            </div>
          ))}

          {/* Nudge when no collectives */}
          {collectives.length === 0 && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.15rem' }}>Csapatban is dolgozol?</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  Hozz létre egy kollektívát és oszd meg a felméréseidet.{' '}
                  <Link href={`${navPrefix}/kollektivak`} style={{ color: 'var(--accent)', fontWeight: 700 }}>Kollektívák →</Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title="Felmérés törlése"
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
      />
    </div>
  );
}
