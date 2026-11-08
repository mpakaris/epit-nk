'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, LogOut, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ArrowLeft, FileDown, FileText, Hammer, Building2,
} from 'lucide-react';
import Lightbox from '@/components/Lightbox';
import { PORTAL_I18N } from '@/lib/landingI18n';
import { useLandingLocale } from '@/hooks/useLandingLocale';

// ── constants ─────────────────────────────────────────────────────────────────

const BRAND = '#0f172a';
const ACCENT = '#2563eb';
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const ACTIVE_STATUSES = new Set(['active', 'in_progress', 'in-progress']);

// entry sort order: material → labour → transport → equipment → other
const ENTRY_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };

const QUOTE_LEFT = { sent: '#f59e0b', accepted: '#22c55e', rejected: '#ef4444' };
const STATUS_PILL = {
  sent:     { bg: '#fffbeb', color: '#a16207', border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};
const TYPE_BADGE = {
  material:  { bg: '#eff6ff', color: '#1d4ed8' },
  labour:    { bg: '#f0fdf4', color: '#166534' },
  equipment: { bg: '#fffbeb', color: '#854d0e' },
  transport: { bg: '#faf5ff', color: '#7e22ce' },
  other:     { bg: '#f1f5f9', color: '#475569' },
};

function fmtMoney(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }
function fmtDate(d, locale) {
  if (!d) return null;
  const loc = locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-GB' : 'hu-HU';
  return new Date(d).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── micro-components ─────────────────────────────────────────────────────────

function DocTypeBadge({ type, i }) {
  const cfg = type === 'offer'
    ? { label: i.typeOffer, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    : { label: i.typeProject, bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, letterSpacing: '0.02em', flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}

function StatusPill({ status, i }) {
  const statusLabel = { sent: i.statusSent, accepted: i.statusAccepted, rejected: i.statusRejected, draft: i.statusDraft };
  const pill = STATUS_PILL[status] || STATUS_PILL.sent;
  const dot = QUOTE_LEFT[status] || '#94a3b8';
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {statusLabel[status] || status}
    </span>
  );
}

function ProjectStatusPill({ status, i }) {
  const isActive = ACTIVE_STATUSES.has(status);
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99, background: isActive ? '#eff6ff' : '#f1f5f9', color: isActive ? '#1d4ed8' : '#64748b', border: `1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'}`, flexShrink: 0 }}>
      {isActive ? i.projectActive : i.projectClosed}
    </span>
  );
}

function ActionModal({ title, children, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 600 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 601, width: 'min(440px, 92vw)', background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', padding: '1.6rem', fontFamily: FONT }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: BRAND }}>{title}</h3>
        {children}
      </div>
    </>
  );
}

function PhotoGrid({ photos }) {
  const [lb, setLb] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 3, marginTop: '0.65rem', borderRadius: 8, overflow: 'hidden' }}>
        {photos.map((p, idx) => (
          <button key={p.id} onClick={() => setLb(idx)} style={{ aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0 }}>
            {p.mime_type?.startsWith('video/')
              ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>▶️</div>
              : <img src={p.thumbnail_url || p.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            }
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox media={photos} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ── ThreadView (portal) ───────────────────────────────────────────────────────

function ThreadView({ thread, i }) {
  if (!thread || !thread.messages?.length) return null;
  return (
    <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.15rem' }}>
      <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        💬 {i.conversationLabel}
      </div>
      {thread.messages.map(msg => {
        const isClient = msg.sender_type === 'client';
        const isNew = !isClient && !msg.read_at;
        return (
          <div key={msg.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{
              maxWidth: '82%',
              background: isClient ? '#eff6ff' : isNew ? '#f0fdf4' : '#f8fafc',
              borderRadius: isClient ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.835rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: isNew ? '1px solid #bbf7d0' : 'none',
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: isClient ? '#1d4ed8' : '#15803d', marginBottom: '0.2rem' }}>
                {isClient ? i.conversationFromClient : i.conversationFromContractor}
                {isNew && <span style={{ marginLeft: '0.4rem', background: '#bbf7d0', color: '#15803d', borderRadius: 99, padding: '0.05rem 0.3rem', fontSize: '0.6rem' }}>Új</span>}
              </div>
              {msg.body}
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.2rem', textAlign: isClient ? 'right' : 'left' }}>
                {new Date(msg.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })} · {new Date(msg.created_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── QuoteCard ─────────────────────────────────────────────────────────────────

function QuoteCard({ quote, thread, onRespond, onQuestionSent, termsPdfUrl, termsPdfName, contractorName, i, locale }) {
  const [open, setOpen]       = useState(false);
  const [modal, setModal]     = useState(null);
  const [comment, setComment] = useState('');
  const [responding, setResponding] = useState(false);
  const [questionDone, setQuestionDone] = useState(false);
  const [respondError, setRespondError] = useState('');
  const [downloading, setDownloading]   = useState(false);
  const [downloadErr,  setDownloadErr]  = useState('');

  const allEntries = quote.entries || [];
  const sections   = quote.sections || [];

  // Sort entries: material → labour → transport → equipment → other
  const sortedFlat = [...allEntries].sort((a, b) =>
    (ENTRY_ORDER[a.entry_type] ?? 4) - (ENTRY_ORDER[b.entry_type] ?? 4)
  );
  // Group by type
  const entryGroups = [];
  const seen = {};
  for (const e of sortedFlat) {
    const t = e.entry_type || 'other';
    if (!seen[t]) { seen[t] = []; entryGroups.push({ type: t, entries: seen[t] }); }
    seen[t].push(e);
  }

  const net     = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate = Number(quote.tax_percent ?? 27);
  const tax     = Math.round(net * taxRate / 100);
  const gross   = net + tax;
  const canRespond = quote.status === 'sent' && !!onRespond;
  const leftColor  = QUOTE_LEFT[quote.status] || '#e2e8f0';

  const closeModal = () => { setModal(null); setComment(''); setRespondError(''); setQuestionDone(false); };
  const openModal  = (t) => { setComment(''); setRespondError(''); setModal(t); };

  const doRespond = async (action) => {
    setResponding(true); setRespondError('');
    try {
      await onRespond(quote.id, action, comment);
      if (action === 'question') {
        setQuestionDone(true);
        if (onQuestionSent) onQuestionSent(quote.id, comment.trim());
        setTimeout(closeModal, 2000);
      } else closeModal();
    } catch (e) {
      setRespondError(e.message || i.errGeneric);
    } finally { setResponding(false); }
  };

  const handlePdf = async () => {
    setDownloading(true); setDownloadErr('');
    try {
      const res = await fetch(`/api/portal/quotes/${quote.id}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `Offer_${quote.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadErr(e.message);
    } finally { setDownloading(false); }
  };

  const typeLabel = { material: i.typeMaterial, labour: i.typeLabour, transport: i.typeTransport, equipment: i.typeEquipment, other: i.typeOther };
  const btnBase = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: FONT, border: '1.5px solid', transition: 'opacity 0.15s' };

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 14, borderLeft: `4px solid ${leftColor}`, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '0.85rem' }}>
        <div style={{ padding: '1rem 1.15rem' }}>

          {/* Row 1: badges + gross */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
            <DocTypeBadge type="offer" i={i} />
            <StatusPill status={quote.status} i={i} />
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: BRAND, flexShrink: 0 }}>
              {fmtMoney(gross)}
            </span>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.25 }}>
            {quote.title}
          </h3>

          {/* Meta */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
            {contractorName && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={12} />{contractorName}</span>}
            {quote.created_at && <span>📅 {fmtDate(quote.created_at, locale)}</span>}
            {quote.work_type  && <span>🔨 {quote.work_type}</span>}
            {quote.location   && <span>📍 {quote.location}</span>}
            {allEntries.length > 0 && <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{allEntries.length} {i.itemsLabel}</span>}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {allEntries.length > 0 && (
              <button onClick={() => setOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569', fontFamily: FONT }}>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {open ? i.hideDetails : i.showDetails}
              </button>
            )}
            <button onClick={handlePdf} disabled={downloading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: 8, background: downloading ? '#f1f5f9' : '#eff6ff', border: '1px solid #bfdbfe', cursor: downloading ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, color: downloading ? '#94a3b8' : '#1d4ed8', fontFamily: FONT }}>
              {downloading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={13} />}
              {i.downloadPdf}
            </button>
            {termsPdfUrl && (
              <a href={termsPdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                <FileText size={13} /> {termsPdfName || i.downloadTerms}
              </a>
            )}
          </div>

          {downloadErr && <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#dc2626' }}>{downloadErr}</p>}

          {/* Respond actions (only when sent) */}
          {canRespond && (
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => openModal('question')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                {i.questionBtn}
              </button>
              <button onClick={() => openModal('reject')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                <XCircle size={14} /> {i.rejectBtn}
              </button>
              <button onClick={() => openModal('accept')}
                style={{ ...btnBase, flex: '1 1 auto', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
                <CheckCircle2 size={14} /> {i.acceptBtn}
              </button>
            </div>
          )}
        </div>

        {/* Expanded entries */}
        {open && allEntries.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.15rem' }}>
            {/* Sections take priority over flat grouping */}
            {sections.length > 0 ? (
              sections.map(s => {
                const sortedSectionEntries = [...(s.entries || [])].sort((a, b) =>
                  (ENTRY_ORDER[a.entry_type] ?? 4) - (ENTRY_ORDER[b.entry_type] ?? 4)
                );
                return (
                  <div key={s.id} style={{ marginBottom: '0.9rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      🏠 {s.name}
                      {s.size_m2 && <span style={{ fontWeight: 400, textTransform: 'none' }}>{s.size_m2} m²</span>}
                    </div>
                    {sortedSectionEntries.map((e, idx) => (
                      <EntryRow key={e.id} entry={e} isLast={idx === sortedSectionEntries.length - 1} i={i} typeLabel={typeLabel} />
                    ))}
                  </div>
                );
              })
            ) : (
              entryGroups.map(({ type, entries }) => (
                <div key={type} style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.35rem', paddingBottom: '0.25rem', borderBottom: '1px solid #f1f5f9' }}>
                    {typeLabel[type] || type}
                  </div>
                  {entries.map((e, idx) => (
                    <EntryRow key={e.id} entry={e} isLast={idx === entries.length - 1} i={i} typeLabel={typeLabel} />
                  ))}
                </div>
              ))
            )}

            {/* Totals */}
            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
              {taxRate > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>{i.netLabel}</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmtMoney(net)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <span>{i.vatLabel} {taxRate}%</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmtMoney(tax)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, color: BRAND }}>
                <span>{i.grossLabel}</span>
                <span style={{ fontFamily: 'monospace' }}>{fmtMoney(gross)}</span>
              </div>
            </div>
          </div>
        )}

      {/* Thread conversation (if the client has had a conversation about this quote) */}
      {thread && <ThreadView thread={thread} i={i} />}
      </div>

      {/* Modals */}
      {modal === 'accept' && (
        <ActionModal title={i.acceptTitle} onClose={closeModal}>
          <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.65, margin: '0 0 1rem' }}>
            {i.acceptConfirm}<br /><strong style={{ color: BRAND }}>{quote.title}</strong><br />
            <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{fmtMoney(gross)}</span>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.75rem' }}>{i.acceptNote}</p>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>{i.acceptCommentLabel}</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={i.acceptCommentPh} rows={2}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: '1.25rem' }} />
          {respondError && <p style={{ margin: '-0.75rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeModal} style={{ padding: '0.55rem 1rem', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontFamily: FONT, fontWeight: 700 }}>{i.cancelBtn}</button>
            <button type="button" onClick={() => doRespond('accepted')} disabled={responding}
              style={{ padding: '0.55rem 1rem', borderRadius: 10, background: '#16a34a', border: '1px solid #16a34a', color: '#fff', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, opacity: responding ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>{i.rejectReasonLabel}</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={i.rejectPh} rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: comment.trim().length > 0 && comment.trim().length < 10 ? '0.4rem' : '1.25rem' }} />
          {comment.trim().length > 0 && comment.trim().length < 10 && <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: '#94a3b8' }}>{i.rejectMinHint}</p>}
          {respondError && <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeModal} style={{ padding: '0.55rem 1rem', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontFamily: FONT, fontWeight: 700 }}>{i.cancelBtn}</button>
            <button type="button" onClick={() => doRespond('rejected')} disabled={responding || comment.trim().length < 10}
              style={{ padding: '0.55rem 1rem', borderRadius: 10, background: '#dc2626', border: '1px solid #dc2626', color: '#fff', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, opacity: responding || comment.trim().length < 10 ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
              <p style={{ color: '#15803d', fontWeight: 700, margin: 0 }}>{i.questionSentConfirm}</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.75rem' }}>{i.questionDesc}</p>
              <textarea autoFocus value={comment} onChange={e => setComment(e.target.value)} placeholder={i.questionPh} rows={4}
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 0.85rem', fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical', outline: 'none', marginBottom: comment.trim().length > 0 && comment.trim().length < 10 ? '0.4rem' : '1.25rem' }} />
              {comment.trim().length > 0 && comment.trim().length < 10 && <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: '#94a3b8' }}>{i.questionMinHint}</p>}
              {respondError && <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.825rem', color: '#dc2626' }}>{respondError}</p>}
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} style={{ padding: '0.55rem 1rem', borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontFamily: FONT, fontWeight: 700 }}>{i.cancelBtn}</button>
                <button type="button" onClick={() => doRespond('question')} disabled={responding || comment.trim().length < 10}
                  style={{ padding: '0.55rem 1rem', borderRadius: 10, background: ACCENT, border: `1px solid ${ACCENT}`, color: '#fff', cursor: comment.trim().length < 10 ? 'not-allowed' : 'pointer', fontFamily: FONT, fontWeight: 700, opacity: responding || comment.trim().length < 10 ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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

function EntryRow({ entry, isLast, i, typeLabel }) {
  const tb = TYPE_BADGE[entry.entry_type] || TYPE_BADGE.other;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0', borderBottom: isLast ? 'none' : '1px solid #f8fafc' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.08rem 0.4rem', borderRadius: 99, background: tb.bg, color: tb.color, whiteSpace: 'nowrap' }}>
            {typeLabel[entry.entry_type] || entry.entry_type}
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: BRAND }}>{entry.work_description}</span>
        </div>
        {(entry.quantity != null || entry.unit_price) && (
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', paddingLeft: '0.1rem' }}>
            {entry.quantity != null && entry.unit ? `${entry.quantity} ${entry.unit}` : ''}
            {entry.unit_price ? ` × ${Number(entry.unit_price).toLocaleString('hu-HU')} Ft` : ''}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap', paddingTop: '0.15rem' }}>
        {fmtMoney(entry.amount_huf)}
      </div>
    </div>
  );
}

// ── ProjectListCard ───────────────────────────────────────────────────────────

function ProjectListCard({ project, onSelect, contractorName, i, locale }) {
  const isActive   = ACTIVE_STATUSES.has(project.status);
  const leftColor  = isActive ? '#3b82f6' : '#94a3b8';
  const sharedCount = (project.quotes?.length || 0) + (project.invoices?.length || 0) +
    (project.labourEntries?.length || 0) + (project.media?.length || 0) + (project.diaryEntries?.length || 0);
  const pendingQuote = (project.quotes || []).find(q => q.status === 'sent');

  return (
    <div onClick={() => onSelect(project)}
      style={{ background: '#fff', borderRadius: 14, borderLeft: `4px solid ${leftColor}`, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: '1rem 1.15rem', marginBottom: '0.85rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.11)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)'}
    >
      {/* Row 1: badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
        <DocTypeBadge type="project" i={i} />
        <ProjectStatusPill status={project.status} i={i} />
        {pendingQuote && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: '#fffbeb', color: '#a16207', border: '1px solid #fde68a', flexShrink: 0 }}>
            ⏳ {i.statusSent}
          </span>
        )}
        {sharedCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: ACCENT, background: '#eff6ff', padding: '0.1rem 0.5rem', borderRadius: 99, border: '1px solid #bfdbfe', flexShrink: 0 }}>
            {i.sharedItemsCount.replace('{n}', sharedCount)}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.25 }}>
        {project.name}
      </h3>
      {project.description && (
        <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0 0 0.3rem', lineHeight: 1.5 }}>{project.description}</p>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>
        {contractorName && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={12} />{contractorName}</span>}
        {project.start_date && <span>📅 {fmtDate(project.start_date, locale)}</span>}
        {project.end_date && <span>→ {fmtDate(project.end_date, locale)}</span>}
      </div>

      {/* Footer cta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ACCENT, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {i.showDetails} ›
        </span>
      </div>
    </div>
  );
}

// ── ContractorSection ─────────────────────────────────────────────────────────

function ContractorSection({ contractor, multipleContractors, onSelect, onRespond, onQuestionSent, threads, i, locale }) {
  const standaloneQuotes = contractor.standaloneQuotes || [];
  const projects         = contractor.projects || [];

  // Flat sorted list: quotes + projects, newest first
  const allDocs = [
    ...standaloneQuotes.map(q => ({ kind: 'quote',   item: q, date: q.created_at })),
    ...projects.map(p =>         ({ kind: 'project', item: p, date: p.created_at })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const contractorNameForCard = !multipleContractors ? contractor.contractor_name : null;

  return (
    <div style={{ marginBottom: multipleContractors ? '2rem' : 0 }}>
      {/* Contractor header (only shown when multiple contractors) */}
      {multipleContractors && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: '0.85rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.15rem' }}>🏗</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: BRAND }}>{contractor.contractor_name}</div>
            {contractor.contractor_email && <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.1rem' }}>{contractor.contractor_email}</div>}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0, textAlign: 'right' }}>
            {i.docsCount.replace('{n}', allDocs.length)}
          </div>
        </div>
      )}

      {allDocs.map(({ kind, item }) =>
        kind === 'quote'
          ? <QuoteCard key={item.id} quote={item} onRespond={onRespond} onQuestionSent={onQuestionSent}
              thread={(threads || []).find(t => t.quote_id === item.id) || null}
              termsPdfUrl={contractor.terms_pdf_url} termsPdfName={contractor.terms_pdf_name}
              contractorName={contractorNameForCard} i={i} locale={locale} />
          : <ProjectListCard key={item.id} project={item}
              onSelect={proj => onSelect(proj, contractor)}
              contractorName={contractorNameForCard} i={i} locale={locale} />
      )}

      {allDocs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#94a3b8' }}>
          {i.noContentContractor}
        </div>
      )}
    </div>
  );
}

// ── ProjectDetailView ─────────────────────────────────────────────────────────

function StatTile({ label, value }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 80, background: '#f8fafc', borderRadius: 10, padding: '0.65rem 0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.3rem', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.875rem', color: BRAND }}>{value || '—'}</div>
    </div>
  );
}

function ProjectDetailView({ project, contractor, onBack, onRespond, i, locale }) {
  const quotes   = project.quotes      || [];
  const invoices = project.invoices    || [];
  const labour   = project.labourEntries || [];
  const media    = project.media       || [];
  const diary    = project.diaryEntries || [];

  const allTabs = [
    { id: 'quote',    label: i.tabQuote,    visible: quotes.length > 0 },
    { id: 'invoices', label: i.tabInvoices, visible: invoices.length > 0 },
    { id: 'labour',   label: i.tabLabour,   visible: labour.length > 0 },
    { id: 'media',    label: i.tabMedia,    visible: media.length > 0 },
    { id: 'diary',    label: i.tabDiary,    visible: diary.length > 0 },
  ].filter(t => t.visible);

  const [activeTab, setActiveTab] = useState(allTabs[0]?.id || 'quote');

  const quoteGross = quotes.reduce((s, q) => {
    const entries = q.entries || [];
    const net = entries.reduce((es, e) => es + Number(e.amount_huf || 0), 0);
    return s + net + Math.round(net * Number(q.tax_percent ?? 27) / 100);
  }, 0);
  const invoiceTotal = invoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  const labourTotal  = labour.reduce((s, l) => s + Number(l.value_huf || 0), 0);
  const leftColor    = ACTIVE_STATUSES.has(project.status) ? '#3b82f6' : '#94a3b8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Detail header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0.9rem 1.1rem' }}>
        <button type="button" onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 700, color: ACCENT, fontFamily: FONT, padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.65rem' }}>
          <ArrowLeft size={14} /> {i.backToProjects}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <DocTypeBadge type="project" i={i} />
          <ProjectStatusPill status={project.status} i={i} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.2, borderLeft: `4px solid ${leftColor}`, paddingLeft: '0.65rem' }}>{project.name}</h2>
        {contractor && <div style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '0.65rem' }}>🏗 {contractor.contractor_name}</div>}

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
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: '#f8fafc' }}>
        {activeTab === 'quote' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quotes.map(q => (
              <QuoteCard key={q.id} quote={q} onRespond={onRespond}
                termsPdfUrl={contractor?.terms_pdf_url} termsPdfName={contractor?.terms_pdf_name}
                i={i} locale={locale} />
            ))}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textAlign: 'right', marginBottom: '0.5rem' }}>
              {i.invoiceTotalLabel}: <span style={{ fontFamily: 'monospace' }}>{fmtMoney(invoiceTotal)}</span>
            </div>
            {invoices.map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#fff', borderRadius: 10, marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {inv.category && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', borderRadius: 99, padding: '0.1rem 0.45rem', marginRight: '0.35rem' }}>{inv.category}</span>}
                  {inv.description && <span style={{ fontSize: '0.83rem', color: BRAND }}>{inv.description}</span>}
                  {inv.created_at && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>{fmtDate(inv.created_at, locale)}</div>}
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap' }}>{fmtMoney(inv.value_huf)}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'labour' && (
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textAlign: 'right', marginBottom: '0.5rem' }}>
              {i.labourTotalLabel}: <span style={{ fontFamily: 'monospace' }}>{fmtMoney(labourTotal)}</span>
            </div>
            {labour.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#fff', borderRadius: 10, marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: BRAND }}>{l.labour_type}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {l.date && fmtDate(l.date, locale)}{l.hours != null && l.unit ? ` · ${l.hours} ${l.unit}` : ''}
                  </div>
                </div>
                {l.value_huf > 0 && <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap' }}>{fmtMoney(l.value_huf)}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'media' && (
          <MediaSection media={media} />
        )}

        {activeTab === 'diary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {diary.map(entry => (
              <div key={entry.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', borderLeft: `3px solid ${ACCENT}`, padding: '0.85rem 1rem' }}>
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
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', fontSize: '0.875rem' }}>{i.noSharedItems}</div>
        )}
      </div>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

function PortalDashboard() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const asEmail      = searchParams.get('as');
  const [locale]     = useLandingLocale();
  const i            = PORTAL_I18N[locale] || PORTAL_I18N.hu;

  const [email, setEmail] = useState('');
  const [saMode, setSaMode]           = useState(false);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [selectedProject,    setSelectedProject]    = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [threads, setThreads] = useState([]);

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
      fetch('/api/portal/session')
        .then(r => r.ok ? r.json() : null)
        .then(session => {
          if (!session) { router.replace('/portal'); return; }
          setEmail(session.email);
          fetchData(null);
        })
        .catch(() => router.replace('/portal'));
    }
  }, [asEmail]);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/threads');
      if (res.ok) {
        const d = await res.json();
        setThreads(d.threads || []);
      }
    } catch { /* non-fatal */ }
  }, []);

  const fetchData = useCallback(async (overrideEmail) => {
    setLoading(true); setError('');
    try {
      const url  = overrideEmail ? `/api/portal/data?email=${encodeURIComponent(overrideEmail)}` : '/api/portal/data';
      const [res] = await Promise.all([fetch(url), fetchThreads()]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || i.errGeneric);
      setContractors(data.contractors || []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [i, fetchThreads]);

  // Poll threads every 30s for live updates (US-MSG-011)
  useEffect(() => {
    const interval = setInterval(fetchThreads, 30000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  const handleRespond = async (quoteId, action, comment = '') => {
    const res  = await fetch(`/api/portal/quotes/${quoteId}/respond`, {
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
          ...p, quotes: (p.quotes || []).map(q => q.id === quoteId ? { ...q, status: action } : q),
        })),
      })));
      setSelectedProject(prev => prev ? ({
        ...prev, quotes: (prev.quotes || []).map(q => q.id === quoteId ? { ...q, status: action } : q),
      }) : null);
    }
  };

  // When client sends a question, optimistically add their message to local thread state
  const handleQuestionSent = (quoteId, messageBody) => {
    setThreads(prev => {
      const existing = prev.find(t => t.quote_id === quoteId);
      const newMsg = { id: `optimistic-${Date.now()}`, thread_id: existing?.id || null, sender_type: 'client', body: messageBody, read_at: null, created_at: new Date().toISOString() };
      if (existing) {
        return prev.map(t => t.quote_id === quoteId ? { ...t, messages: [...(t.messages || []), newMsg] } : t);
      }
      // Create placeholder thread (will be replaced on next poll)
      return [...prev, { id: `pending-${quoteId}`, quote_id: quoteId, messages: [newMsg] }];
    });
  };

  const handleLogout = async () => {
    await fetch('/api/portal/logout', { method: 'POST' });
    router.replace('/portal');
  };

  const totalPending = contractors.reduce((s, c) => {
    const sp = (c.standaloneQuotes || []).filter(q => q.status === 'sent').length;
    const pp = (c.projects || []).reduce((ps, p) => ps + (p.quotes || []).filter(q => q.status === 'sent').length, 0);
    return s + sp + pp;
  }, 0);

  const multipleContractors = contractors.length > 1;
  const singleContractor    = contractors.length === 1 ? contractors[0] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: FONT, WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>
      {/* SA mode banner */}
      {saMode && (
        <div style={{ background: '#854d0e', color: '#fef9c3', padding: '0.4rem 1rem', fontSize: '0.775rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: FONT }}>
          <span style={{ flex: 1 }}>👁 {i.saBanner} {email}</span>
          <button type="button" onClick={() => router.push('/superadmin/portals')}
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#fef9c3', fontWeight: 700, fontSize: '0.75rem', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={12} /> {i.saBackBtn}
          </button>
        </div>
      )}

      {/* Top navigation bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: BRAND, boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', height: 54 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🏗</div>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {i.pageTitle}
          </span>
          {email && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'none' }}
              className="portal-email">{email}</span>
          )}
          {!saMode && (
            <button type="button" onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.3rem 0.7rem', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', fontWeight: 600, fontFamily: FONT, flexShrink: 0 }}>
              <LogOut size={13} /> {i.logoutBtn}
            </button>
          )}
        </div>
      </div>

      {/* Detail view — full-screen overlay */}
      {selectedProject && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 760, margin: '0 auto', width: '100%' }}>
          <ProjectDetailView
            project={selectedProject} contractor={selectedContractor}
            onBack={() => { setSelectedProject(null); setSelectedContractor(null); }}
            onRespond={handleRespond} i={i} locale={locale}
          />
        </div>
      )}

      {/* List view */}
      {!selectedProject && (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem 3rem', width: '100%' }}>

          {/* Single contractor: show contractor card at top */}
          {singleContractor && !loading && !error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.1rem', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>🏗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: BRAND }}>{singleContractor.contractor_name}</div>
                {singleContractor.contractor_email && (
                  <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.1rem' }}>{singleContractor.contractor_email}</div>
                )}
              </div>
              {totalPending > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fffbeb', color: '#a16207', border: '1px solid #fde68a', borderRadius: 99, padding: '0.3rem 0.75rem', flexShrink: 0 }}>
                  ⏳ {i.pendingBadge.replace('{n}', totalPending)}
                </span>
              )}
            </div>
          )}

          {/* Welcome / stats */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: BRAND, margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>{i.welcomeTitle}</h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              <strong style={{ color: BRAND }}>{email}</strong>
              {!loading && contractors.length > 1 && <> · {i.contractorsCount.replace('{n}', contractors.length)}</>}
              {!loading && contractors.length === 0 && <> · {i.noContentYet}</>}
            </p>
            {totalPending > 0 && !singleContractor && (
              <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '0.3rem 0.85rem', fontSize: '0.825rem', fontWeight: 700, color: '#a16207' }}>
                {i.pendingBadge.replace('{n}', totalPending)}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{i.loadingText}</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && contractors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ fontWeight: 700, color: BRAND, margin: '0 0 0.4rem' }}>{i.noContent}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{i.noContentDesc}</p>
            </div>
          )}

          {/* Documents */}
          {!loading && contractors.map(c => (
            <ContractorSection
              key={c.owner_id} contractor={c}
              multipleContractors={multipleContractors}
              onSelect={(proj, contractor) => { setSelectedProject(proj); setSelectedContractor(contractor); }}
              onRespond={handleRespond}
              onQuestionSent={handleQuestionSent}
              threads={threads.filter(t => c.client_id === t.client_id)}
              i={i} locale={locale}
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
  return <Suspense><PortalDashboard /></Suspense>;
}
