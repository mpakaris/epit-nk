'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import Modal, { AlertModal } from '@/components/Modal';
import QuickClientSheet from '@/app/[locale]/ajanlatok/mobile/QuickClientSheet';
import { Ruler, FileText, FolderKanban, CalendarDays, Plus, Loader2 } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

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

export default function NewAppointmentModal({ isOpen, onClose, defaultDate }) {
  const { clients, createClient } = useApp();
  const t = useTranslations('calendar');
  const LINK_TYPES = [
    { id: null,       label: t('linkNone'),    icon: null          },
    { id: 'felmeres', label: t('linkSurvey'),  icon: Ruler,        color: '#2563eb' },
    { id: 'ajanlat',  label: t('linkQuote'),   icon: FileText,     color: '#7c3aed' },
    { id: 'projekt',  label: t('linkProject'), icon: FolderKanban, color: '#059669' },
  ];

  const [title,         setTitle]         = useState('');
  const [date,          setDate]          = useState(defaultDate || todayStr());
  const [time,          setTime]          = useState('09:00');
  const [clientId,      setClientId]      = useState('');
  const [linkType,      setLinkType]      = useState('felmeres');
  const [saving,        setSaving]        = useState(false);
  const [alert,         setAlert]         = useState(null);
  const [successMsg,    setSuccessMsg]    = useState('');
  const [showNewClient, setShowNewClient] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDate(defaultDate || todayStr());
      setTime('09:00');
      setClientId('');
      setLinkType('felmeres');
      setSaving(false);
      setSuccessMsg('');
      setShowNewClient(false);
    }
  }, [isOpen, defaultDate]);

  async function handleSave() {
    if (!title.trim()) { setAlert(t('titleRequired')); return; }
    setSaving(true);

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, time: time || null, client_id: clientId || null, link_type: linkType }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlert(error || t('genericError'));
      setSaving(false);
      return;
    }

    const { linkedDoc, linkedType } = await res.json();
    setSaving(false);

    if (linkedDoc && linkedType) {
      const typeLabel = linkedType === 'felmeres' ? t('linkSurvey') : linkedType === 'ajanlat' ? t('linkQuote') : t('linkProject');
      setSuccessMsg(t('docCreatedMsg', { typeLabel, docName: linkedDoc.title || linkedDoc.name }));
    } else {
      onClose();
    }
  }

  if (successMsg) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('appointmentSaved')}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--success-bg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <CalendarDays size={24} color="var(--success-text)" />
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('appointmentRecorded')}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {successMsg}
          </p>
        </div>
        <button
          style={{ width: '100%', height: 56, border: 0, borderRadius: 28, background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
          onClick={onClose}
        >
          {t('close')}
        </button>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('newAppointment')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <label className="form-label">{t('titleLabel')}</label>
            <input
              autoFocus
              style={INPUT}
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !showNewClient && handleSave()}
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={{ ...INPUT, flex: 1, paddingRight: 36 }} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">{t('noClientOption')}</option>
                {(clients || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                aria-label={t('newClientBtn')}
                style={{ flexShrink: 0, width: 52, height: 52, border: 0, borderRadius: '50%', background: 'var(--primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Link type */}
          <div>
            <label className="form-label">{t('createDocumentLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {LINK_TYPES.map(({ id, label, icon: Icon, color }) => {
                const active = linkType === id;
                return (
                  <button
                    key={String(id)}
                    type="button"
                    onClick={() => setLinkType(id)}
                    style={{
                      padding: '8px 4px', borderRadius: 'var(--radius-md)',
                      border: active ? `2px solid ${color || 'var(--border-subtle)'}` : '2px solid var(--border-subtle)',
                      background: active ? (color ? `${color}12` : 'var(--bg-subtle)') : '#fff',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    {Icon
                      ? <Icon size={16} color={active ? color : 'var(--text-muted)'} />
                      : <CalendarDays size={16} color={active ? 'var(--text-primary)' : 'var(--text-muted)'} />
                    }
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? (color || 'var(--text-primary)') : 'var(--text-muted)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', height: 56, border: 0, borderRadius: 28,
              background: saving ? 'var(--text-muted)' : 'var(--primary)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? t('saving') : t('save')}
          </button>

        </div>
      </Modal>

      {/* QuickClientSheet — rendered above the modal (zIndex 400 > modal 300) */}
      {showNewClient && isOpen && (
        <>
          <div
            onClick={() => setShowNewClient(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 395, background: 'rgba(14,17,22,0.4)' }}
          />
          <QuickClientSheet
            zIndex={400}
            createClient={createClient}
            onCreated={client => { setClientId(client.id); setShowNewClient(false); }}
            onBack={() => setShowNewClient(false)}
            onClose={() => setShowNewClient(false)}
          />
        </>
      )}

      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={t('errorTitle')}
        message={alert}
      />
    </>
  );
}
