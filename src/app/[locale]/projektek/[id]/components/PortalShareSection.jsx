'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, INVOICE_CATEGORIES } from '@/lib/constants';
import { ChevronDown, ChevronUp, Share2, Loader2, ExternalLink } from 'lucide-react';
import useMobile from '@/hooks/useMobile';

// ── toggle switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, saving }) {
  return (
    <div style={{
      width: 44, height: 24, borderRadius: 12,
      background: saving ? '#94a3b8' : checked ? 'var(--success)' : '#cbd5e1',
      position: 'relative', flexShrink: 0,
      transition: 'background 0.15s',
      display: 'flex', alignItems: 'center',
    }}>
      {saving
        ? <Loader2 size={14} style={{ position: 'absolute', left: 15, color: '#fff', animation: 'spin 0.8s linear infinite' }} />
        : <span style={{
            position: 'absolute',
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff',
            top: 3, left: checked ? 23 : 3,
            transition: 'left 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }} />
      }
    </div>
  );
}

// ── row with toggle ───────────────────────────────────────────────────────────
function ToggleRow({ label, sublabel, checked, onToggle, saving, isLast, canManage }) {
  return (
    <button
      type="button"
      onClick={canManage ? onToggle : undefined}
      disabled={!canManage || saving}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        minHeight: 44, width: '100%',
        padding: '0.4rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: 'none', border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        cursor: canManage && !saving ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sublabel}</div>}
      </div>
      <ToggleSwitch checked={checked} saving={saving} />
    </button>
  );
}

// ── sub-section header ────────────────────────────────────────────────────────
function SubHeader({ label, count }) {
  return (
    <div style={{
      fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: 'var(--text-muted)',
      padding: '0.85rem 0 0.4rem',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
    }}>
      {label}
      {count > 0 && (
        <span style={{ background: 'var(--success)', color: '#fff', borderRadius: 99, padding: '0.05rem 0.45rem', fontSize: '0.6rem', fontWeight: 800 }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function PortalShareSection({ project, invoices, labourEntries, diaryEntries, canManage }) {
  const t = useTranslations('projectDetail');
  const { userCurrency } = useApp();
  const isMobile = useMobile();
  const fmt = (n) => formatMoney(n, userCurrency);

  const [open, setOpen]               = useState(false);
  const [mediaItems, setMediaItems]   = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  // saving: Set of "type:id" strings currently being toggled
  const [saving, setSaving]           = useState(new Set());
  // local overrides: "type:id" → boolean (optimistic)
  const [overrides, setOverrides]     = useState({});
  const [errorMsg, setErrorMsg]       = useState('');

  // Fetch media items once when section is opened
  useEffect(() => {
    if (!open || mediaItems.length > 0 || mediaLoading) return;
    setMediaLoading(true);
    fetch(`/api/media-items?document_type=project&document_id=${project.id}`)
      .then(r => r.ok ? r.json() : { mediaItems: [] })
      .then(d => setMediaItems(d.mediaItems || []))
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }, [open, project.id]);

  const getVisible = useCallback((type, id, base) => {
    const key = `${type}:${id}`;
    return key in overrides ? overrides[key] : !!base;
  }, [overrides]);

  const isSaving = useCallback((type, id) => saving.has(`${type}:${id}`), [saving]);

  const toggle = useCallback(async (type, id, currentVal, apiUrl, fieldName = 'portal_visible') => {
    if (!canManage) return;
    const key     = `${type}:${id}`;
    const newVal  = !currentVal;

    setSaving(prev => new Set([...prev, key]));
    setOverrides(prev => ({ ...prev, [key]: newVal }));
    setErrorMsg('');

    try {
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: newVal }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || t('portalShareError'));
      }
      // For media items, update local list too
      if (type === 'media') {
        setMediaItems(prev => prev.map(m => m.id === id ? { ...m, portal_visible: newVal } : m));
      }
    } catch (err) {
      // Rollback
      setOverrides(prev => ({ ...prev, [key]: currentVal }));
      setErrorMsg(err.message || t('portalShareError'));
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, [canManage, t]);

  // Don't render if project has no client
  if (!project.client_id) {
    return (
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Share2 size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{t('portalNoClientHint')}</span>
        </div>
      </div>
    );
  }

  // Shared counts
  const sharedInvoices = invoices.filter(inv => getVisible('invoice', inv.id, inv.portal_visible));
  const sharedLabour   = labourEntries.filter(e => getVisible('labour', e.id, e.portal_visible));
  const sharedMedia    = mediaItems.filter(m => getVisible('media', m.id, m.portal_visible));
  const sharedDiary    = (diaryEntries || []).filter(e => getVisible('diary', e.id, e.is_public));
  const totalShared    = sharedInvoices.length + sharedLabour.length + sharedMedia.length + sharedDiary.length;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          width: '100%', padding: '0.9rem 1rem',
          background: open ? 'var(--primary)' : 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: open ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Share2 size={16} color={open ? '#fff' : 'var(--accent)'} strokeWidth={2} />
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: open ? '#fff' : 'var(--text-primary)' }}>
          {t('portalSectionTitle')}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700,
          background: totalShared > 0 ? (open ? 'rgba(255,255,255,0.2)' : 'var(--success)') : (open ? 'rgba(255,255,255,0.1)' : 'var(--bg-subtle)'),
          color: totalShared > 0 ? '#fff' : (open ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'),
          borderRadius: 99, padding: '0.15rem 0.6rem', marginRight: '0.25rem',
        }}>
          {totalShared > 0 ? t('portalSharedBadge').replace('{count}', totalShared) : t('portalNoneShared')}
        </span>
        {open ? <ChevronUp size={16} color={open ? '#fff' : 'var(--text-muted)'} /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {/* Body */}
      {open && (
        <div style={{
          border: '1px solid var(--border-subtle)', borderTop: 'none',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          background: 'var(--bg-card)',
          padding: '0 1rem 1rem',
        }}>
          {errorMsg && (
            <div style={{ margin: '0.75rem 0 0', padding: '0.65rem 0.85rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--danger-text)', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* ── Számlák ── */}
          <SubHeader label={t('portalInvoicesLabel')} count={sharedInvoices.length} />
          {invoices.length === 0
            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0' }}>{t('portalNoInvoices')}</p>
            : invoices.map((inv, idx) => {
                const catLabel = INVOICE_CATEGORIES.find(c => c.id === inv.category)?.label || inv.category || '—';
                return (
                  <ToggleRow
                    key={inv.id}
                    label={inv.description || catLabel}
                    sublabel={`${catLabel} · ${fmt(inv.value_huf)}`}
                    checked={getVisible('invoice', inv.id, inv.portal_visible)}
                    saving={isSaving('invoice', inv.id)}
                    onToggle={() => toggle('invoice', inv.id, getVisible('invoice', inv.id, inv.portal_visible), `/api/invoices/${inv.id}`)}
                    isLast={idx === invoices.length - 1}
                    canManage={canManage}
                  />
                );
              })
          }

          {/* ── Munkadíj ── */}
          <SubHeader label={t('portalLabourLabel')} count={sharedLabour.length} />
          {labourEntries.length === 0
            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0' }}>{t('portalNoLabour')}</p>
            : labourEntries.map((e, idx) => (
                <ToggleRow
                  key={e.id}
                  label={e.labour_type || e.description || '—'}
                  sublabel={`${e.date || ''} · ${fmt(e.value_huf)}`}
                  checked={getVisible('labour', e.id, e.portal_visible)}
                  saving={isSaving('labour', e.id)}
                  onToggle={() => toggle('labour', e.id, getVisible('labour', e.id, e.portal_visible), `/api/labour-entries/${e.id}`)}
                  isLast={idx === labourEntries.length - 1}
                  canManage={canManage}
                />
              ))
          }

          {/* ── Média ── */}
          <SubHeader label={t('portalMediaLabel')} count={sharedMedia.length} />
          {mediaLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} color="var(--text-muted)" />
            </div>
          )}
          {!mediaLoading && mediaItems.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0' }}>{t('portalNoMedia')}</p>
          )}
          {!mediaLoading && mediaItems.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
              gap: '0.5rem', marginTop: '0.25rem',
            }}>
              {mediaItems.map(m => {
                const isVisible = getVisible('media', m.id, m.portal_visible);
                const busy      = isSaving('media', m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => canManage && !busy && toggle('media', m.id, isVisible, `/api/media-items/${m.id}`)}
                    disabled={!canManage || busy}
                    style={{
                      position: 'relative', aspectRatio: '1',
                      borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                      border: `2px solid ${isVisible ? 'var(--success)' : 'transparent'}`,
                      cursor: canManage && !busy ? 'pointer' : 'default',
                      background: '#e2e8f0', padding: 0,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {m.mime_type?.startsWith('video/')
                      ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>▶️</div>
                      : <img src={m.thumbnail_url || m.cdn_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    }
                    {/* Overlay: shared indicator or spinner */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isVisible ? 'rgba(22,163,74,0.15)' : 'rgba(0,0,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}>
                      {busy
                        ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
                        : isVisible
                          ? <span style={{ fontSize: '1rem' }}>✓</span>
                          : null
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Napló ── */}
          <SubHeader label={t('portalDiaryLabel')} count={sharedDiary.length} />
          {(!diaryEntries || diaryEntries.length === 0)
            ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0' }}>{t('portalNoDiary')}</p>
            : diaryEntries.map((e, idx) => (
                <ToggleRow
                  key={e.id}
                  label={e.title || '—'}
                  sublabel={e.entry_date || ''}
                  checked={getVisible('diary', e.id, e.is_public)}
                  saving={isSaving('diary', e.id)}
                  onToggle={() => toggle('diary', e.id, getVisible('diary', e.id, e.is_public), `/api/diary/${e.id}`, 'is_public')}
                  isLast={idx === diaryEntries.length - 1}
                  canManage={canManage}
                />
              ))
          }

          {/* Portal link */}
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
            <a
              href={`/portal/dashboard`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
            >
              <ExternalLink size={13} />
              {t('portalClientLink')}
            </a>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
