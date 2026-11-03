'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import Modal, { AlertModal } from '@/components/Modal';
import { Ruler, FileText, FolderKanban, CalendarDays, Plus, Loader2 } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Inline new-client sub-form
function NewClientInline({ onCreated, onCancel }) {
  const { createClient } = useApp();
  const t = useTranslations('calendar');
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gdpr,  setGdpr]  = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  async function handleCreate() {
    if (!name.trim()) { setErr(t('clientNameRequired')); return; }
    if (!gdpr)        { setErr(t('gdprRequired')); return; }
    setBusy(true);
    try {
      const client = await createClient({ name: name.trim(), phone, email, gdprConsent: true });
      onCreated(client);
    } catch (e) {
      setErr(e.message || t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)', padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {err && <div style={{ fontSize: 12, color: 'var(--danger-text)' }}>{err}</div>}
      <input className="form-control" autoFocus placeholder={t('clientNamePh')} value={name} onChange={e => setName(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="form-control" type="tel"   placeholder={t('phonePh')} value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="form-control" type="email" placeholder={t('emailPh')}  value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
        padding: '8px 10px', borderRadius: 'var(--radius-md)',
        background: gdpr ? 'var(--success-bg)' : '#fff',
        border: `1px solid ${gdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`,
      }}>
        <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
          style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {t('gdprConsent')} <span style={{ color: 'var(--danger-text)' }}>*</span>
        </span>
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={busy || !gdpr}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null} {t('create')}
        </button>
      </div>
    </div>
  );
}

export default function NewAppointmentModal({ isOpen, onClose, defaultDate }) {
  const { clients } = useApp();
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
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
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
              className="form-control"
              autoFocus
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
              <input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('timeLabel')}</label>
              <input className="form-control" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Client */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>{t('clientLabel')}</label>
              {!showNewClient && (
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                    color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  <Plus size={13} /> {t('newClientBtn')}
                </button>
              )}
            </div>
            {showNewClient ? (
              <NewClientInline
                onCreated={client => { setClientId(client.id); setShowNewClient(false); }}
                onCancel={() => setShowNewClient(false)}
              />
            ) : (
              <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">{t('noClientOption')}</option>
                {(clients || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
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
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || showNewClient}
            style={{ width: '100%', marginTop: 4 }}
          >
            {saving ? t('saving') : t('save')}
          </button>

        </div>
      </Modal>

      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={t('errorTitle')}
        message={alert}
      />
    </>
  );
}
