'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, Trash2, Send, FileText, X, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';

export const STATUS_DISPLAY = {
  pending:   { labelKey: 'statusPending',  bg: '#fefce8', color: '#a16207' },
  sent:      { labelKey: 'statusSent',     bg: '#eff6ff', color: '#1d4ed8' },
  paid:      { labelKey: 'statusPaid',     bg: '#f0fdf4', color: '#15803d' },
  cancelled: { labelKey: 'statusCanceled', bg: '#f8fafc', color: '#64748b' },
};

const DK_LABEL = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6 };

export default function PaymentPlanModal({
  isOpen, onClose,
  editItem,
  readOnly = false,
  onSave,           // (fields, file) => Promise — file may be null
  onSend,           // (toEmail) => Promise
  onStatusChange,   // (newStatus) => Promise
  onDelete,         // () => void
  clientEmail,
}) {
  const t = useTranslations('projectDetail');

  const [label,    setLabel]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [note,     setNote]     = useState('');
  const [file,          setFile]          = useState(null);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [changingStatus, setChangingStatus] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [marking,  setMarking]  = useState(false);
  const [error,    setError]    = useState('');
  const [sendEmail, setSendEmail] = useState('');
  const [showSend,  setShowSend]  = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const fileRef    = useRef(null);
  const savedRef   = useRef(null);
  const timerRef   = useRef(null);
  const savedTimer = useRef(null);

  const snap = (l, a, d, n) => JSON.stringify({ l, a, d, n });

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setSaving(false); setSending(false); setMarking(false);
    setShowSend(false); setFile(null); setSaveStatus('idle'); setChangingStatus(false);
    if (editItem) {
      setCurrentStatus(editItem.status || 'pending');
      setLabel(editItem.label || '');
      setAmount(editItem.amount_huf?.toString() || '');
      setDueDate(editItem.due_date || '');
      setNote(editItem.note || '');
      setSendEmail(clientEmail || '');
      savedRef.current = snap(editItem.label || '', editItem.amount_huf?.toString() || '', editItem.due_date || '', editItem.note || '');
    } else {
      setLabel(''); setAmount(''); setDueDate(''); setNote('');
      setSendEmail(clientEmail || '');
      savedRef.current = null;
    }
  }, [isOpen, editItem?.id]);

  // Auto-save in edit mode
  useEffect(() => {
    if (!editItem || !isOpen || savedRef.current === null || readOnly) return;
    const current = snap(label, amount, dueDate, note);
    if (current === savedRef.current) return;
    const amt = Math.round(Number(amount));
    if (!label.trim() || !amt || amt <= 0) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave({ label: label.trim(), amount_huf: amt, due_date: dueDate || null, note: note.trim() || null }, null);
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (e) {
        setError(e.message || t('saveError'));
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [label, amount, dueDate, note]);

  if (!isOpen) return null;

  const canSave = label.trim() && Number(amount) > 0;
  const existingFiles = editItem?.files || [];
  const hasFile = existingFiles.length > 0;
  const statusInfo = STATUS_DISPLAY[editItem?.status] || STATUS_DISPLAY.pending;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ label: label.trim(), amount_huf: Math.round(Number(amount)), due_date: dueDate || null, note: note.trim() || null }, file);
      onClose();
    } catch (e) {
      setError(e.message || t('saveError'));
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      await onSend(sendEmail.trim() || null);
      setShowSend(false);
      setSaveStatus('saved');
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      setError(e.message || t('saveError'));
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || changingStatus) return;
    setChangingStatus(true);
    setError('');
    try {
      await onStatusChange(newStatus);
      setCurrentStatus(newStatus);
    } catch (e) {
      setError(e.message || t('saveError'));
    } finally {
      setChangingStatus(false);
    }
  };

  const saveIndicator = saveStatus === 'idle' ? null
    : saveStatus === 'saved'
      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> {t('savedText')}</span>
      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}><Loader2 size={12} className="animate-spin" /> {t('savingText')}</span>;

  const title = editItem ? editItem.label : t('addPaymentItem');

  return (
    <>
    <Modal isOpen={isOpen && !showSend} onClose={onClose} title={title}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Status picker — edit mode only */}
      {editItem && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(STATUS_DISPLAY).map(([key, s]) => {
            const isActive = currentStatus === key;
            if (readOnly && !isActive) return null;
            return (
              <button key={key} type="button" disabled={changingStatus || readOnly} onClick={() => !readOnly && handleStatusChange(key)}
                style={{ height: 32, padding: '0 14px', borderRadius: 16, border: `1.5px solid ${isActive ? s.color : '#EDEBE5'}`, background: isActive ? s.bg : '#fff', color: isActive ? s.color : '#5A5F68', fontSize: 12, fontWeight: 700, cursor: (changingStatus || readOnly) ? 'default' : 'pointer', opacity: changingStatus && !isActive ? 0.5 : 1, transition: 'all 0.12s' }}>
                {t(s.labelKey)}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* File — always first */}
        <div>
          <label style={DK_LABEL}>{t('attachFile')}</label>
          {/* Existing files */}
          {existingFiles.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 6 }}>
              <FileText size={14} color="#15803d" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name || t('filesViewTitle')}</span>
              <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textDecoration: 'none' }}>{t('viewBtn')}</a>
            </div>
          ))}
          {/* New file picker — hidden in read-only mode */}
          {!readOnly && (file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <ImageIcon size={14} color="#1d4ed8" />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}><X size={14} /></button>
            </div>
          ) : (
            <button type="button" className="dk-btn" style={{ width: '100%', justifyContent: 'center', fontSize: 13, background: '#263248', color: '#fff' }} onClick={() => fileRef.current?.click()}>
              <ImageIcon size={14} /> {t('attachFile')}
            </button>
          ))}
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFile(f); }} />
        </div>

        {/* Label */}
        <div>
          <label style={DK_LABEL}>{t('paymentLabelField')}{!readOnly && ' *'}</label>
          <input type="text" className="dk-input" value={label} onChange={e => setLabel(e.target.value)} style={{ width: '100%' }} disabled={readOnly} readOnly={readOnly} />
        </div>

        {/* Amount + Due date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={DK_LABEL}>{t('paymentAmountField')}{!readOnly && ' *'}</label>
            <input type="number" inputMode="numeric" min="0" className="dk-input" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%' }} disabled={readOnly} readOnly={readOnly} />
          </div>
          <div>
            <label style={DK_LABEL}>{t('paymentDueField')}</label>
            <input type="date" className="dk-input" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%' }} disabled={readOnly} readOnly={readOnly} />
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={DK_LABEL}>{t('paymentNoteField')}</label>
          <textarea rows={2} className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder={t('paymentNotePlaceholder')} style={{ borderRadius: 12, fontSize: 14 }} disabled={readOnly} readOnly={readOnly} />
        </div>

        {/* Footer */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {!readOnly && saveIndicator}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {!readOnly && editItem && onDelete && (
              <button type="button" className="dk-btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={onDelete}>
                <Trash2 size={13} /> {t('deletePaymentItem')}
              </button>
            )}
            {!readOnly && editItem && onSend && (
              <button type="button" className="dk-btn dk-btn-l" style={{ fontSize: 13 }} onClick={() => setShowSend(true)}>
                <Send size={13} /> {t('sendInvoice')}
              </button>
            )}
            {!readOnly && !editItem && (
              <button type="button" className="dk-btn" style={{ background: '#263248', color: '#fff', justifyContent: 'center' }} disabled={!canSave || saving} onClick={handleCreate}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('savingText')}</> : <><Check size={14} /> {t('addPaymentItem')}</>}
              </button>
            )}
            <button type="button" className="dk-btn dk-btn-l" onClick={onClose}>
              {readOnly ? t('closeBtn') : <><Check size={13} /> {t('saveEntryBtn')}</>}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Send-to-client modal — focused, replaces edit modal visually */}
    <Modal isOpen={!!editItem && showSend} onClose={() => setShowSend(false)} title={t('sendInvoice')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={DK_LABEL}>{t('invoiceSendEmailLabel')}</label>
          {clientEmail
            ? <p style={{ fontSize: 12, color: '#5A5F68', margin: '0 0 8px' }}>{t('invoiceSendEmailPrefilled')}</p>
            : <p style={{ fontSize: 12, color: '#5A5F68', margin: '0 0 8px' }}>{t('invoiceSendNoEmailHint')}</p>
          }
          <input autoFocus type="email" className="dk-input" value={sendEmail} onChange={e => setSendEmail(e.target.value)} style={{ width: '100%' }} />
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={() => { setShowSend(false); setError(''); }}>
            {t('closeBtn')}
          </button>
          <button type="button" className="dk-btn" style={{ background: '#263248', color: '#fff' }} disabled={sending || !sendEmail.trim()} onClick={handleSend}>
            {sending ? <><Loader2 size={14} className="animate-spin" /> {t('savingText')}</> : <><Send size={14} /> {t('sendInvoice')}</>}
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
