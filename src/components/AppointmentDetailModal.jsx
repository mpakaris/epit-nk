'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { AlertTriangle, ExternalLink, Ruler, FileText, FolderKanban, CalendarDays, Loader2 } from 'lucide-react';

const TYPE_ICON  = { felmeres: Ruler, ajanlat: FileText, projekt: FolderKanban };
const TYPE_COLOR = { felmeres: '#2563eb', ajanlat: '#7c3aed', projekt: '#059669' };
const TYPE_ROUTE = { felmeres: 'felmeres', ajanlat: 'ajanlatok', projekt: 'projektek' };

// Pods-style input — no border, shadow only
const INPUT = {
  width: '100%', boxSizing: 'border-box', height: 52,
  border: 0, borderRadius: 14,
  background: '#fff', padding: '0 14px', fontSize: 15,
  fontWeight: 500, color: 'var(--text-primary)',
  boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 8px 16px -10px rgba(14,17,22,0.4)',
  outline: 0, WebkitAppearance: 'none', appearance: 'none',
  fontFamily: 'inherit',
};

export default function AppointmentDetailModal({ apptId, isOpen, onClose, onChanged }) {
  const router = useRouter();
  const { clients, isDemoMode } = useApp();
  const t = useTranslations('calendar');
  const TYPE_LABEL = { felmeres: t('linkSurvey'), ajanlat: t('linkQuote'), projekt: t('linkProject') };
  const navPrefix = isDemoMode ? '/demo' : '';

  const [appt,             setAppt]             = useState(null);
  const [linkedDocDeleted, setLinkedDocDeleted]  = useState(false);
  const [linkedDocHref,    setLinkedDocHref]     = useState(null);
  const [loading,          setLoading]           = useState(true);

  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [clientId, setClientId] = useState('');

  const [saving,     setSaving]     = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [alert,      setAlert]      = useState(null);

  useEffect(() => {
    if (!isOpen || !apptId) return;
    setLoading(true);
    fetch(`/api/appointments/${apptId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(({ appointment, linkedDocDeleted, linkedDocHref }) => {
        setAppt(appointment);
        setLinkedDocDeleted(linkedDocDeleted);
        setLinkedDocHref(linkedDocHref);
        setTitle(appointment.title || '');
        setDate(appointment.date || '');
        setTime(appointment.time?.slice(0, 5) || '');
        setClientId(appointment.client_id || '');
      })
      .catch(() => setAlert(t('notFound')))
      .finally(() => setLoading(false));
  }, [isOpen, apptId]);

  async function handleSave() {
    if (!title.trim()) { setAlert(t('titleRequired')); return; }
    setSaving(true);
    const res = await fetch(`/api/appointments/${apptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), date, time: time || null, client_id: clientId || null }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlert(error || t('saveError'));
    } else {
      onChanged?.();
      onClose();
    }
    setSaving(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/appointments/${apptId}`, { method: 'DELETE' });
    if (!res.ok) { setAlert(t('deleteError')); return; }
    onChanged?.();
    onClose();
  }

  async function handleRecreate() {
    if (!appt?.link_type) return;
    setRecreating(true);

    const docEndpoint =
      appt.link_type === 'felmeres' ? '/api/surveys' :
      appt.link_type === 'ajanlat'  ? '/api/quotes'  :
                                      '/api/projects';

    const body = appt.link_type === 'projekt'
      ? { name: appt.title, collective_id: appt.collective_id || null, client_id: appt.client_id || null, startDate: appt.date }
      : { title: appt.title, collective_id: appt.collective_id || null, client_id: appt.client_id || null, date: appt.date };

    const docRes = await fetch(docEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!docRes.ok) {
      const { error } = await docRes.json().catch(() => ({}));
      setAlert(error || t('createDocError'));
      setRecreating(false);
      return;
    }
    const docData = await docRes.json();
    const newDocId = docData.survey?.id || docData.quote?.id || docData.project?.id;

    const linkField =
      appt.link_type === 'felmeres' ? 'linked_survey_id' :
      appt.link_type === 'ajanlat'  ? 'linked_quote_id'  :
                                      'linked_project_id';
    await fetch(`/api/appointments/${apptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [linkField]: newDocId }),
    });

    onChanged?.();
    onClose();
    router.push(`${navPrefix}/${TYPE_ROUTE[appt.link_type]}/${newDocId}`);
  }

  const Icon  = appt?.link_type ? TYPE_ICON[appt.link_type]  : CalendarDays;
  const color = appt?.link_type ? TYPE_COLOR[appt.link_type] : 'var(--accent)';
  const label = appt?.link_type ? TYPE_LABEL[appt.link_type] : null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('editAppointment')}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 size={24} className="animate-spin" color="var(--text-muted)" />
          </div>
        ) : appt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Title */}
            <div>
              <label className="form-label">{t('titleLabel')}</label>
              <input
                autoFocus
                style={INPUT}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            {/* Date + Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">{t('dateLabel')}</label>
                <input type="date" style={INPUT} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">{t('timeLabel')}</label>
                <input type="time" style={INPUT} value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="form-label">{t('clientLabel')}</label>
              <select style={INPUT} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">{t('noClientOption')}</option>
                {(clients || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Linked doc — deleted */}
            {label && linkedDocDeleted && (
              <div style={{
                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--warning-text)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-text)' }}>
                    {t('linkedDocDeleted', { label: label.toLowerCase() })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {t('recreatePrompt', { title: appt.title })}
                </p>
                <button
                  type="button"
                  onClick={handleRecreate}
                  disabled={recreating}
                  style={{
                    alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
                    height: 36, padding: '0 16px', border: 0, borderRadius: 18,
                    background: 'var(--warning-text)', color: '#fff',
                    fontSize: 13, fontWeight: 700, cursor: recreating ? 'default' : 'pointer',
                  }}
                >
                  {recreating ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                  {t('recreateBtn', { label })}
                </button>
              </div>
            )}

            {/* Linked doc — exists */}
            {label && !linkedDocDeleted && linkedDocHref && (
              <button
                type="button"
                onClick={() => { onClose(); router.push(`${navPrefix}${linkedDocHref}`); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: 14,
                  background: `${color}10`, border: `1.5px solid ${color}30`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <Icon size={18} color={color} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color }}>
                  {t('openDoc', { label })}
                </span>
                <ExternalLink size={14} color={color} />
              </button>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', height: 52, border: 0, borderRadius: 26,
                background: saving ? 'var(--text-muted)' : 'var(--primary)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? t('saving') : t('save')}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              style={{
                width: '100%', height: 52, border: 0, borderRadius: 26,
                background: 'var(--danger)', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {t('delete')}
            </button>

          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => { setConfirmDel(false); handleDelete(); }}
        title={t('deleteTitle')}
        message={t('deleteConfirm', { title: appt?.title ?? '' })}
        confirmLabel={t('delete')}
      />
      <AlertModal isOpen={!!alert} onClose={() => setAlert(null)} title={t('errorTitle')} message={alert} />
    </>
  );
}
