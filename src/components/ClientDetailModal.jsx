'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Modal from './Modal';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import {
  Phone, Mail, MapPin, Building2, Hash, Percent, ShieldCheck, Share2,
  Trash2, FileText, FolderKanban, ClipboardList, MessageSquare, Send, Plus,
  AlertCircle, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Check,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>
      {initials}
    </div>
  );
}

function relativeTime(isoStr, locale = 'hu') {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const rtf   = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (mins < 1)   return rtf.format(0, 'minute');
  if (mins < 60)  return rtf.format(-mins, 'minute');
  if (hours < 24) return rtf.format(-hours, 'hour');
  if (days < 7)   return rtf.format(-days, 'day');
  return new Date(isoStr).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// Field that saves silently on blur if the value changed
function InlineField({ label, value, onSave, type = 'text', placeholder, required, multiline }) {
  const [val, setVal]       = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');

  useEffect(() => { setVal(value ?? ''); }, [value]);

  const handleBlur = async () => {
    const next = typeof val === 'string' ? val.trim() : val;
    const prev = (value ?? '').toString().trim();
    if (next === prev) return;
    if (required && !next) { setVal(value ?? ''); return; }
    setErr(''); setSaving(true);
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const base = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
    padding: '0.4rem 0.6rem', fontSize: '0.875rem', fontFamily: 'inherit',
    background: 'var(--bg-base)', outline: 'none', lineHeight: 1.5,
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</label>
        {saving && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', flexShrink: 0 }} />}
        {saved  && <Check size={11} style={{ color: 'var(--success-text)', flexShrink: 0 }} />}
      </div>
      {multiline
        ? <textarea rows={2} value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur} placeholder={placeholder} style={{ ...base, resize: 'vertical' }} />
        : <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur} placeholder={placeholder} style={base} />
      }
      {err && <p style={{ fontSize: '0.72rem', color: 'var(--danger-text)', margin: '0.15rem 0 0' }}>{err}</p>}
    </div>
  );
}

// Inline message bubble
function Bubble({ msg, isYou, locale }) {
  return (
    <div style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start', marginBottom: '0.4rem' }}>
      <div style={{
        maxWidth: '80%',
        background: isYou ? 'var(--accent)' : 'var(--bg-subtle)',
        color: isYou ? '#fff' : 'var(--text-primary)',
        borderRadius: isYou ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding: '0.5rem 0.75rem', fontSize: '0.84rem', lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.body}
        <div style={{ fontSize: '0.62rem', marginTop: '0.2rem', opacity: 0.65, textAlign: isYou ? 'right' : 'left' }}>
          {relativeTime(msg.created_at, locale)}
        </div>
      </div>
    </div>
  );
}

// Messages tab content
function ClientThreads({ clientId, t, tc }) {
  const locale = useLocale();
  const [threads, setThreads]       = useState(null);
  const [openId,  setOpenId]        = useState(null);
  const [reply,   setReply]         = useState('');
  const [sending, setSending]       = useState(false);
  const [sendErr, setSendErr]       = useState('');
  const [newMsg,  setNewMsg]        = useState('');
  const [creating, setCreating]     = useState(false);
  const [showNew,  setShowNew]      = useState(false);
  const bottomRef = useRef(null);

  const load = () =>
    fetch(`/api/threads?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => setThreads([]));

  useEffect(() => { load(); }, [clientId]);

  useEffect(() => {
    if (openId && threads) {
      const thread = threads.find(t => t.id === openId);
      if (thread?.unread_count > 0) {
        fetch(`/api/threads/${openId}/read`, { method: 'PATCH' })
          .then(() => window.dispatchEvent(new CustomEvent('epitek:msg-read')))
          .catch(() => {});
        setThreads(prev => prev.map(t => t.id === openId ? { ...t, unread_count: 0 } : t));
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    }
  }, [openId, threads?.find?.(t => t.id === openId)?.messages?.length]);

  const handleReply = async (threadId) => {
    if (!reply.trim() || sending) return;
    setSending(true); setSendErr('');
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || t('newMsgErr'));
      const { message: msg } = await res.json();
      setThreads(prev => prev.map(th => th.id === threadId
        ? { ...th, messages: [...(th.messages || []), msg] }
        : th
      ));
      setReply('');
    } catch (e) { setSendErr(e.message); }
    finally { setSending(false); }
  };

  const handleNewThread = async () => {
    if (!newMsg.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/threads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, message: newMsg.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || t('newMsgErr'));
      const { thread_id, message } = await res.json();
      const newThread = { id: thread_id, quote_id: null, messages: [message], unread_count: 0 };
      setThreads(prev => [newThread, ...(prev || [])]);
      setNewMsg(''); setShowNew(false); setOpenId(thread_id);
    } catch { /* non-fatal */ }
    finally { setCreating(false); }
  };

  if (threads === null) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const hasGeneral = threads.some(th => !th.quote_id);

  return (
    <div>
      {/* New message composer */}
      {!hasGeneral && !showNew && (
        <button type="button" onClick={() => setShowNew(true)} className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <Plus size={14} /> {t('newMessage')}
        </button>
      )}
      {showNew && (
        <div className="card" style={{ padding: '0.85rem', marginBottom: '0.75rem' }}>
          <textarea autoFocus value={newMsg} onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNewThread(); } }}
            placeholder={t('newMessagePlaceholder')} rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.65rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowNew(false); setNewMsg(''); }} className="btn btn-secondary btn-sm">{tc('cancel')}</button>
            <button type="button" onClick={handleNewThread} disabled={creating || !newMsg.trim()} className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Send size={12} /> {creating ? t('sending') : t('sendReply')}
            </button>
          </div>
        </div>
      )}

      {threads.length === 0 && !showNew && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem 0' }}>{t('noConversations')}</p>
      )}

      {/* Thread list */}
      {threads.map(thread => {
        const isOpen = openId === thread.id;
        const title  = thread.quote_id ? t('quoteThread', { title: thread.quote_title || '' }) : t('generalThread');
        return (
          <div key={thread.id} className="card" style={{ marginBottom: '0.5rem', overflow: 'hidden' }}>
            {/* Thread header — tap to expand */}
            <button type="button" onClick={() => setOpenId(isOpen ? null : thread.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: isOpen ? 'var(--bg-subtle)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <MessageSquare size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
              {thread.unread_count > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: '0.63rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                  {thread.unread_count}
                </span>
              )}
            </button>

            {/* Messages + reply — shown when open */}
            {isOpen && (
              <>
                <div style={{ maxHeight: 240, overflowY: 'auto', padding: '0.65rem 0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {(thread.messages || []).map(msg => (
                    <Bubble key={msg.id} msg={msg} isYou={msg.sender_type === 'user'} locale={locale} />
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div style={{ padding: '0.5rem 0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(thread.id); } }}
                    placeholder={t('replyPlaceholder')} rows={1}
                    style={{ flex: 1, border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.6rem', fontSize: '0.84rem', fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 72, overflowY: 'auto', lineHeight: 1.5, background: 'var(--bg-base)' }} />
                  <button type="button" onClick={() => handleReply(thread.id)} disabled={sending || !reply.trim()} className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.65rem' }}>
                    <Send size={12} /> {sending ? t('sending') : t('sendReply')}
                  </button>
                </div>
                {sendErr && <p style={{ padding: '0 0.85rem 0.4rem', fontSize: '0.75rem', color: 'var(--danger-text)', margin: 0 }}>{sendErr}</p>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ClientDetailModal({ clientId, onClose, onDeleted }) {
  const {
    clients, quotes, quoteEntries, projects, invoices, surveys,
    updateClient, deleteClient, collectives, userCurrency,
  } = useApp();

  const fmt = (n) => formatMoney(n, userCurrency);
  const t  = useTranslations('clients');
  const tc = useTranslations('common');

  const client = clients.find(c => c.id === clientId);

  const [activeTab,     setActiveTab]     = useState('quotes');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [formShares,    setFormShares]    = useState([]);
  const [formSharesInit,setFormSharesInit]= useState([]);
  const [formSharesGdpr,setFormSharesGdpr]= useState(false);
  const [sharesSaving,  setSharesSaving]  = useState(false);
  const [sharesError,   setSharesError]   = useState('');

  // Initialize shares when modal opens
  useEffect(() => {
    if (!client) return;
    const existing = client.client_collective_shares?.map(s => s.collective_id) || [];
    setFormShares(existing);
    setFormSharesInit(existing);
    setFormSharesGdpr(false);
    setSharesError('');
  }, [clientId]);

  if (!client) return null;

  const clientQuotes   = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(p => p.client_id === client.id || quoteProjectIds.has(p.id));
  const clientSurveys  = surveys.filter(s => s.client_id === client.id);

  const totalQuoted = clientQuotes.reduce((sum, q) =>
    sum + quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0), 0);
  const totalInvoiced = clientProjects.reduce((sum, p) =>
    sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0), 0);

  const ownedCollectives = collectives.filter(c => c.role === 'owner' || c.role === 'admin');
  const hasNewShares = formShares.some(id => !formSharesInit.includes(id));
  const shareCount   = client.client_collective_shares?.length || 0;

  // Build the full payload for auto-save (keeps all existing fields)
  const buildPayload = (overrides) => ({
    name:             client.name,
    company_name:     client.company_name || null,
    tax_number:       client.tax_number   || null,
    address:          client.address      || '',
    phone:            client.phone        || '',
    email:            client.email        || '',
    notes:            client.notes        || '',
    discount_percent: client.discount_percent || 0,
    collectiveShares: client.client_collective_shares?.map(s => s.collective_id) || [],
    sharesGdprConfirmed: true,
    ...overrides,
  });

  const saveField = (field) => async (value) => {
    await updateClient(client.id, buildPayload({ [field]: value === '' ? null : value }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteClient(client.id); onDeleted(); }
    catch { setDeleting(false); setConfirmDelete(false); }
  };

  const toggleShare = (cid) => {
    setFormShares(prev => prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]);
    setFormSharesGdpr(false);
  };

  const handleSaveShares = async () => {
    if (hasNewShares && !formSharesGdpr) { setSharesError(t('shareConsentRequired')); return; }
    setSharesSaving(true); setSharesError('');
    try {
      await updateClient(client.id, buildPayload({ collectiveShares: formShares, sharesGdprConfirmed: !hasNewShares || formSharesGdpr }));
      setFormSharesInit(formShares);
      setFormSharesGdpr(false);
    } catch (e) { setSharesError(e.message); }
    finally { setSharesSaving(false); }
  };

  const tabs = [
    { key: 'quotes',    label: t('detailTabQuotes'),    count: clientQuotes.length,   icon: <FileText size={13} /> },
    { key: 'projects',  label: t('detailTabProjects'),   count: clientProjects.length, icon: <FolderKanban size={13} /> },
    { key: 'surveys',   label: t('detailTabSurveys'),    count: clientSurveys.length,  icon: <ClipboardList size={13} /> },
    { key: 'messages',  label: t('detailTabMessages'),   count: null,                  icon: <MessageSquare size={13} /> },
  ];

  return (
    <Modal isOpen onClose={onClose} maxWidth="660px">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.1rem' }}>
        <Avatar name={client.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editable name */}
          <div style={{ marginBottom: '0.2rem' }}>
            <InlineField
              label=""
              value={client.name}
              onSave={saveField('name')}
              required
              placeholder={t('namePlaceholder')}
            />
          </div>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {client.discount_percent > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                <Percent size={10} /> {client.discount_percent}%
              </span>
            )}
            {client.gdpr_consented_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                <ShieldCheck size={10} /> GDPR
              </span>
            )}
            {shareCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                <Share2 size={10} /> {t('collectivesCount', { count: shareCount })}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} title={t('deleteTitle')}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Inline fields ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
        <InlineField label={t('phone')}       value={client.phone}        onSave={saveField('phone')}        type="tel"   placeholder="+36 70 123 4567" />
        <InlineField label={t('email')}       value={client.email}        onSave={saveField('email')}        type="email" placeholder="email@example.com" />
        <InlineField label={t('companyName')} value={client.company_name} onSave={saveField('company_name')} placeholder="Fekete Kft." />
        <InlineField label={t('taxNumber')}   value={client.tax_number}   onSave={saveField('tax_number')}   placeholder="12345678-1-01" />
      </div>
      <InlineField label={t('address')} value={client.address} onSave={saveField('address')} placeholder="8600 Siófok, Fő utca 12." />
      <InlineField label={t('discount')} value={(client.discount_percent || 0).toString()} onSave={v => saveField('discount_percent')(parseFloat(v) || 0)} type="number" placeholder="0" />
      <InlineField label={t('notes')} value={client.notes} onSave={saveField('notes')} multiline placeholder="Egyéb tudnivalók..." />

      {/* ── Shares section ── */}
      {ownedCollectives.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Share2 size={13} /> {t('shareWithCollectives')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
            {ownedCollectives.map(col => (
              <label key={col.collective_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={formShares.includes(col.collective_id)} onChange={() => toggleShare(col.collective_id)} style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                {col.name}
              </label>
            ))}
          </div>
          {hasNewShares && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', background: '#fff', border: `1px solid ${formSharesGdpr ? 'var(--success-border)' : 'var(--warning-border)'}`, cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input type="checkbox" checked={formSharesGdpr} onChange={e => setFormSharesGdpr(e.target.checked)} style={{ marginTop: '0.1rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t('shareGdprConfirmText')} <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
            </label>
          )}
          {sharesError && <p style={{ fontSize: '0.78rem', color: 'var(--danger-text)', margin: '0 0 0.4rem' }}>{sharesError}</p>}
          {(JSON.stringify(formShares.sort()) !== JSON.stringify(formSharesInit.sort())) && (
            <button type="button" onClick={handleSaveShares} disabled={sharesSaving} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {sharesSaving ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {tc('saving')}</> : <><CheckCircle2 size={12} /> {tc('save')}</>}
            </button>
          )}
        </div>
      )}

      {/* ── Financial summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.1rem' }}>
        <div style={{ padding: '0.65rem 0.85rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning-text)', marginBottom: '0.15rem' }}>{t('detailTotalQuotes')}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(totalQuoted)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('detailQuotesCount', { count: clientQuotes.length })}</div>
        </div>
        <div style={{ padding: '0.65rem 0.85rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success-text)', marginBottom: '0.15rem' }}>{t('detailInvoiced')}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(totalInvoiced)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('detailProjectsCount', { count: clientProjects.length })}</div>
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
          <AlertTriangle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.4rem' }}>{t('deleteConfirmMessage', { name: client.name })}</div>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>{tc('cancel')}</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={12} className="animate-spin" /> {tc('delete')}…</> : <><Trash2 size={12} /> {tc('delete')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--border-subtle)', marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '-2px', transition: 'color 0.15s' }}>
            {tab.icon} {tab.label}
            {tab.count !== null && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, background: activeTab === tab.key ? 'var(--accent-light)' : 'var(--bg-subtle)', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)', padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Quotes */}
      {activeTab === 'quotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {clientQuotes.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>{t('noQuotesForClient')}</p>
            : clientQuotes.map(q => {
                const total = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{formatDate(q.created_at)}{q.location && ` · ${q.location}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{fmt(total)}</span>
                      <StatusBadge status={q.status} />
                      <Link href={`/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}><ExternalLink size={12} /></Link>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Projects */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {clientProjects.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>{t('noProjectsForClient')}</p>
            : clientProjects.map(p => {
                const pCost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{fmt(pCost)}</span>
                      <Link href={`/projektek/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}><ExternalLink size={12} /></Link>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Surveys */}
      {activeTab === 'surveys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {clientSurveys.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>{t('noSurveysForClient')}</p>
            : clientSurveys.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.date ? formatDate(s.date) : formatDate(s.created_at)}{s.location && ` · ${s.location}`}</div>
                  </div>
                  <Link href={`/felmeres/${s.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }} onClick={onClose}><ExternalLink size={12} /></Link>
                </div>
              ))
          }
        </div>
      )}

      {/* Messages */}
      {activeTab === 'messages' && (
        <ClientThreads clientId={client.id} t={t} tc={tc} />
      )}
    </Modal>
  );
}
