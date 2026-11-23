'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import { AlertModal } from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import {
  Plus, Search, Phone, Mail, MapPin, Globe, Copy, Check,
  ExternalLink, Pencil, Trash2, Send, X,
} from 'lucide-react';

const AVATAR_COLORS = [
  '#B8456B', '#0A7F72', '#263248', '#C2562B',
  '#6D3FD1', '#1A6B4A', '#8B4513', '#2563eb',
];

function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function MessageBubble({ msg }) {
  const isYou = msg.sender_type === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div style={{
        maxWidth: '70%', padding: '11px 14px', borderRadius: 20,
        background: isYou ? '#B8456B' : '#F4F5F8',
        color: isYou ? '#fff' : '#0E1116',
        fontSize: 15, fontWeight: 500, lineHeight: 1.4,
      }}>
        {msg.body}
      </div>
    </div>
  );
}

function MessagesTab({ clientId, quotes }) {
  const t = useTranslations('clients');
  const [threads, setThreads] = useState(null);
  const [reply, setReply] = useState({});
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/threads?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => setThreads([]));
  }, [clientId]);

  const handleSend = async (threadId) => {
    const msg = (reply[threadId] || '').trim();
    if (!msg) return;
    setSending(threadId);
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) return;
      const { message: newMsg } = await res.json();
      setThreads(prev => (prev || []).map(th =>
        th.id === threadId ? { ...th, messages: [...(th.messages || []), newMsg] } : th
      ));
      setReply(r => ({ ...r, [threadId]: '' }));
    } finally {
      setSending(null);
    }
  };

  if (threads === null) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', color: '#5A5F68' }}>
      Betöltés...
    </div>
  );

  if (threads.length === 0) return (
    <div style={{ color: '#5A5F68', fontSize: 14, fontWeight: 600, padding: '1rem 0' }}>
      {t('noConversations')}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {threads.map(th => {
        const q = quotes.find(x => x.id === th.quote_id);
        const label = q ? t('quoteThread', { title: q.title }) : t('generalThread');
        return (
          <div key={th.id} style={{ borderRadius: 16, border: '1px solid #EDEBE5', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#F4F5F8', fontSize: 13, fontWeight: 700, color: '#5A5F68', display: 'flex', gap: 8 }}>
              <span className="dk-badge" style={{ background: '#F8E4EC', color: '#8A2B4C' }}>{label}</span>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
              {(th.messages || []).map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid #EDEBE5', display: 'flex', gap: 8 }}>
              <input
                className="dk-input"
                style={{ background: '#F4F5F8', boxShadow: 'none', borderRadius: 23, height: 40 }}
                placeholder={t('replyPlaceholder')}
                value={reply[th.id] || ''}
                onChange={e => setReply(r => ({ ...r, [th.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(th.id); } }}
              />
              <button
                className="dk-btn"
                style={{ background: '#B8456B', color: '#fff', flexShrink: 0 }}
                onClick={() => handleSend(th.id)}
                disabled={sending === th.id || !(reply[th.id] || '').trim()}
              >
                <Send size={18} />
                {sending === th.id ? t('sending') : t('sendReply')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientsDesktop() {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const {
    currentUser, clients, quotes, quoteEntries, projects, invoices, surveys,
    createClient, updateClient, deleteClient,
    isDemoMode, userCurrency,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const fmt = (n) => formatMoney(n, userCurrency);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState('surveys');
  const [editClientId, setEditClientId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTax, setFormTax] = useState('');
  const [formDiscount, setFormDiscount] = useState('0');
  const [formGdpr, setFormGdpr] = useState(false);
  const [formIsCompany, setFormIsCompany] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertModal, setAlertModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Edit modal state
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTax, setEditTax] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editNotes, setEditNotes] = useState('');
  const [editIsCompany, setEditIsCompany] = useState(false);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const q = search.toLowerCase();
  const displayedList = clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q)
  );

  // selectedClient is null when the selection becomes stale (e.g. after deletion)
  const selectedClient = selectedId ? (clients.find(c => c.id === selectedId) ?? null) : null;

  const getStats = (clientId) => {
    const cQuotes = quotes.filter(q => q.client_id === clientId);
    const totalQuoteValue = cQuotes.reduce((sum, q) =>
      sum + quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0), 0);
    const quoteProjectIds = new Set(cQuotes.filter(q => q.project_id).map(q => q.project_id));
    const cProjects = projects.filter(p => p.client_id === clientId || quoteProjectIds.has(p.id));
    const totalExpenses = cProjects.reduce((sum, p) =>
      sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0), 0);
    const cSurveys = surveys.filter(s => s.client_id === clientId);
    return {
      quotes: cQuotes, quotesCount: cQuotes.length, totalQuoteValue,
      projects: cProjects, projectsCount: cProjects.length, totalExpenses,
      surveys: cSurveys, surveysCount: cSurveys.length,
    };
  };

  const getPortalUrl = (client) => {
    if (!client?.email) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/portal?email=${encodeURIComponent(client.email)}`;
  };

  const copyPortalUrl = (client) => {
    const url = getPortalUrl(client);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const openCreate = () => {
    setFormName(''); setFormCompany(''); setFormEmail(''); setFormPhone('');
    setFormAddress(''); setFormTax(''); setFormDiscount('0');
    setFormGdpr(false); setFormIsCompany(false); setFormError('');
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim()) { setFormError(t('detailNameRequired')); return; }
    setIsSubmitting(true);
    try {
      await createClient({
        name: formName.trim(),
        company_name: formIsCompany ? formCompany.trim() || null : null,
        tax_number: formIsCompany ? formTax.trim() || null : null,
        address: formAddress.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        discountPercent: parseFloat(formDiscount) || 0,
        companyName: formIsCompany ? formCompany.trim() || null : null,
        taxNumber: formIsCompany ? formTax.trim() || null : null,
        gdprConsent: formGdpr,
        collectiveShares: [],
        sharesGdprConfirmed: true,
      });
      setShowCreate(false);
    } catch (err) {
      setFormError(err.message || tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (client) => {
    setConfirmModal({
      message: t('deleteConfirmMessage', { name: client.name }),
      onConfirm: async () => {
        try {
          await deleteClient(client.id);
          setSelectedId(null);
        } catch (err) {
          setAlertModal({ message: err.message || tc('error') });
        }
      },
    });
  };

  const openEdit = (client) => {
    setEditName(client.name || '');
    setEditCompany(client.company_name || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditAddress(client.address || '');
    setEditTax(client.tax_number || '');
    setEditDiscount(String(client.discount_percent ?? 0));
    setEditNotes(client.notes || '');
    setEditIsCompany(!!(client.company_name || client.tax_number));
    setEditError('');
    setEditClientId(client.id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editName.trim()) { setEditError(t('detailNameRequired')); return; }
    setIsSaving(true);
    try {
      await updateClient(editClientId, {
        name: editName.trim(),
        company_name: editCompany.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        tax_number: editTax.trim() || null,
        discount_percent: parseFloat(editDiscount) || 0,
        notes: editNotes.trim() || null,
      });
      setEditClientId(null);
    } catch (err) {
      setEditError(err.message || tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const stats = selectedClient ? getStats(selectedClient.id) : null;
  const portalUrl = selectedClient ? getPortalUrl(selectedClient) : null;
  const submitDisabled = isSubmitting || !formGdpr;

  const DETAIL_TABS = [
    { key: 'surveys',  label: `${t('detailTabSurveys')} (${stats?.surveysCount ?? 0})` },
    { key: 'quotes',   label: `${t('detailTabQuotes')} (${stats?.quotesCount ?? 0})` },
    { key: 'projects', label: `${t('detailTabProjects')} (${stats?.projectsCount ?? 0})` },
    { key: 'messages', label: t('detailTabMessages') },
  ];

  return (
    <>
      <div className="dk-page dk-mod-clients" style={{ position: 'relative' }}>
        <header className="dk-mh">
          <span className="dk-gl" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="dk-kick">{t('desktopKicker')}</span>
            <h1 className="dk-h1">{t('pageTitle')}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="dk-btn dk-btn-w" onClick={openCreate}>
              <Plus size={20} strokeWidth={2.8} />
              {t('new')}
            </button>
          </div>
        </header>

        <div className="dk-body">
          <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>

              {/* ── LEFT PANEL ── */}
              <aside className="dk-card" style={{
                width: 380, flexShrink: 0, padding: 14,
                display: 'flex', flexDirection: 'column', gap: 10,
                alignSelf: 'stretch', overflow: 'hidden',
              }}>
                {/* Search */}
                <label style={{ position: 'relative', display: 'block', flexShrink: 0 }}>
                  <Search size={20} style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', pointerEvents: 'none' }} />
                  <input
                    className="dk-input"
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 42, background: '#F4F5F8', boxShadow: 'none', borderRadius: 23, height: 44 }}
                  />
                </label>

                {/* Client list */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {displayedList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
                      {search ? t('noResults') : t('emptyMine')}
                    </div>
                  ) : displayedList.map(client => {
                    const isSelected = client.id === selectedId;
                    const color = isSelected ? '#B8456B' : avatarColor(client.id);
                    return (
                      <button
                        key={client.id}
                        className="dk-sr"
                        onClick={() => setSelectedId(client.id)}
                        style={{
                          minHeight: 68, padding: '0 12px', borderRadius: 20, gap: 12,
                          background: isSelected ? '#F8E4EC' : 'transparent',
                        }}
                      >
                        <span style={{
                          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                          background: color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 15,
                        }}>
                          {getInitials(client.name)}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3, textAlign: 'left' }}>
                          <b style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</b>
                          <span style={{ fontSize: 13, color: '#5A5F68', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {client.company_name || client.email || client.phone || ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ── RIGHT PANEL ── */}
              {selectedClient && stats ? (
                <section className="dk-card" style={{
                  flex: 1, minWidth: 0, padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 14,
                  overflow: 'hidden',
                }}>
                  {/* Client header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <span style={{
                      width: 60, height: 60, borderRadius: 30, flexShrink: 0,
                      background: '#B8456B', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700,
                    }}>
                      {getInitials(selectedClient.name)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="dk-n" style={{ fontSize: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedClient.name}
                      </span>
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {selectedClient.gdpr_consented_at && (
                          <span className="dk-badge" style={{ background: '#E7F4EC', color: '#14532D' }}>{t('gdprConsent')}</span>
                        )}
                        {selectedClient.discount_percent > 0 && (
                          <span className="dk-badge" style={{ background: '#F8E4EC', color: '#8A2B4C' }}>
                            {selectedClient.discount_percent}% {t('discountAbbr')}
                          </span>
                        )}
                        {(selectedClient.client_collective_shares?.length || 0) > 0 && (
                          <span className="dk-badge">
                            {t('sharedWithCount', { count: selectedClient.client_collective_shares.length })}
                          </span>
                        )}
                      </span>
                    </span>
                    <button
                      className="dk-btn dk-btn-l"
                      style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => openEdit(selectedClient)}
                      aria-label={t('editClient')}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="dk-btn"
                      style={{ width: 44, padding: 0, justifyContent: 'center', background: '#FDECEC', color: '#B71C1C', flexShrink: 0 }}
                      onClick={() => handleDelete(selectedClient)}
                      aria-label={t('deleteTitle')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Stats strip */}
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    {[
                      { label: t('detailTotalQuotes'), value: fmt(stats.totalQuoteValue) },
                      { label: t('detailInvoiced'),   value: fmt(0) },
                      { label: t('detailExpenses'),   value: fmt(stats.totalExpenses) },
                    ].map(({ label, value }) => (
                      <div key={label} className="dk-card" style={{ flex: 1, padding: '14px 18px', boxShadow: 'none', background: '#F4F5F8' }}>
                        <span className="dk-m">{label}</span>
                        <br />
                        <b className="dk-n" style={{ fontSize: 22 }}>{value}</b>
                      </div>
                    ))}
                  </div>

                  {/* Contact cards */}
                  {(selectedClient.phone || selectedClient.email || selectedClient.address) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                      {selectedClient.phone && (
                        <div className="dk-card" style={{ padding: '10px 16px', boxShadow: 'none', background: '#F4F5F8', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Phone size={16} style={{ color: '#B8456B', flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedClient.phone}</span>
                        </div>
                      )}
                      {selectedClient.email && (
                        <div className="dk-card" style={{ padding: '10px 16px', boxShadow: 'none', background: '#F4F5F8', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Mail size={16} style={{ color: '#B8456B', flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedClient.email}</span>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="dk-card" style={{ padding: '10px 16px', boxShadow: 'none', background: '#F4F5F8', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <MapPin size={16} style={{ color: '#B8456B', flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedClient.address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab bar */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #EDEBE5', flexShrink: 0 }}>
                    {DETAIL_TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setDetailTab(tab.key)}
                        style={{
                          height: 44, padding: '0 16px', border: 0, background: 'transparent',
                          fontSize: 15, fontWeight: 700, cursor: 'pointer',
                          color: detailTab === tab.key ? '#8A2B4C' : '#5A5F68',
                          borderBottom: `3px solid ${detailTab === tab.key ? '#B8456B' : 'transparent'}`,
                          marginBottom: -2,
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {/* Quotes */}
                    {detailTab === 'quotes' && (
                      stats.quotes.length === 0 ? (
                        <div style={{ color: '#5A5F68', fontSize: 14, fontWeight: 600, padding: '1rem 0' }}>
                          {t('noQuotesForClient')}
                        </div>
                      ) : (
                        <div>
                          {stats.quotes.map(q => {
                            const qTotal = quoteEntries.filter(e => e.quote_id === q.id)
                              .reduce((s, e) => s + Number(e.amount_huf || 0), 0);
                            return (
                              <AppLink
                                key={q.id}
                                href={`${navPrefix}/ajanlatok/${q.id}`}
                                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                              >
                                <div className="dk-tr" style={{ gridTemplateColumns: '1fr 130px 130px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <b>{q.title}</b>
                                  </span>
                                  <span><StatusBadge status={q.status} /></span>
                                  <b>{fmt(qTotal)}</b>
                                </div>
                              </AppLink>
                            );
                          })}
                        </div>
                      )
                    )}

                    {/* Projects */}
                    {detailTab === 'projects' && (
                      stats.projects.length === 0 ? (
                        <div style={{ color: '#5A5F68', fontSize: 14, fontWeight: 600, padding: '1rem 0' }}>
                          {t('noProjectsForClient')}
                        </div>
                      ) : (
                        <div>
                          {stats.projects.map(p => {
                            const pCost = invoices.filter(inv => inv.project_id === p.id)
                              .reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
                            return (
                              <AppLink
                                key={p.id}
                                href={`${navPrefix}/projektek/${p.id}`}
                                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                              >
                                <div className="dk-tr" style={{ gridTemplateColumns: '1fr 200px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <b>{p.name}</b>
                                  </span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5A5F68' }}>
                                    {fmt(pCost)} {t('detailExpenses').toLowerCase()}
                                  </span>
                                </div>
                              </AppLink>
                            );
                          })}
                        </div>
                      )
                    )}

                    {/* Surveys */}
                    {detailTab === 'surveys' && (
                      stats.surveys.length === 0 ? (
                        <div style={{ color: '#5A5F68', fontSize: 14, fontWeight: 600, padding: '1rem 0' }}>
                          {t('noSurveysForClient')}
                        </div>
                      ) : (
                        <div>
                          {stats.surveys.map(s => (
                            <AppLink
                              key={s.id}
                              href={`${navPrefix}/felmeres/${s.id}`}
                              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                            >
                              <div className="dk-tr" style={{ gridTemplateColumns: '1fr 200px' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <b>{s.title || s.location || '—'}</b>
                                </span>
                                <span style={{ color: '#5A5F68' }}>
                                  {s.room_count ? `${s.room_count} helyiség` : ''}
                                </span>
                              </div>
                            </AppLink>
                          ))}
                        </div>
                      )
                    )}

                    {/* Messages */}
                    {detailTab === 'messages' && !isDemoMode && (
                      <MessagesTab
                        clientId={selectedClient.id}
                        quotes={stats.quotes}
                      />
                    )}
                    {detailTab === 'messages' && isDemoMode && (
                      <div style={{ color: '#5A5F68', fontSize: 14, fontWeight: 600, padding: '1rem 0' }}>
                        {t('noConversations')}
                      </div>
                    )}
                  </div>

                  {/* Portal CTA */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 20,
                    background: '#F8E4EC', color: '#8A2B4C',
                    flexShrink: 0,
                  }}>
                    <Globe size={24} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <b>{t('clientPortalLabel')}</b>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t('portalLoginHint')}</span>
                    </span>
                    <button
                      className="dk-btn"
                      style={{ background: '#B8456B', color: '#fff', flexShrink: 0 }}
                      onClick={() => copyPortalUrl(selectedClient)}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      {copied ? t('copiedBtn') : t('copyBtn')}
                    </button>
                    {portalUrl && (
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dk-btn dk-btn-w"
                        style={{ flexShrink: 0, textDecoration: 'none' }}
                      >
                        <ExternalLink size={18} />
                        {t('openPortalBtn')}
                      </a>
                    )}
                  </div>
                </section>
              ) : (
                /* Nothing selected — no empty-state placeholder, just fill space */
                <div style={{ flex: 1 }} />
              )}
          </div>
        </div>

        {/* ── PODs Edit Modal — absolute within dk-page, sidebar stays visible ── */}
        {!!editClientId && (
          <>
            <button
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                background: 'rgba(14,17,22,.55)', border: 0, cursor: 'default',
              }}
              onClick={() => setEditClientId(null)}
              aria-label={tc('cancel')}
            />
            <div
              role="dialog"
              style={{
                position: 'absolute', zIndex: 50,
                left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: 560, maxWidth: 'calc(100% - 48px)',
                maxHeight: '90%', overflowY: 'auto',
                background: '#F8F9FA', color: '#0E1116',
                borderRadius: 32, padding: 26,
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: '0 40px 80px -20px rgba(0,0,0,.6)',
              }}
            >
              {/* Dialog header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dk-n" style={{ fontSize: 26, color: '#0E1116' }}>{t('editClient')}</span>
                <button
                  className="dk-btn dk-btn-l"
                  style={{ width: 44, padding: 0, justifyContent: 'center' }}
                  onClick={() => setEditClientId(null)}
                  aria-label={tc('cancel')}
                >
                  <X size={20} />
                </button>
              </div>

              {editError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 16, fontSize: 13 }}>
                  {editError}
                </div>
              )}

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: 6, background: '#EDEBE5', padding: 4, borderRadius: 24 }}>
                  <button type="button" className="dk-chip" onClick={() => setEditIsCompany(false)} style={{ flex: 1, justifyContent: 'center', background: !editIsCompany ? '#B8456B' : 'transparent', color: !editIsCompany ? '#fff' : '#0E1116' }}>
                    {t('editTypePersonal')}
                  </button>
                  <button type="button" className="dk-chip" onClick={() => setEditIsCompany(true)} style={{ flex: 1, justifyContent: 'center', background: editIsCompany ? '#B8456B' : 'transparent', color: editIsCompany ? '#fff' : '#0E1116' }}>
                    {t('editTypeCompany')}
                  </button>
                </div>

                {/* Name + Company name */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('contactName')}</span>
                    <input className="dk-input" type="text" required autoFocus value={editName} onChange={e => setEditName(e.target.value)} placeholder={t('namePlaceholder')} />
                  </label>
                  {editIsCompany && (
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('companyName')}</span>
                      <input className="dk-input" type="text" value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder={t('companyPlaceholder')} />
                    </label>
                  )}
                </div>

                {/* Tax number + Discount (company) or just Discount (personal) */}
                {editIsCompany ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <label style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('taxNumber')}</span>
                      <input className="dk-input" type="text" value={editTax} onChange={e => setEditTax(e.target.value)} placeholder={t('taxNumberPlaceholder')} />
                    </label>
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('discount')}</span>
                      <input className="dk-input" type="number" min="0" max="100" step="0.5" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <label style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('discount')}</span>
                    <input className="dk-input" type="number" min="0" max="100" step="0.5" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                  </label>
                )}

                {/* Email + Phone */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>E-mail</span>
                    <input className="dk-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder={t('emailPlaceholder')} />
                  </label>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('phone')}</span>
                    <input className="dk-input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder={t('phonePlaceholder')} />
                  </label>
                </div>

                {/* Address — full row */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <span>{t('address')}</span>
                  <input className="dk-input" type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder={t('addressPlaceholder')} />
                </label>

                {/* Notes */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <span>{t('notes')}</span>
                  <textarea
                    style={{ width: '100%', border: 0, outline: 'none', borderRadius: 16, background: '#F4F5F8', color: '#0E1116', padding: '12px 14px', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', resize: 'vertical', minHeight: 72, boxSizing: 'border-box' }}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder={t('notesPlaceholder')}
                  />
                </label>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" className="dk-btn dk-btn-l" onClick={() => setEditClientId(null)} style={{ flex: 1, justifyContent: 'center' }}>
                    {tc('cancel')}
                  </button>
                  <button type="submit" className="dk-btn" disabled={isSaving} style={{ flex: 2, justifyContent: 'center', background: '#B8456B', color: '#fff', opacity: isSaving ? 0.6 : 1 }}>
                    {isSaving ? t('modifying') : tc('save')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── PODs Delete Confirm — absolute within dk-page ── */}
        {!!confirmModal && (
          <>
            <button
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                background: 'rgba(14,17,22,.55)', border: 0, cursor: 'default',
              }}
              onClick={() => setConfirmModal(null)}
              aria-label={tc('cancel')}
            />
            <div
              role="dialog"
              style={{
                position: 'absolute', zIndex: 50,
                left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: 420, maxWidth: 'calc(100% - 48px)',
                background: '#F8F9FA', color: '#0E1116',
                borderRadius: 32, padding: 26,
                display: 'flex', flexDirection: 'column', gap: 16,
                boxShadow: '0 40px 80px -20px rgba(0,0,0,.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dk-n" style={{ fontSize: 22, color: '#0E1116' }}>{t('deleteConfirmTitle')}</span>
                <button className="dk-btn dk-btn-l" style={{ width: 44, padding: 0, justifyContent: 'center' }} onClick={() => setConfirmModal(null)} aria-label={tc('cancel')}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, margin: 0, color: '#44413B' }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="dk-btn dk-btn-l" onClick={() => setConfirmModal(null)} style={{ flex: 1, justifyContent: 'center' }}>
                  {tc('cancel')}
                </button>
                <button
                  className="dk-btn"
                  onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                  style={{ flex: 2, justifyContent: 'center', background: '#B71C1C', color: '#fff' }}
                >
                  <Trash2 size={18} />
                  {t('deleteTitle')}
                </button>
              </div>
            </div>
          </>
        )}
        {/* ── PODs Create Modal — absolute within dk-page ── */}
        {showCreate && (
          <>
            <button
              style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(14,17,22,.55)', border: 0, cursor: 'default' }}
              onClick={() => setShowCreate(false)}
              aria-label={tc('cancel')}
            />
            <div
              role="dialog"
              style={{
                position: 'absolute', zIndex: 50,
                left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: 560, maxWidth: 'calc(100% - 48px)',
                maxHeight: '90%', overflowY: 'auto',
                background: '#F8F9FA', color: '#0E1116',
                borderRadius: 32, padding: 26,
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: '0 40px 80px -20px rgba(0,0,0,.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dk-n" style={{ fontSize: 26, color: '#0E1116' }}>{t('createClient')}</span>
                <button className="dk-btn dk-btn-l" style={{ width: 44, padding: 0, justifyContent: 'center' }} onClick={() => setShowCreate(false)} aria-label={tc('cancel')}>
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 16, fontSize: 13 }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: 6, background: '#EDEBE5', padding: 4, borderRadius: 24 }}>
                  <button type="button" className="dk-chip" onClick={() => setFormIsCompany(false)} style={{ flex: 1, justifyContent: 'center', background: !formIsCompany ? '#B8456B' : 'transparent', color: !formIsCompany ? '#fff' : '#0E1116' }}>
                    {t('editTypePersonal')}
                  </button>
                  <button type="button" className="dk-chip" onClick={() => setFormIsCompany(true)} style={{ flex: 1, justifyContent: 'center', background: formIsCompany ? '#B8456B' : 'transparent', color: formIsCompany ? '#fff' : '#0E1116' }}>
                    {t('editTypeCompany')}
                  </button>
                </div>

                {/* Name + Company */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('contactName')}</span>
                    <input className="dk-input" type="text" required autoFocus value={formName} onChange={e => setFormName(e.target.value)} placeholder={t('namePlaceholder')} />
                  </label>
                  {formIsCompany && (
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('companyName')}</span>
                      <input className="dk-input" type="text" value={formCompany} onChange={e => setFormCompany(e.target.value)} placeholder={t('companyPlaceholder')} />
                    </label>
                  )}
                </div>

                {/* Tax + Discount (company) or just Discount (personal) */}
                {formIsCompany ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <label style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('taxNumber')}</span>
                      <input className="dk-input" type="text" value={formTax} onChange={e => setFormTax(e.target.value)} placeholder={t('taxNumberPlaceholder')} />
                    </label>
                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                      <span>{t('discount')}</span>
                      <input className="dk-input" type="number" min="0" max="100" step="0.5" value={formDiscount} onChange={e => setFormDiscount(e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <label style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('discount')}</span>
                    <input className="dk-input" type="number" min="0" max="100" step="0.5" value={formDiscount} onChange={e => setFormDiscount(e.target.value)} />
                  </label>
                )}

                {/* Email + Phone */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>E-mail</span>
                    <input className="dk-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder={t('emailPlaceholder')} />
                  </label>
                  <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                    <span>{t('phone')}</span>
                    <input className="dk-input" type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder={t('phonePlaceholder')} />
                  </label>
                </div>

                {/* Address — full row */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <span>{t('address')}</span>
                  <input className="dk-input" type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder={t('addressPlaceholder')} />
                </label>

                {/* GDPR */}
                <div
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 18, background: '#F4F5F8', fontSize: 14, fontWeight: 600, lineHeight: 1.4, cursor: 'pointer' }}
                  onClick={() => setFormGdpr(v => !v)}
                >
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: `2px solid ${formGdpr ? '#B8456B' : '#C9C5BA'}`, background: formGdpr ? '#B8456B' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
                    {formGdpr ? '✓' : ''}
                  </span>
                  {t('gdprConfirmText')}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" className="dk-btn dk-btn-l" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    {tc('cancel')}
                  </button>
                  <button type="submit" className="dk-btn" disabled={submitDisabled} style={{ flex: 2, justifyContent: 'center', background: '#B8456B', color: '#fff', opacity: submitDisabled ? 0.6 : 1 }}>
                    {isSubmitting ? t('creating') : t('createClient')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
      />
    </>
  );
}
