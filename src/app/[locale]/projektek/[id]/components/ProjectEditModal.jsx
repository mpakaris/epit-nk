'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, ChevronUp, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';

const nextDay  = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };
const todayStr = () => new Date().toISOString().split('T')[0];

export default function ProjectEditModal({ isOpen, onClose, project, clients, onSave, onCreateClient }) {
  const t = useTranslations('projectDetail');
  const [name,      setName]      = useState('');
  const [desc,      setDesc]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [clientId,  setClientId]  = useState('');
  const [error,     setError]     = useState('');

  // 'idle' | 'pending' | 'saving' | 'saved'
  const [saveStatus, setSaveStatus] = useState('idle');

  const [showNewClient,    setShowNewClient]    = useState(false);
  const [newClientName,    setNewClientName]    = useState('');
  const [newClientPhone,   setNewClientPhone]   = useState('');
  const [newClientEmail,   setNewClientEmail]   = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientError,   setNewClientError]   = useState('');
  const [creatingClient,   setCreatingClient]   = useState(false);

  const savedRef   = useRef(null);
  const timerRef   = useRef(null);
  const savedTimer = useRef(null);

  useEffect(() => {
    if (!isOpen || !project) return;
    setName(project.name || '');
    setDesc(project.description || '');
    setStartDate(project.start_date || '');
    setEndDate(project.end_date || '');
    setClientId(project.client_id || '');
    setError(''); setSaveStatus('idle');
    setShowNewClient(false);
    savedRef.current = snap(project.name || '', project.description || '', project.start_date || '', project.end_date || '', project.client_id || '');
  }, [isOpen, project?.id]);

  const snap = (n, d, s, e, c) => JSON.stringify({ n, d, s, e, c });

  useEffect(() => {
    if (!isOpen || savedRef.current === null) return;
    const current = snap(name, desc, startDate, endDate, clientId);
    if (current === savedRef.current) return;
    if (!name.trim()) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave({
          name:        name.trim(),
          description: desc.trim() || null,
          start_date:  startDate || null,
          end_date:    endDate || null,
          client_id:   clientId || null,
        });
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || t('saveError'));
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [name, desc, startDate, endDate, clientId]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) { setNewClientError(t('clientNameRequired')); return; }
    setCreatingClient(true); setNewClientError('');
    try {
      const c = await onCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddress.trim() });
      setClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) { setNewClientError(err.message || t('createClientError')); }
    finally { setCreatingClient(false); }
  };

  const selectedClient = (clients || []).find(c => c.id === clientId);

  const SaveIndicator = () => {
    if (saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> {t('savingText')}
      </span>
    );
    if (saveStatus === 'saved') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}>
        <Check size={12} /> {t('savedText')}
      </span>
    );
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editModalTitle')}>
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <div>
        <div className="form-group">
          <label className="form-label">{t('projectNameLabel')}</label>
          <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('descriptionLabel')}</label>
          <textarea rows={2} className="form-control" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('startLabel')}</label>
            <input type="date" className="form-control" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('endLabel')}</label>
            <input type="date" className="form-control" min={startDate ? nextDay(startDate) : todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">{t('clientLabel')}</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">{t('noClientOption')}</option>
              {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowNewClient(v => !v)}>
              {showNewClient ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showNewClient ? t('closeBtn') : t('newClientBtn')}
            </button>
          </div>
          {selectedClient && !showNewClient && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
            </div>
          )}
        </div>
        {showNewClient && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>{t('newClientSection')}</div>
            <ErrorBanner message={newClientError} style={{ marginBottom: '0.65rem' }} />
            <div className="form-group"><label className="form-label">{t('newClientNameLabel')}</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder={t('newClientNamePh')} /></div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">{t('newClientPhoneLabel')}</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">{t('newClientEmailLabel')}</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">{t('newClientAddressLabel')}</label><input type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>{creatingClient ? <><Loader2 size={13} className="animate-spin" />{t('creatingClientBtn')}</> : t('createClientBtn')}</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex' }}>
          <SaveIndicator />
        </div>
      </div>
    </Modal>
  );
}
