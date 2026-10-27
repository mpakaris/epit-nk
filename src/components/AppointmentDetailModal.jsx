'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { AlertTriangle, ExternalLink, Ruler, FileText, FolderKanban, CalendarDays, Loader2 } from 'lucide-react';

const TYPE_LABEL = { felmeres: 'Felmérés', ajanlat: 'Ajánlat', projekt: 'Projekt' };
const TYPE_ICON  = { felmeres: Ruler, ajanlat: FileText, projekt: FolderKanban };
const TYPE_COLOR = { felmeres: '#2563eb', ajanlat: '#7c3aed', projekt: '#059669' };
const TYPE_ROUTE = { felmeres: 'felmeres', ajanlat: 'ajanlatok', projekt: 'projektek' };

export default function AppointmentDetailModal({ apptId, isOpen, onClose, onChanged }) {
  const router = useRouter();
  const { clients, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [appt,            setAppt]            = useState(null);
  const [linkedDocDeleted, setLinkedDocDeleted] = useState(false);
  const [linkedDocHref,    setLinkedDocHref]    = useState(null);
  const [loading,         setLoading]         = useState(true);

  // Editable fields
  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [clientId, setClientId] = useState('');

  const [saving,      setSaving]      = useState(false);
  const [recreating,  setRecreating]  = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [alert,       setAlert]       = useState(null);

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
      .catch(() => setAlert('Az időpont nem található.'))
      .finally(() => setLoading(false));
  }, [isOpen, apptId]);

  async function handleSave() {
    if (!title.trim()) { setAlert('A cím kötelező.'); return; }
    setSaving(true);
    const res = await fetch(`/api/appointments/${apptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), date, time: time || null, client_id: clientId || null }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlert(error || 'Hiba a mentéskor.');
    } else {
      onChanged?.();
      onClose();
    }
    setSaving(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/appointments/${apptId}`, { method: 'DELETE' });
    if (!res.ok) { setAlert('Hiba a törléskor.'); return; }
    onChanged?.();
    onClose();
  }

  async function handleRecreate() {
    if (!appt?.link_type) return;
    setRecreating(true);

    // Create the linked document
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
      setAlert(error || 'Hiba a dokumentum létrehozásakor.');
      setRecreating(false);
      return;
    }
    const docData = await docRes.json();
    const newDocId = docData.survey?.id || docData.quote?.id || docData.project?.id;

    // Link new doc to appointment
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
      <Modal isOpen={isOpen} onClose={onClose} title="Időpont">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 size={24} className="animate-spin" color="var(--text-muted)" />
          </div>
        ) : appt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Title */}
            <div>
              <label className="form-label">Cím</label>
              <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Date + Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Dátum</label>
                <input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Időpont</label>
                <input className="form-control" type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="form-label">Ügyfél</label>
              <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Nincs ügyfél —</option>
                {(clients || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Linked doc — deleted */}
            {label && linkedDocDeleted && (
              <div style={{
                background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--warning-text)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-text)' }}>
                    A kapcsolt {label.toLowerCase()} törölve lett.
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Létrehozzuk újra a(z) „{appt.title}" dokumentumot és összekapcsoljuk?
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRecreate}
                  disabled={recreating}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {recreating
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Icon size={13} />
                  }
                  Igen, új {label} →
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
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: `${color}10`, border: `1.5px solid ${color}30`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <Icon size={18} color={color} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color }}>
                  Megnyitás: {label}
                </span>
                <ExternalLink size={14} color={color} />
              </button>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmDel(true)}
                style={{ marginRight: 'auto' }}
              >
                Törlés
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Mégse
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Mentés…' : 'Mentés'}
              </button>
            </div>

          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => { setConfirmDel(false); handleDelete(); }}
        title="Időpont törlése"
        message={`Biztosan törölni kívánja a(z) „${appt?.title}" időpontot?`}
        confirmLabel="Törlés"
      />
      <AlertModal isOpen={!!alert} onClose={() => setAlert(null)} title="Hiba" message={alert} />
    </>
  );
}
