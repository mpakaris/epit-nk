'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import NewClientModal from '@/components/NewClientModal';

const nextDay  = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };
const todayStr = () => new Date().toISOString().split('T')[0];

const LABEL = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: '#5A5F68',
  marginBottom: 6,
};

export default function ProjectEditModal({ isOpen, onClose, project, clients, onSave, onCreateClient }) {
  const t = useTranslations('projectDetail');
  const [name,      setName]      = useState('');
  const [desc,      setDesc]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [clientId,  setClientId]  = useState('');
  const [error,     setError]     = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

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

  const selectedClient = (clients || []).find(c => c.id === clientId);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('editModalTitle')}>
        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name */}
          <div>
            <label style={LABEL}>{t('projectNameLabel')}</label>
            <input type="text" className="dk-input" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label style={LABEL}>{t('descriptionLabel')}</label>
            <textarea rows={2} className="dk-input" value={desc} onChange={e => setDesc(e.target.value)}style={{ height: 'auto', padding: '12px 14px', resize: 'none' }} />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>{t('startLabel')}</label>
              <input type="date" className="dk-input" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
            </div>
            <div>
              <label style={LABEL}>{t('endLabel')}</label>
              <input type="date" className="dk-input" min={startDate ? nextDay(startDate) : todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Client */}
          <div>
            <label style={LABEL}>{t('clientLabel')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="dk-input" value={clientId} onChange={e => setClientId(e.target.value)}style={{ flex: 1 }}>
                <option value="">{t('noClientOption')}</option>
                {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNewClientModal(true)}
                style={{ width: 46, height: 46, borderRadius: '50%', border: 0, flexShrink: 0, background: '#263248', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label={t('newClientBtn')}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
            {selectedClient && (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#263248' }}>
                {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: saveStatus === 'saved' ? '#16a34a' : '#5A5F68', minHeight: 20 }}>
              {saveStatus === 'saving' || saveStatus === 'pending'
                ? <><Loader2 size={12} className="animate-spin" /> {t('savingText')}</>
                : saveStatus === 'saved'
                  ? <><Check size={12} /> {t('savedText')}</>
                  : null
              }
            </div>
            <button type="button" className="dk-btn dk-btn-dark" onClick={onClose}>
              {t('closeBtn')}
            </button>
          </div>

        </div>
      </Modal>

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={async (fields) => {
          const c = await onCreateClient(fields);
          setClientId(c.id);
          setShowNewClientModal(false);
        }}
      />
    </>
  );
}
