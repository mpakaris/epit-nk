'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  Ruler, Plus, MapPin, Calendar, User, Trash2,
  LayoutPanelLeft, Camera, PenLine, Grid3x3,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceBadge from '@/components/WorkspaceBadge';

function getSurveyStatus(surveyId, quotes, projects) {
  const linkedProject = projects.find(p => p.survey_id === surveyId);
  if (linkedProject) return { label: 'Projekt létrehozva', bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' };
  const linkedQuote = quotes.find(q => q.survey_id === surveyId);
  if (linkedQuote) return { label: 'Ajánlat létrehozva', bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' };
  return { label: 'Nincs ajánlat', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };
}

export default function SurveyListPage() {
  const { loading, dataReady, surveys, quotes, projects, clients, users, isAdmin, currentUser, deleteSurvey, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (loading || !dataReady) return <PageSpinner />;

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);

  const filtered = surveys.filter(s => {
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
            const status   = getSurveyStatus(survey.id, quotes, projects);
            const previews = survey._preview_urls || [];

            return (
              <Link
                key={survey.id}
                href={`${navPrefix}/felmeres/${survey.id}`}
                className="card card-interactive"
                style={{ padding: 0, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
              >
                {/* ── Photo strip ── */}
                {previews.length > 0 && (
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
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: status.bg, color: status.color, border: `1px solid ${status.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {status.label}
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

                  {/* Creator */}
                  {creator && creator.id !== currentUser?.id && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={11} /> {creator.display_name}
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
