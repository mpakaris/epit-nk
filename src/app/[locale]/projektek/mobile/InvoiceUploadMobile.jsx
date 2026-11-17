'use client';

/**
 * P5 — Invoice upload (mobile pods view)
 * Camera/file → OCR → review → save
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import { processMediaFile } from '@/lib/mediaGate';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';

const PROJ_BG = '#263248';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

const CAT_OPTIONS = [
  { id: 'material',  label: 'Anyag',           bg: '#E4ECFA', fg: '#2B4C9B' },
  { id: 'labour',    label: 'Munka',            bg: '#E2F3E8', fg: '#14532D' },
  { id: 'equipment', label: 'Szerszám/Eszköz',  bg: '#FFF1E0', fg: '#8A4200' },
  { id: 'fuel',      label: 'Üzemanyag',        bg: '#EDE7FB', fg: '#4A2796' },
  { id: 'other',     label: 'Egyéb',            bg: '#F1F1F3', fg: '#2B3038' },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InvoiceUploadMobile({ projectId }) {
  const t = useTranslations('projects');
  const router = useRouter();
  const isOnline = useOnline();
  const { isDemoMode, createInvoice, uploadInvoiceImage, projectRooms = [], userCurrency } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const rooms = (projectRooms || []).filter(r => r.project_id === projectId);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });

  const newItem = (overrides = {}) => ({
    localId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    file: null,
    previewUrl: null,
    status: 'ready',
    valueHuf: '',
    category: 'material',
    description: '',
    roomId: '',
    foreignCurrency: false,
    ocrValue: null,
    aiLineItems: null,
    aiTotal: null,
    aiCurrency: 'HUF',
    descriptionSuggestion: '',
    ...overrides,
  });

  const updateItem = (localId, changes) => {
    setItems(prev => prev.map(i => i.localId === localId ? { ...i, ...changes } : i));
  };

  const removeItem = (localId) => {
    setItems(prev => {
      const item = prev.find(i => i.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.localId !== localId);
    });
  };

  const processItem = async (localId, file) => {
    updateItem(localId, { status: 'processing' });
    try {
      const imageDataUrl = await readFileAsDataUrl(file);

      const [ocrData, aiData] = await Promise.all([
        fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: imageDataUrl }) }).then(r => r.json()).catch(() => null),
        fetch('/api/invoice-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageDataUrl }) }).then(r => r.json()).catch(() => null),
      ]);

      const update = { status: 'ready' };

      if (aiData?.lineItems?.length > 0) {
        const currency = aiData.currency || 'HUF';
        update.aiLineItems = aiData.lineItems;
        update.aiTotal = aiData.grandTotal || 0;
        update.aiCurrency = currency;
        update.foreignCurrency = currency !== 'HUF';
        if (aiData.grandTotal > 0 && currency === 'HUF') {
          update.valueHuf = Math.round(aiData.grandTotal).toString();
        }
        const names = aiData.lineItems.map(i => i.name).filter(Boolean);
        if (names.length) {
          update.descriptionSuggestion = names.slice(0, 3).join(', ');
        }
      }

      if (!update.valueHuf && ocrData?.suggestedValue > 0) {
        update.valueHuf = ocrData.suggestedValue.toString();
        update.ocrValue = ocrData.suggestedValue;
      }

      updateItem(localId, update);
    } catch {
      updateItem(localId, { status: 'error' });
    }
  };

  const handleFiles = async (files) => {
    const newItems = Array.from(files).map(f => newItem({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
    for (const item of newItems) {
      await processItem(item.localId, item.file);
    }
  };

  const handleSubmit = async () => {
    if (!items.length) return;
    if (items.some(i => i.status === 'processing' || i.status === 'pending')) {
      setAlertModal({ open: true, message: t('processingOcr') });
      return;
    }
    const invalid = items.find(i => !(Number(i.valueHuf) > 0));
    if (invalid) {
      setAlertModal({ open: true, message: t('invoiceAmountHint') });
      return;
    }

    setSaving(true);
    const failed = [];

    for (const item of items) {
      try {
        let imageUrl = null, storagePath = null;
        if (item.file) {
          const compressed = await processMediaFile(item.file);
          ({ imageUrl, storagePath } = await uploadInvoiceImage(compressed));
        }
        await createInvoice({
          projectId,
          valueHuf: Math.round(Number(item.valueHuf)),
          category: item.category,
          description: item.description.trim(),
          imageUrl: imageUrl || null,
          storagePath: storagePath || null,
          roomId: item.roomId || null,
          aiLineItems: item.aiLineItems?.length > 0 ? item.aiLineItems : null,
          aiTotal: item.aiTotal || null,
          ocrSuggestedValue: item.ocrValue,
        });
      } catch {
        failed.push(item.file?.name || '?');
      }
    }

    setSaving(false);

    if (failed.length > 0) {
      setAlertModal({ open: true, message: t('ocrFailed') });
    } else {
      router.push(p(`/projektek/${projectId}`));
    }
  };

  const hasItems = items.length > 0;
  const allReady = hasItems && items.every(i => i.status !== 'processing' && i.status !== 'pending');

  return (
    <div className="pod-screen m-root" style={{ minHeight: '100dvh', background: 'var(--m-bg, #EDEBE5)', color: 'var(--m-ink)', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      <div style={{ overflowY: 'auto', paddingBottom: hasItems ? 160 : 80 }}>
        {/* Header */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: PROJ_BG, color: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button aria-label="Vissza" onClick={() => router.push(p(`/projektek/${projectId}`))} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.80)' }}>{t('uploadTitle')}</span>
              <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{t('uploadSubtitle')}</h1>
            </div>
          </div>
        </header>

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Hidden file inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const files = e.target.files; e.target.value = ''; if (files?.length) handleFiles(files); }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const files = e.target.files; e.target.value = ''; if (files?.length) handleFiles(files); }} />

          {/* Upload buttons */}
          {!hasItems && (
            <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => cameraRef.current?.click()} style={{ height: 64, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z"/></svg>
                {t('uploadCamera')}
              </button>
              <button onClick={() => galleryRef.current?.click()} style={{ height: 64, border: 0, borderRadius: 24, background: '#E3E7EE', color: PROJ_BG, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l5-5M9 3H3v6M15 3h6v6M3 15v6h6M15 21h6v-6M9 9h6M9 15h6M9 12h6"/></svg>
                {t('uploadFile')}
              </button>
              <button onClick={() => setItems(prev => [...prev, newItem()])} style={{ height: 56, border: 0, borderRadius: 24, background: 'rgba(38,50,72,0.08)', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                + {t('ocrFailed')}
              </button>
            </div>
          )}

          {/* Add more (compact) */}
          {hasItems && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('uploadCamera')}</button>
              <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: '#E3E7EE', color: PROJ_BG, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('uploadFile')}</button>
              <button onClick={() => setItems(prev => [...prev, newItem()])} style={{ height: 48, padding: '0 14px', border: 0, borderRadius: 24, background: 'rgba(38,50,72,0.08)', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+</button>
            </div>
          )}

          {/* Invoice cards */}
          {items.map(item => (
            <div key={item.localId} style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
              {/* Remove button */}
              <button onClick={() => removeItem(item.localId)} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, border: 0, borderRadius: 16, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>

              {item.status === 'processing' || item.status === 'pending' ? (
                <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 10, color: '#5A5F68' }}>
                  <div style={{ width: 24, height: 24, border: `3px solid ${PROJ_BG}`, borderTopColor: 'transparent', borderRadius: 12, animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t('processingOcr')}</span>
                </div>
              ) : (
                <>
                  {item.previewUrl && (
                    <div style={{ height: 80, borderRadius: 16, overflow: 'hidden', background: '#F7F5EF' }}>
                      <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  {item.foreignCurrency && (
                    <div style={{ boxSizing: 'border-box', padding: '8px 12px', borderRadius: 14, background: '#FFF1E0', color: '#8A4200', fontSize: 13, fontWeight: 600 }}>
                      ⚠ {t('invoiceForeignCurrencyWarning')}
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div style={{ boxSizing: 'border-box', padding: '8px 12px', borderRadius: 14, background: '#FDECEC', color: '#9B1C1C', fontSize: 13, fontWeight: 600 }}>
                      {t('ocrFailed')}
                    </div>
                  )}

                  {/* Amount */}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('invoiceAmount')}</span>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" inputMode="numeric" min="1"
                        placeholder="0"
                        value={item.valueHuf}
                        onChange={e => updateItem(item.localId, { valueHuf: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#F7F5EF', paddingLeft: 16, paddingRight: 48, fontSize: 20, fontWeight: 700, color: 'var(--m-ink)', fontFamily: "'Bricolage Grotesque', sans-serif" }}
                      />
                      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#5A5F68', fontSize: 14, pointerEvents: 'none' }}>Ft</span>
                    </div>
                  </label>

                  {/* Category chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CAT_OPTIONS.map(c => {
                      const on = item.category === c.id;
                      return (
                        <button key={c.id} onClick={() => updateItem(item.localId, { category: c.id })} aria-pressed={on}
                          style={{ height: 36, padding: '0 12px', border: 0, borderRadius: 18, fontSize: 13, fontWeight: 700, background: on ? c.bg : '#F1F1F3', color: on ? c.fg : '#5A5F68', cursor: 'pointer' }}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    placeholder={item.descriptionSuggestion || t('invoiceDescription')}
                    value={item.description}
                    onChange={e => updateItem(item.localId, { description: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', height: 52, border: 0, borderRadius: 18, background: '#F7F5EF', padding: '0 14px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)' }}
                  />

                  {/* Room */}
                  {rooms.length > 0 && (
                    <select value={item.roomId} onChange={e => updateItem(item.localId, { roomId: e.target.value })} style={{ width: '100%', height: 52, border: 0, borderRadius: 18, background: '#F7F5EF', padding: '0 14px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)', cursor: 'pointer' }}>
                      <option value="">– {t('invoiceSection')} –</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky save bar */}
      {hasItems && (
        <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `20px 16px calc(18px + env(safe-area-inset-bottom))`, background: 'linear-gradient(to top, var(--m-bg, #EDEBE5) 65%, rgba(237,235,229,0))', display: 'flex', gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={saving || !allReady}
            style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: saving || !allReady ? '#B9B5AA' : PROJ_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 14px 26px -12px rgba(14,17,22,0.5)' }}
          >
            {saving ? '…' : !allReady ? t('processingOcr') : t('saveAll')} {allReady && !saving ? `(${items.length})` : ''}
          </button>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        message={alertModal.message}
        type="error"
      />
    </div>
  );
}
