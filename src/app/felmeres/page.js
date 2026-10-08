'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { Ruler, Plus, MapPin, Calendar, User, FileText, FolderKanban, Trash2 } from 'lucide-react';

function getSurveyStatus(surveyId, quotes, projects) {
  const linkedProject = projects.find(p => p.survey_id === surveyId);
  if (linkedProject) return { label: 'Projekt létrehozva', bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' };
  const linkedQuote = quotes.find(q => q.survey_id === surveyId);
  if (linkedQuote) return { label: 'Ajánlat létrehozva', bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' };
  return { label: 'Nincs ajánlat', bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };
}

export default function SurveyListPage() {
  const { loading, dataReady, surveys, quotes, projects, clients, isAdmin, currentUser, deleteSurvey } = useApp();

  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (loading || !dataReady) return (
    <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>
  );

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);

  const filtered = surveys.filter(s => {
    if (!q) return true;
    const client = clients.find(c => c.id === s.client_id);
    return norm(s.title).includes(q) || norm(client?.name).includes(q) || norm(s.location).includes(q);
  });

  const handleDelete = (survey) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést?`,
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
            <h1 className="page-title">Felmérések</h1>
            <p className="page-subtitle">Helyszíni felmérések és fotódokumentációk</p>
          </div>
          {isAdmin && (
            <Link href="/felmeres/uj" className="btn btn-primary btn-sm">
              <Plus size={15} /> Új felmérés
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
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
            <Link href="/felmeres/uj" className="btn btn-primary btn-sm"><Plus size={15} /> Új felmérés</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.65rem' }}>
          {filtered.map(survey => {
            const client = clients.find(c => c.id === survey.client_id);
            const status = getSurveyStatus(survey.id, quotes, projects);
            const canDelete = isAdmin;
            return (
              <Link
                key={survey.id}
                href={`/felmeres/${survey.id}`}
                className="card card-interactive"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{survey.title}</h3>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: status.bg, color: status.color, border: `1px solid ${status.border}`, whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
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
                  {canDelete && (
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
