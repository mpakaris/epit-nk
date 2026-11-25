'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import WorkTypeSelector from './WorkTypeSelector';

const LABEL = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: '#5A5F68',
  marginBottom: 6,
};

export default function RoomModal({ isOpen, onClose, room, onSave, onDelete, canEdit = true }) {
  const t = useTranslations('projectDetail');
  const [name,        setName]        = useState('');
  const [sizeM2,      setSizeM2]      = useState('');
  const [workTypes,   setWorkTypes]   = useState([]);
  const [description, setDescription] = useState('');
  const [error,       setError]       = useState('');
  const [saveStatus,  setSaveStatus]  = useState('idle');

  const isEdit = !!room;

  const savedRef    = useRef(null);
  const timerRef    = useRef(null);
  const savedTimer  = useRef(null);
  const creatingRef = useRef(false);

  const snap = (n, s, wt, d) => JSON.stringify({ n, s, wt: [...wt].sort(), d });

  useEffect(() => {
    if (isOpen) {
      setName(room?.name || '');
      setSizeM2(room?.size_m2 != null ? String(room.size_m2) : '');
      setWorkTypes(room?.work_types || []);
      setDescription(room?.description || '');
      setError(''); setSaveStatus('idle');
      creatingRef.current = false;
      savedRef.current = isEdit
        ? snap(room.name || '', String(room.size_m2 ?? ''), room.work_types || [], room.description || '')
        : null;
    }
  }, [isOpen, room?.id]);

  const buildPayload = () => ({
    name: name.trim(),
    size_m2: sizeM2 !== '' ? Number(sizeM2) : null,
    work_types: workTypes,
    description: description.trim() || null,
  });

  useEffect(() => {
    if (!canEdit) return;

    if (!isEdit) {
      if (!name.trim() || creatingRef.current) return;
      clearTimeout(timerRef.current);
      setSaveStatus('pending');
      timerRef.current = setTimeout(async () => {
        if (creatingRef.current) return;
        creatingRef.current = true;
        setSaveStatus('saving');
        try {
          await onSave(buildPayload());
          onClose();
        } catch (err) { setError(err.message || t('saveError')); setSaveStatus('idle'); creatingRef.current = false; }
      }, 800);
      return () => clearTimeout(timerRef.current);
    }

    if (savedRef.current === null) return;
    const current = snap(name, sizeM2, workTypes, description);
    if (current === savedRef.current) return;
    if (!name.trim()) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(buildPayload());
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || t('saveError'));
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [name, sizeM2, workTypes, description]);

  const handleClose = async () => {
    if (!isEdit && canEdit && name.trim() && !creatingRef.current) {
      clearTimeout(timerRef.current);
      creatingRef.current = true;
      try { await onSave(buildPayload()); } catch { /* swallow */ }
    }
    onClose();
  };

  if (!isOpen) return null;

  const title = canEdit ? (isEdit ? t('roomEditTitle') : t('roomNewTitle')) : t('roomViewTitle');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      {error && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name */}
        <div>
          <label style={LABEL}>{t('roomNameLabel')}</label>
          <input
            type="text"
            className="dk-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('roomNamePh')}
            disabled={!canEdit}
           
          />
        </div>

        {/* Area */}
        <div>
          <label style={LABEL}>{t('roomAreaLabel')}</label>
          <input
            type="number"
            min="0"
            step="0.1"
            className="dk-input"
            value={sizeM2}
            onChange={e => setSizeM2(e.target.value)}
            placeholder={t('roomAreaPh')}
            disabled={!canEdit}
           
          />
        </div>

        {/* Description */}
        <div>
          <label style={LABEL}>{t('roomDescLabel')}</label>
          <textarea
            rows={2}
            className="dk-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!canEdit}
           style={{ height: 'auto', padding: '12px 14px', resize: 'none' }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, minHeight: 20, color: saveStatus === 'saved' ? '#16a34a' : '#5A5F68' }}>
            {canEdit && (saveStatus === 'pending' || saveStatus === 'saving')
              ? <><Loader2 size={12} className="animate-spin" /> {t('savingText')}</>
              : canEdit && saveStatus === 'saved'
                ? <><Check size={12} /> {t('savedText')}</>
                : null
            }
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isEdit && canEdit && onDelete && (
              <button type="button" className="dk-btn" onClick={onDelete}
                style={{ height: 44, padding: '0 18px', background: '#FEF2F2', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={15} /> {t('deleteLabel')}
              </button>
            )}
            <button type="button" className="dk-btn dk-btn-dark" onClick={handleClose}>
              {t('closeBtn')}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
