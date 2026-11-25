'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Shared "Create new client" modal — used in surveys, quotes, projects, etc.
 *
 * Props:
 *   isOpen         — boolean
 *   onClose()      — close without result
 *   onCreated(client) — called with the new client object after successful save
 */
export default function NewClientModal({ isOpen, onClose, onCreated }) {
  const t  = useTranslations('surveys');
  const tc = useTranslations('common');
  const { createClient } = useApp();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [gdpr,    setGdpr]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(''); setEmail(''); setPhone(''); setGdpr(false); setError(''); setSaving(false);
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim())  { setError(t('newClientNameRequired')); return; }
    if (!gdpr)         { setError(t('newClientGdprRequired')); return; }
    setSaving(true); setError('');
    try {
      const client = await createClient({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, gdprConsent: true });
      onCreated?.(client);
      onClose();
    } catch (err) {
      setError(err.message || t('errorUnknown'));
      setSaving(false);
    }
  };

  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 };
  const inputSt = { background: '#F4F5F8', boxShadow: 'none' };

  return (
    <Modal isOpen={isOpen} onClose={saving ? undefined : onClose} title={t('newClientTitle')} maxWidth="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {error && (
          <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('newClientNameLabel')}</span>
          <input type="text" className="dk-input" autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="Horváth Béla" style={inputSt} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('newClientEmailLabel')}</span>
          <input type="email" className="dk-input" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="pl. horvath@email.hu" style={inputSt} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('newClientPhoneLabel')}</span>
          <input type="tel" className="dk-input" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+36 30 123 4567" style={inputSt} />
        </label>

        {/* GDPR consent */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '12px 14px', background: gdpr ? '#D9F2EE' : '#F4F5F8', borderRadius: 14, transition: 'background 0.15s' }}>
          <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: '#0A7F72', flexShrink: 0, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: gdpr ? '#0A5C53' : '#5A5F68', lineHeight: 1.5 }}>
            {t('newClientGdprText')}
          </span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={onClose} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {tc('cancel')}
          </button>
          <button type="button" className="dk-btn dk-btn-dark" onClick={handleSave} disabled={saving || !gdpr || !name.trim()} style={{ flex: 1, justifyContent: 'center', opacity: (saving || !gdpr || !name.trim()) ? 0.5 : 1 }}>
            {saving ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{tc('saving')}</> : t('newClientButton')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
