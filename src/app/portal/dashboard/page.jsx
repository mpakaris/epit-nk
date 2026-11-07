'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogOut, CheckCircle2, XCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import Lightbox from '@/components/Lightbox';
import { PORTAL_I18N } from '@/lib/landingI18n';
import { useLandingLocale } from '@/hooks/useLandingLocale';

const BRAND  = '#0f172a';
const ACCENT = '#2563eb';
const FONT   = "'Plus Jakarta Sans', system-ui, sans-serif";

const STATUS_STYLE = {
  sent:     { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};
const TYPE_BADGE = {
  material:  { bg: '#eff6ff', color: '#1d4ed8' },
  labour:    { bg: '#f0fdf4', color: '#15803d' },
  equipment: { bg: '#fffbeb', color: '#b45309' },
  transport: { bg: '#faf5ff', color: '#7e22ce' },
  other:     { bg: '#f1f5f9', color: '#475569' },
};

const ACTIVE_STATUSES = new Set(['active', 'in_progress', 'in-progress']);

function fmtMoney(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }
function fmtDate(d, locale) {
  if (!d) return null;
  const loc = locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-GB' : 'hu-HU';
  return new Date(d).toLocaleDateString(loc, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Shared micro-components ───────────────────────────────────────────────

function PhotoGrid({ photos }) {
  const [lb, setLb] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 3, marginTop: '0.65rem', borderRadius: 8, overflow: 'hidden' }}>
        {photos.map((p, idx) => (
          <button key={p.id} onClick={() => setLb(idx)} style={{ aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0 }}>
            {p.mime_type?.startsWith('video/')
              ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>▶️</div>
              : <img src={p.thumbnail_url || p.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            }
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox media={photos} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

function EntryRow({ entry, isLast, i }) {
  const tb = TYPE_BADGE[entry.entry_type] || TYPE_BADGE.other;
  const typeLabel = { material: i.typeMaterial, labour: i.typeLabour, equipment: i.typeEquipment, transport: i.typeTransport, other: i.typeOther };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: tb.bg, color: tb.color, whiteSpace: 'nowrap' }}>
            {typeLabel[entry.entry_type] || entry.entry_type}
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: BRAND }}>{entry.work_description}</span>
        </div>
        <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
          {entry.quantity != null && entry.unit ? `${entry.quantity} ${entry.unit}` : ''}
          {entry.unit_price ? ` × ${Number(entry.unit_price).toLocaleString('hu-HU')} Ft` : ''}
          {entry.notes ? <span style={{ fontStyle: 'italic', marginLeft: '0.35rem' }}>{entry.notes}</span> : null}
        </div>
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: BRAND, whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
        {fmtMoney(entry.amount_huf)}
      </div>
    </div>
  );
}

function RoomSection({ section, i, locale }) {
  const hasPhotos  = (section.photos || []).length > 0;
  const hasEntries = (section.entries || []).length > 0;
  const roomTotal  = (section.entries || []).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  return (
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: BRAND }}>🏠 {section.name}</span>
        {section.size_m2 != null && <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>{section.size_m2} m²</span>}
        {roomTotal > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>{fmtMoney(roomTotal)}</span>}
      </div>
      {section.description && <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0 0 0.5rem', lineHeight: 1.55 }}>{section.description}</p>}
      {hasPhotos && <PhotoGrid photos={section.photos} />}
      {hasEntries && (
        <div style={{ marginTop: hasPhotos ? '0.75rem' : '0.25rem' }}>
          {section.entries.map((e, idx) => <EntryRow key={e.id} entry={e} isLast={idx === section.entries.length - 1} i={i} />)}
        </div>
      )}
    </div>
  );
}

function ActionModal({ title, children, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 601, width: 'min(440px, 92vw)', background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', padding: '1.6rem', fontFamily: FONT }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: BRAND }}>{title}</h3>
        {children}
      </div>
    </>
  );
}

// ─── Quote card (with accept/reject/question actions) ──────────────────────

function QuoteCard({ quote, onRespond, termsPdfUrl, termsPdfName, i, locale }) {
  const [expanded, setExpanded]     = useState(false);
  const [modal, setModal]           = useState(null);
  const [comment, setComment]       = useState('');
  const [responding, setResponding]   = useState(false);
  const [questionDone, setQuestionDone] = useState(false);
  const [respondError, setRespondError] = useState('');

  const allEntries     = quote.entries || [];
  const sections       = quote.sections || [];
  const generalEntries = allEntries.filter(e => !e.section_id);
  const net            = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate        = Number(quote.tax_percent ?? 27);
  const tax            = Math.round(net * taxRate / 100);
  const gross          = net + tax;
  const ss             = STATUS_STYLE[quote.status] || STATUS_STYLE.sent;
  const canRespond     = quote.status === 'sent' && !!onRespond;
  const hasDetail      = sections.length > 0 || allEntries.length > 0;

  const statusLabel = { sent: i.statusSent, accepted: i.statusAccepted, rejected: i.statusRejected, draft: i.statusDraft };

  const openModal  = (type) => { setComment(''); setRespondError(''); setModal(type); };
  const closeModal = () => { setModal(null); setComment(''); setRespondError(''); setQuestionDone(false); };

  const doRespond = async (action) => {
    setResponding(true);
    setRespondError('');
    try {
      await onRespond(quote.id, action, comment);
      if (action === 'question') {
        setQuestionDone(true);
        setTimeout(closeModal, 2000);
      } else {
        closeModal();
      }
    } catch (e) {
      setRespondError(e.message || i.errGeneric);
    } finally {
      setResponding(false);
    }
  };

  const btnBase = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 0.9rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: FONT, border: '1.5px solid', transition: 'opacity 0.15s' };

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '1.1rem 1.25rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 99, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {quote.status === 'sent' && '⏳ '}
              {quote.status === 'accepted' && '✅ '}
              {quote.status === 'rejected' && '❌ '}
              {statusLabel[quote.status] || quote.status}
            </span>
            {quote.created_at && (
              <span style={{ fontSize: '0.775rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {i.sentAt} <strong style={{ color: '#64748b' }}>{fmtDate(quote.created_at, locale)}</strong>
              </span>
            )}
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.25 }}>{quote.title}</h3>
          {quote.work_type && <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, margin: '0 0 0.3rem' }}>{quote.work_type}</p>}
          {quote.description && <p style={{ fontSize: '0.855rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.6 }}>{quote.description}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 1rem', fontSize: '0.83rem', color: '#64748b', marginBottom: '0.85rem' }}>
            {quote.location && <span>📍 {quote.location}</span>}
            {(quote.start_date || quote.end_date) && <span>🗓 {quote.start_date ? fmtDate(quote.start_date, locale) : '—'} – {quote.end_date ? fmtDate(quote.end_date, locale) : '—'}</span>}
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.85rem' }}>
            {taxRate > 0 && (
              <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                {i.netLabel} <strong style={{ color: '#475569' }}>{fmtMoney(net)}</strong>
                {' + '}{i.vatLabel} {taxRate}%: <strong style={{ color: '#475569' }}>{fmtMoney(tax)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{i.grossLabel}</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.2rem', color: BRAND }}>{fmtMoney(gross)}</div>
              </div>
              {hasDetail && (
                <button type="button" onClick={() => setExpanded(v => !v)}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: FONT }}>
                  {expanded ? <><ChevronUp size={14} /> {i.hideDetails}</> : <><ChevronDown size={14} /> {i.showDetails}</>}
                </button>
              )}
            </div>
          </div>

          {termsPdfUrl && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: canRespond ? '0.85rem' : 0 }}>
              <a href={termsPdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ ...btnBase, background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569', textDecoration: 'none', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                📋 {termsPdfName || i.downloadTerms}
              </a>
            </div>
          )}

          {canRespond && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => openModal('question')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                {i.questionBtn}
              </button>
              <button type="button" onClick={() => openModal('reject')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                <XCircle size={15} /> {i.rejectBtn}
              </button>
              <button type="button" onClick={() => openModal('accept')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
                <CheckCircle2 size={15} /> {i.acceptBtn}
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <>
            {sections.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9' }}>
                <div style={{ padding: '0.5rem 1.25rem 0.2rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
                  {i.roomsLabel} ({sections.length})
                </div>
                {sections.map(s => <RoomSection key={s.id} section={s} i={i} locale={locale} />)}
              </div>
            )}
            {generalEntries.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  {sections.length > 0 ? i.generalItemsLabel : i.itemsLabel}
                </div>
                {generalEntries.map((e, idx) => <EntryRow key={e.id} entry={e} isLast={idx === generalEntries.length - 1} i={i} />)}
              </div>
            )}
          </>
        )}
      </div>

      {modal === 'accept' && (
        <ActionModal title={i.acceptTitle} onClose={closeModal}>
          <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.65, margin: '0 0 1rem' }}>
            {i.acceptConfirm}<br />
            <strong style={{ color: BRAND }}>{quote.title}</strong><br />
            <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{fmtMoney(gross)}</span>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.75rem' }}>{i.acceptNote}</p>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
            {i.acceptCommentLabel}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={i.acceptCommentPh} rows={2}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: '1.25rem' }} />
          {respondError && <p style={{ margin: '-0.75rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeModal} style={{ ...btnBase, background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>{i.cancelBtn}</button>
            <button type="button" onClick={() => doRespond('accepted')} disabled={responding}
              style={{ ...btnBase, background: '#16a34a', borderColor: '#16a34a', color: '#fff', opacity: responding ? 0.7 : 1 }}>
              {responding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
              {i.confirmAcceptBtn}
            </button>
          </div>
        </ActionModal>
      )}

      {modal === 'reject' && (
        <ActionModal title={i.rejectTitle} onClose={closeModal}>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.75rem' }}>
            {i.rejectDesc} <strong style={{ color: BRAND }}>{quote.title}</strong>
          </p>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
            {i.rejectReasonLabel}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={i.rejectPh} rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: comment.trim().length > 0 && comment.trim().length < 10 ? '0.4rem' : '1.25rem' }} />
          {comment.trim().length > 0 && comment.trim().length < 10 && (
            <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: '#94a3b8' }}>{i.rejectMinHint}</p>
          )}
          {respondError && <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeModal} style={{ ...btnBase, background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>{i.cancelBtn}</button>
            <button type="button" onClick={() => doRespond('rejected')} disabled={responding || comment.trim().length < 10}
              style={{ ...btnBase, background: '#dc2626', borderColor: '#dc2626', color: '#fff', opacity: responding || comment.trim().length < 10 ? 0.7 : 1 }}>
              {responding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
              {i.confirmRejectBtn}
            </button>
          </div>
        </ActionModal>
      )}

      {modal === 'question' && (
        <ActionModal title={questionDone ? i.questionSentConfirm : i.questionTitle} onClose={closeModal}>
          {questionDone ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ color: '#15803d', fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>{i.questionSentConfirm}</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.75rem' }}>{i.questionDesc}</p>
              <textarea autoFocus value={comment} onChange={e => setComment(e.target.value)} placeholder={i.questionPh} rows={4}
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: comment.trim().length > 0 && comment.trim().length < 10 ? '0.4rem' : '1.25rem' }} />
              {comment.trim().length > 0 && comment.trim().length < 10 && (
                <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: '#94a3b8' }}>{i.questionMinHint}</p>
              )}
              {respondError && <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} style={{ ...btnBase, background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>{i.cancelBtn}</button>
                <button type="button" onClick={() => doRespond('question')} disabled={responding || comment.trim().length < 10}
                  style={{ ...btnBase, background: ACCENT, borderColor: ACCENT, color: '#fff', opacity: responding || comment.trim().length < 10 ? 0.6 : 1, cursor: comment.trim().length < 10 ? 'not-allowed' : 'pointer' }}>
                  {responding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '📨'}
                  {i.sendMessageBtn}
                </button>
              </div>
            </>
          )}
        </ActionModal>
      )}
    </>
  );
}

// ─── CP-09–12 section components ──────────────────────────────────────────

function InvoiceSection({ invoices, i, locale }) {
  const total = invoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  return (
    <div>
      {total > 0 && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textAlign: 'right', marginBottom: '0.5rem' }}>
          {i.invoiceTotalLabel}: <span style={{ fontFamily: 'monospace' }}>{fmtMoney(total)}</span>
        </div>
      )}
      {invoices.map(inv => (
        <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {inv.category && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', borderRadius: 99, padding: '0.1rem 0.45rem', marginRight: '0.35rem' }}>
                {inv.category}
              </span>
            )}
            {inv.description && <span style={{ fontSize: '0.83rem', color: BRAND }}>{inv.description}</span>}
            {inv.created_at && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>{fmtDate(inv.created_at, locale)}</div>}
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
            {fmtMoney(inv.value_huf)}
          </div>
        </div>
      ))}
    </div>
  );
}

function LabourSection({ labourEntries, i, locale }) {
  const total = labourEntries.reduce((s, l) => s + Number(l.value_huf || 0), 0);
  return (
    <div>
      {total > 0 && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textAlign: 'right', marginBottom: '0.5rem' }}>
          {i.labourTotalLabel}: <span style={{ fontFamily: 'monospace' }}>{fmtMoney(total)}</span>
        </div>
      )}
      {labourEntries.map(l => (
        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: BRAND }}>{l.labour_type}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
              {l.date && fmtDate(l.date, locale)}
              {l.hours != null && l.unit ? ` · ${l.hours} ${l.unit}` : ''}
            </div>
          </div>
          {l.value_huf > 0 && (
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
              {fmtMoney(l.value_huf)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MediaSection({ media }) {
  const [lb, setLb] = useState(null);
  const lbItems = media.map(m => ({ id: m.id, thumbnail_url: m.thumbnail, drive_view_url: m.url, mime_type: m.mime_type }));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 4, borderRadius: 8, overflow: 'hidden' }}>
        {media.map((m, idx) => (
          <button key={m.id} onClick={() => setLb(idx)}
            style={{ aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }}>
            {m.mime_type?.startsWith('video/')
              ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>▶️</div>
              : <img src={m.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            }
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox media={lbItems} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ─── CP-14–17: Project detail view ────────────────────────────────────────

function StatTile({ label, value }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 80, background: '#f8fafc', borderRadius: 10, padding: '0.6rem 0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.3rem', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.875rem', color: BRAND }}>{value || '—'}</div>
    </div>
  );
}

function ProjectDetailView({ project, contractor, onBack, onRespond, i, locale }) {
  const quotes      = project.quotes      || [];
  const invoices    = project.invoices    || [];
  const labour      = project.labourEntries || [];
  const media       = project.media       || [];
  const diary       = project.diaryEntries || [];

  // Build tabs — only show tabs with content
  const allTabs = [
    { id: 'quote',    label: i.tabQuote,    visible: quotes.length > 0 },
    { id: 'invoices', label: i.tabInvoices, visible: invoices.length > 0 },
    { id: 'labour',   label: i.tabLabour,   visible: labour.length > 0 },
    { id: 'media',    label: i.tabMedia,    visible: media.length > 0 },
    { id: 'diary',    label: i.tabDiary,    visible: diary.length > 0 },
  ].filter(t => t.visible);

  const [activeTab, setActiveTab] = useState(allTabs[0]?.id || 'quote');

  // Financial stat tiles (CP-17)
  const quoteGross = quotes.reduce((s, q) => {
    const entries = q.entries || [];
    const net = entries.reduce((es, e) => es + Number(e.amount_huf || 0), 0);
    const taxRate = Number(q.tax_percent ?? 27);
    return s + net + Math.round(net * taxRate / 100);
  }, 0);
  const invoiceTotal  = invoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  const labourTotal   = labour.reduce((s, l) => s + Number(l.value_huf || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Detail header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0.9rem 1rem' }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 700, color: ACCENT, fontFamily: FONT, padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.65rem' }}>
          <ArrowLeft size={14} /> {i.backToProjects}
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.2 }}>{project.name}</h2>
        {contractor && (
          <div style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '0.65rem' }}>
            🏗 {contractor.contractor_name}
          </div>
        )}

        {/* Stat tiles (CP-17) */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <StatTile label={i.quoteTotalLabel}  value={quoteGross   > 0 ? fmtMoney(quoteGross)   : null} />
          <StatTile label={i.invoicedLabel}    value={invoiceTotal > 0 ? fmtMoney(invoiceTotal) : null} />
          <StatTile label={i.labourCostLabel}  value={labourTotal  > 0 ? fmtMoney(labourTotal)  : null} />
        </div>
      </div>

      {/* Tab bar */}
      {allTabs.length > 0 && (
        <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: '2px solid #e2e8f0', scrollbarWidth: 'none' }}>
          {allTabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              style={{ flexShrink: 0, padding: '0.7rem 1.1rem', fontSize: '0.825rem', fontWeight: 700, fontFamily: FONT, border: 'none', cursor: 'pointer', background: 'none', color: activeTab === t.id ? ACCENT : '#64748b', borderBottom: `2px solid ${activeTab === t.id ? ACCENT : 'transparent'}`, marginBottom: -2, transition: 'color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {activeTab === 'quote' && quotes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quotes.map(q => (
              <QuoteCard key={q.id} quote={q} onRespond={onRespond}
                termsPdfUrl={contractor?.terms_pdf_url} termsPdfName={contractor?.terms_pdf_name}
                i={i} locale={locale} />
            ))}
          </div>
        )}

        {activeTab === 'invoices' && invoices.length > 0 && (
          <InvoiceSection invoices={invoices} i={i} locale={locale} />
        )}

        {activeTab === 'labour' && labour.length > 0 && (
          <LabourSection labourEntries={labour} i={i} locale={locale} />
        )}

        {activeTab === 'media' && media.length > 0 && (
          <MediaSection media={media} />
        )}

        {activeTab === 'diary' && diary.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {diary.map(entry => (
              <div key={entry.id}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                  {entry.entry_date && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: ACCENT, borderRadius: 20, padding: '0.15rem 0.55rem' }}>{fmtDate(entry.entry_date, locale)}</span>}
                  {entry.work_type  && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.45rem', border: '1px solid #e2e8f0' }}>{entry.work_type}</span>}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: BRAND, margin: '0 0 0.25rem' }}>{entry.title}</h4>
                {entry.body && <p style={{ fontSize: '0.83rem', color: '#475569', margin: '0 0 0.35rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>}
                {entry.client_note && (
                  <div style={{ fontSize: '0.83rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '0.2rem' }}>{i.noteLabel}</div>
                    {entry.client_note}
                  </div>
                )}
                <PhotoGrid photos={entry.photos || []} />
              </div>
            ))}
          </div>
        )}

        {allTabs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            {i.noSharedItems}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CP-14–15: Project list card & contractor section ─────────────────────

function ProjectListCard({ project, onSelect, i, locale }) {
  const sharedCount =
    (project.quotes?.length || 0) +
    (project.invoices?.length || 0) +
    (project.labourEntries?.length || 0) +
    (project.media?.length || 0) +
    (project.diaryEntries?.length || 0);
  const lastDiary = project.diaryEntries?.[0];
  const pendingQuote = (project.quotes || []).find(q => q.status === 'sent');

  return (
    <button type="button" onClick={() => onSelect(project)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '1rem 1.25rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', fontFamily: FONT, transition: 'box-shadow 0.15s' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: BRAND, lineHeight: 1.25 }}>{project.name}</span>
        {pendingQuote && (
          <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 99, padding: '0.15rem 0.5rem', whiteSpace: 'nowrap' }}>
            ⏳ {i.statusSent}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
        {project.start_date && (
          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>
            🗓 {fmtDate(project.start_date, locale)}
          </span>
        )}
        {project.end_date && (
          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>
            → {fmtDate(project.end_date, locale)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {sharedCount > 0 ? (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: ACCENT, background: '#eff6ff', borderRadius: 99, padding: '0.15rem 0.5rem', border: '1px solid #bfdbfe' }}>
              {i.sharedItemsCount.replace('{n}', sharedCount)}
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{i.noSharedItems}</span>
          )}
          {lastDiary && (
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {i.lastDiaryLabel} {fmtDate(lastDiary.entry_date || lastDiary.created_at, locale)}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>›</span>
      </div>
    </button>
  );
}

function ContractorSection({ contractor, multipleContractors, onSelect, onRespond, i, locale }) {
  const [showPast, setShowPast] = useState(false);

  const activeProjects = (contractor.projects || []).filter(p => ACTIVE_STATUSES.has(p.status));
  const pastProjects   = (contractor.projects || []).filter(p => !ACTIVE_STATUSES.has(p.status));
  const standaloneQuotes = contractor.standaloneQuotes || [];
  const pendingCount   = standaloneQuotes.filter(q => q.status === 'sent').length +
    (contractor.projects || []).reduce((s, p) => s + (p.quotes || []).filter(q => q.status === 'sent').length, 0);

  return (
    <div style={{ marginBottom: '2rem' }}>
      {multipleContractors && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>🏗</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: BRAND }}>{contractor.contractor_name}</div>
            {contractor.contractor_email && <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>{contractor.contractor_email}</div>}
          </div>
          {pendingCount > 0 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 99, padding: '0.2rem 0.65rem', whiteSpace: 'nowrap' }}>
              {i.pendingQuotes.replace('{n}', pendingCount)}
            </span>
          )}
        </div>
      )}

      {/* Standalone quotes (not linked to any project) */}
      {standaloneQuotes.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.65rem', paddingLeft: '0.25rem' }}>
            {i.standaloneQuotesLabel} ({standaloneQuotes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {standaloneQuotes.map(q => (
              <QuoteCard key={q.id} quote={q} onRespond={onRespond}
                termsPdfUrl={contractor.terms_pdf_url} termsPdfName={contractor.terms_pdf_name}
                i={i} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {/* Active projects (CP-14) */}
      {activeProjects.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.65rem', paddingLeft: '0.25rem' }}>
            {i.activeProjects} ({activeProjects.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeProjects.map(p => (
              <ProjectListCard key={p.id} project={p} onSelect={proj => onSelect(proj, contractor)} i={i} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {activeProjects.length === 0 && pastProjects.length === 0 && standaloneQuotes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#94a3b8' }}>
          {i.noContentContractor}
        </div>
      )}

      {/* Past projects (CP-14) — collapsed by default */}
      {pastProjects.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowPast(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, paddingLeft: '0.25rem', marginBottom: showPast ? '0.65rem' : 0 }}>
            {showPast ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {i.pastProjects} ({pastProjects.length})
          </button>
          {showPast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.65rem' }}>
              {pastProjects.map(p => (
                <ProjectListCard key={p.id} project={p} onSelect={proj => onSelect(proj, contractor)} i={i} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────

function PortalDashboard() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const asEmail      = searchParams.get('as');
  const [locale]     = useLandingLocale();
  const i            = PORTAL_I18N[locale] || PORTAL_I18N.hu;

  const [supabase]        = useState(() => createClient());
  const [email, setEmail] = useState('');
  const [saMode, setSaMode]           = useState(false);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // CP-16: detail drill-down state
  const [selectedProject,    setSelectedProject]    = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);

  useEffect(() => {
    if (asEmail) {
      fetch('/api/auth/profile')
        .then(r => r.json())
        .then(({ profile }) => {
          if (profile?.role !== 'superadmin') { router.replace('/portal'); return; }
          setSaMode(true);
          setEmail(asEmail);
          fetchData(asEmail);
        })
        .catch(() => router.replace('/portal'));
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.replace('/portal'); return; }
        setEmail(session.user.email || '');
        fetchData(null);
      });
    }
  }, [asEmail]);

  const fetchData = useCallback(async (overrideEmail) => {
    setLoading(true);
    setError('');
    try {
      const url  = overrideEmail ? `/api/portal/data?email=${encodeURIComponent(overrideEmail)}` : '/api/portal/data';
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || i.errGeneric);
      setContractors(data.contractors || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [i]);

  const handleRespond = async (quoteId, action, comment = '') => {
    const res = await fetch(`/api/portal/quotes/${quoteId}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || i.errGeneric);
    if (action !== 'question') {
      setContractors(prev => prev.map(c => ({
        ...c,
        standaloneQuotes: (c.standaloneQuotes || []).map(q => q.id === quoteId ? { ...q, status: action } : q),
        projects: c.projects.map(p => ({
          ...p,
          quotes: (p.quotes || []).map(q => q.id === quoteId ? { ...q, status: action } : q),
        })),
      })));
      // Also update selected project detail view if open
      setSelectedProject(prev => prev ? ({
        ...prev,
        quotes: (prev.quotes || []).map(q => q.id === quoteId ? { ...q, status: action } : q),
      }) : null);
    }
  };

  const handleSelectProject = (project, contractor) => {
    setSelectedProject(project);
    setSelectedContractor(contractor);
  };

  const handleBack = () => {
    setSelectedProject(null);
    setSelectedContractor(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/portal');
  };

  const totalPending = contractors.reduce((s, c) => {
    const standalonePending = (c.standaloneQuotes || []).filter(q => q.status === 'sent').length;
    const projectPending = (c.projects || []).reduce((ps, p) => ps + (p.quotes || []).filter(q => q.status === 'sent').length, 0);
    return s + standalonePending + projectPending;
  }, 0);

  const multipleContractors = contractors.length > 1;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: FONT, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      {saMode && (
        <div style={{ background: '#854d0e', color: '#fef9c3', padding: '0.4rem 1rem', fontSize: '0.775rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: FONT }}>
          <span style={{ flex: 1 }}>👁 {i.saBanner} {email}</span>
          <button type="button" onClick={() => router.push('/superadmin/portals')}
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#fef9c3', fontWeight: 700, fontSize: '0.75rem', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={12} /> {i.saBackBtn}
          </button>
        </div>
      )}

      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: BRAND, boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', height: 52 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🏗</div>
          <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.pageTitle}</span>
          {email && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexShrink: 0, display: 'none', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} className="portal-email">{email}</span>}
          {!saMode && (
            <button type="button" onClick={handleLogout} title={i.logoutBtn}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', fontWeight: 600, fontFamily: FONT, flexShrink: 0 }}>
              <LogOut size={13} /> {i.logoutBtn}
            </button>
          )}
        </div>
      </div>

      {/* Detail view — full-screen overlay */}
      {selectedProject && (
        <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column', maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <ProjectDetailView
            project={selectedProject}
            contractor={selectedContractor}
            onBack={handleBack}
            onRespond={handleRespond}
            i={i}
            locale={locale}
          />
        </div>
      )}

      {/* List view */}
      {!selectedProject && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem 3rem', width: '100%' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: BRAND, margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{i.welcomeTitle}</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              {email && <><strong style={{ color: BRAND }}>{email}</strong> · </>}
              {contractors.length === 0 && !loading ? i.noContentYet : i.contractorsCount.replace('{n}', contractors.length)}
            </p>
            {totalPending > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 99, padding: '0.3rem 0.85rem', fontSize: '0.825rem', fontWeight: 700, color: '#a16207' }}>
                {i.pendingBadge.replace('{n}', totalPending)}
              </div>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{i.loadingText}</p>
            </div>
          )}

          {!loading && error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {!loading && !error && contractors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ fontWeight: 700, color: BRAND, margin: '0 0 0.4rem' }}>{i.noContent}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{i.noContentDesc}</p>
            </div>
          )}

          {!loading && contractors.map(c => (
            <ContractorSection
              key={c.owner_id}
              contractor={c}
              multipleContractors={multipleContractors}
              onSelect={handleSelectProject}
              onRespond={handleRespond}
              i={i}
              locale={locale}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 480px) { .portal-email { display: block !important; } }
      `}</style>
    </div>
  );
}

export default function PortalDashboardPage() {
  return (
    <Suspense>
      <PortalDashboard />
    </Suspense>
  );
}
