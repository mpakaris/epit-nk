'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  Ruler, Plus, MapPin, Calendar, Clock, User, Trash2,
  LayoutPanelLeft, Camera, PenLine, Grid3x3, CheckCircle2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceBadge from '@/components/WorkspaceBadge';

function getSurveyStatusBadge(status) {
  if (status === 'done')     return { label: 'Lezárt',     bg: 'var(--success-bg)',  color: 'var(--success-text)',  border: 'var(--success-border)',  icon: <CheckCircle2 size={10} /> };
  if (status === 'reopened') return { label: 'Újranyitva', bg: 'var(--warning-bg)',  color: 'var(--warning-text)',  border: 'var(--warning-border)',  icon: <RefreshCw    size={10} /> };
  return                            { label: 'Aktív',      bg: 'var(--accent-light)', color: 'var(--accent)',        border: 'var(--accent-border)',   icon: null };
}

export default function SurveyListPage() {
  const { loading, dataReady, surveys, quotes, projects, clients, users, isAdmin, currentUser, activeCollectiveId, deleteSurvey, updateSurvey, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [closingId, setClosingId] = useState(null);

  const STALE_DAYS = 90;
  const isStale = (survey) => {
    if (survey.status !== 'active') return false;
    const ref = survey.updated_at || survey.created_at;
    if (!ref) return false;
    return (Date.now() - new Date(ref).getTime()) > STALE_DAYS * 86400_000;
  };

  const handleQuickClose = async (e, survey) => {
    e.preventDefault();
    e.stopPropagation();
    setClosingId(survey.id);
    try {
      await updateSurvey(survey.id, { status: 'done', done_at: new Date().toISOString() });
    } catch { /* updateSurvey shows its own error */ }
    setClosingId(null);
  };

  if (loading || !dataReady) return <PageSpinner />;

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);

  const byTab = surveys.filter(s =>
    tab === 'done' ? s.status === 'done' : s.status !== 'done'
  );
  const doneCount   = surveys.filter(s => s.status === 'done').length;
  const activeCount = surveys.filter(s => s.status !== 'done').length;

  const filtered = byTab.filter(s => {
    if (!q) return true;
    const client = clients.find(c => c.id === s.client_id);
    return norm(s.title).includes(q) || norm(client?.name).includes(q) || norm(s.location).includes(q);
  });

  const handleDelete = (survey) => {
    const parts = [];
    const photoCount = (survey._photo_count || 0) + (survey._layout_count || 0);
    if (photoCount)            parts.push(`${photoCount} fotó / videó`);
    if (survey._drawing_count) parts.push(`${survey._drawing_count} vázlat`);
    const detail = parts.length ? ` Véglegesen törlődik: ${parts.join(', ')}. Ez nem vonható vissza.` : ' Ez nem vonható vissza.';
    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést?${detail}`,
      onConfirm: async () => {
        try { await deleteSurvey(survey.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>Felmérések <WorkspaceBadge /></h1>
            <p className="page-subtitle">Helyszíni felmérések és fotódokumentációk</p>
          </div>
          {currentUser && (
            <Link href={`${navPrefix}/felmeres/uj`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új felmérés
            </Link>
          )}
        </div>
      </div>

      {/* ── Active / Done tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0' }}>
        {[
          { key: 'active', label: 'Aktív',   count: activeCount },
          { key: 'done',   label: 'Lezárt',  count: doneCount   },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.75rem',
              fontSize: '0.875rem', fontWeight: tab === key ? 700 : 500,
              color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {label}
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-pill)',
              background: tab === key ? 'var(--accent)' : 'var(--bg-subtle)',
              color: tab === key ? '#fff' : 'var(--text-muted)',
            }}>{count}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Keresés cím, ügyfél, helyszín alapján…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Ruler size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {search ? 'Nincs találat' : 'Nincsenek felmérések'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {search ? 'Próbáljon más keresési feltételt.' : 'Hozza létre az első felmérést.'}
          </p>
          {!search && isAdmin && (
            <Link href={`${navPrefix}/felmeres/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Új felmérés</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '0.75rem' }}>
          {filtered.map(survey => {
            const client   = clients.find(c => c.id === survey.client_id);
            const creator  = users.find(u => u.id === survey.created_by);
            const status   = getSurveyStatusBadge(survey.status);
            const previews = survey._preview_urls || [];

            return (
              <Link
                key={survey.id}
                href={`${navPrefix}/felmeres/${survey.id}`}
                className="card card-interactive"
                style={{ padding: 0, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
              >
                {/* ── Photo strip / colour header ── */}
                {previews.length === 0 ? (
                  <div style={{ height: 72, background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 60%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    <Ruler size={48} color="rgba(255,255,255,0.12)" style={{ position: 'absolute', right: 16, bottom: -8, transform: 'rotate(-15deg)' }} />
                    <LayoutPanelLeft size={28} color="rgba(255,255,255,0.35)" />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(previews.length, 4)}, 1fr)`, height: 90, overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
                    {previews.map((url, i) => (
                      <div key={i} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                        {/* overlay showing remaining count on last visible cell */}
                        {i === 3 && survey._photo_count > 4 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>+{survey._photo_count - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Card body ── */}
                <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>

                  {/* Title row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{survey.title}</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: status.bg, color: status.color, border: `1px solid ${status.border}`, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {status.icon}{status.label}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {client && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            <User size={12} /> {client.name}
                          </span>
                        )}
                        {survey.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin size={12} /> {survey.location}
                          </span>
                        )}
                        {survey.date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Calendar size={12} /> {formatDate(survey.date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(survey); }}
                        className="btn btn-danger btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Creator + timestamp */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {creator && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.72rem', fontWeight: 700,
                        padding: '0.18rem 0.55rem', borderRadius: 'var(--radius-pill)',
                        background: creator.id === currentUser?.id ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-subtle)',
                        color: creator.id === currentUser?.id ? 'var(--primary)' : 'var(--text-secondary)',
                        border: `1px solid ${creator.id === currentUser?.id ? 'var(--primary)33' : 'var(--border-subtle)'}`,
                      }}>
                        <User size={10} /> {creator.id === currentUser?.id ? 'Én' : creator.display_name}
                      </span>
                    )}
                    {survey.created_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <Clock size={10} />
                        {new Date(survey.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Stale warning — active survey not touched in 90+ days */}
                  {isStale(survey) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <AlertTriangle size={11} />
                        {Math.floor((Date.now() - new Date(survey.updated_at || survey.created_at).getTime()) / 86400_000)} napja nem szerkesztett
                      </span>
                      <button
                        type="button"
                        disabled={closingId === survey.id}
                        onClick={e => handleQuickClose(e, survey)}
                        style={{ background: 'var(--warning-text)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
                      >
                        <CheckCircle2 size={10} /> Lezárás
                      </button>
                    </div>
                  )}

                  {/* Stats pills */}
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {survey._section_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                        <Grid3x3 size={11} /> {survey._section_count} szekció
                      </span>
                    )}
                    {[
                      { icon: <LayoutPanelLeft size={11} />, label: 'alaprajz', count: survey._layout_count  || 0 },
                      { icon: <Camera         size={11} />, label: 'fotó',      count: survey._photo_count   || 0 },
                      { icon: <PenLine        size={11} />, label: 'vázlat',    count: survey._drawing_count || 0 },
                    ].map(({ icon, label, count }) => (
                      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: count > 0 ? 'var(--bg-subtle)' : 'var(--bg-subtle)', border: `1px solid ${count > 0 ? 'var(--border-subtle)' : 'var(--border-subtle)'}`, color: count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {icon} {count} {label}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Felmérés törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
