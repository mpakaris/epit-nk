'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import Modal, { AlertModal, ConfirmModal } from '@/components/Modal';
import UpgradeModal from '@/components/UpgradeModal';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { WorkspaceNotActivatedBanner, WorkspaceFrozenBanner } from '@/components/desktop/WorkspaceStatusBanners';
import WorkspacePodStack from '@/components/desktop/WorkspacePodStack';
import ClientSelect from '@/components/ClientSelect';
import WorkspacePicker from '@/components/mobile/WorkspacePicker';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import {
  Plus, Search, Loader2, FileText, X, FolderKanban, ArrowLeft,
} from 'lucide-react';

export default function ProjectsListDesktop() {
  const router = useRouter();
  const t = useTranslations('projects');
  const tForms = useTranslations('forms');
  const tCommon = useTranslations('common');

  const {
    projects: ctxProjects,
    invoices: ctxInvoices,
    labourEntries: ctxLabour,
    clients: ctxClients,
    quotes: ctxQuotes,
    activeCollectiveId,
    contextSwitching,
    deleteProject,
    refreshSupabaseData,
    createClient: ctxCreateClient,
    isDemoMode,
    dataReady,
    userCurrency,
    currentUser,
    isAdmin,
    effectiveCollectives,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

  const allInvoices = ctxInvoices      || [];
  const allLabour   = ctxLabour         || [];
  const allQuotes   = ctxQuotes         || [];
  const allClients  = ctxClients        || [];
  const rawProjects = (ctxProjects || []).filter(p => !p.deleted_at);

  const collectives = (effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, role: c.role }));
  const activeColl  = collectives.find(c => c.id === activeCollectiveId);

  const atCreateLimit = !activeCollectiveId && !isEffectivePremium(currentUser || {}) && rawProjects.length >= 1;


  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // ── Create flow state ──────────────────────────────────────────────────────
  const [showCreate,        setShowCreate]        = useState(false);
  const [createStep,        setCreateStep]        = useState(1);
  const [projName,          setProjName]          = useState('');
  const [projDesc,          setProjDesc]          = useState('');
  const [projStart,         setProjStart]         = useState('');
  const [projEnd,           setProjEnd]           = useState('');
  const [projClientId,      setProjClientId]      = useState('');
  const [projLinkedQuoteId, setProjLinkedQuoteId] = useState('');
  const [projEntityId,      setProjEntityId]      = useState(null);
  const [memberIds,         setMemberIds]         = useState([]);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [createError,       setCreateError]       = useState('');
  const [quoteSearch,       setQuoteSearch]       = useState('');
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);

  // New-client inline form (step 2 of create flow)
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [ncName,  setNcName]  = useState('');
  const [ncEmail, setNcEmail] = useState('');
  const [ncGdpr,  setNcGdpr]  = useState(false);
  const [ncError, setNcError] = useState('');
  const [ncSaving,setNcSaving]= useState(false);

  const [alertModal,    setAlertModal]    = useState(null);
  const [upgradeModal,  setUpgradeModal]  = useState(null); // { docType }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletedIds,    setDeletedIds]    = useState(new Set());

  const { outgoingTransfers } = useTransferRequests({ dataReady, isDemoMode });

  const effectiveCurrentUserId = currentUser?.id || null;

  const openCreate = () => {
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd('');
    setProjClientId(''); setProjLinkedQuoteId('');
    setProjEntityId(activeCollectiveId || null);
    setMemberIds(effectiveCurrentUserId ? [effectiveCurrentUserId] : []);
    setQuoteSearch(''); setShowQuoteDropdown(false);
    setCreateError('');
    setShowNewClientForm(false);
    setNcName(''); setNcEmail(''); setNcGdpr(false); setNcError('');
    setCreateStep(collectives.length > 0 ? 1 : 2);
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setShowNewClientForm(false);
  };

  const handleQuoteLink = (quoteId) => {
    setProjLinkedQuoteId(quoteId);
    if (!quoteId) return;
    const q = allQuotes.find(x => x.id === quoteId);
    if (!q) return;
    if (q.collective_id) setProjEntityId(q.collective_id);
    if (q.title       && !projName)   setProjName(q.title);
    if (q.description && !projDesc)   setProjDesc(q.description);
    if (q.start_date  && !projStart)  setProjStart(q.start_date);
    if (q.end_date    && !projEnd)    setProjEnd(q.end_date);
    if (q.client_id   && !projClientId) setProjClientId(q.client_id);
  };

  const clearQuote = () => {
    setProjLinkedQuoteId(''); setQuoteSearch('');
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd(''); setProjClientId('');
  };

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filteredQuotes = quoteSearch
    ? allQuotes.filter(q => norm(q.title).includes(norm(quoteSearch)) || norm(q.location || '').includes(norm(quoteSearch)))
    : allQuotes;

  const handleNcSubmit = async () => {
    if (!ncName.trim()) { setNcError(t('clientNameRequired')); return; }
    setNcSaving(true);
    try {
      const c = await ctxCreateClient({ name: ncName.trim(), email: ncEmail.trim(), gdprConsent: ncGdpr });
      setProjClientId(c.id);
      setShowNewClientForm(false);
      setNcName(''); setNcEmail(''); setNcGdpr(false); setNcError('');
    } catch (err) {
      setNcError(err.message || t('createClientError'));
    } finally {
      setNcSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!projClientId) { setCreateError(t('clientRequired')); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          description: projDesc,
          memberIds,
          startDate: projStart || null,
          endDate: projEnd || null,
          clientId: projClientId || null,
          collectiveId: projEntityId,
          quoteId: projLinkedQuoteId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') { closeCreate(); setUpgradeModal({ docType: data.docType }); return; }
        throw new Error(data.error || t('createError'));
      }
      await refreshSupabaseData();
      router.push(`${navPrefix}/projektek/${data.project.id}`);
    } catch (err) {
      setCreateError(err.message || t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (project) => {
    setConfirmDelete({
      message: t('deleteConfirmFull', { name: project.name }),
      onConfirm: async () => {
        try {
          await deleteProject(project.id, project);
          setDeletedIds(prev => new Set([...prev, project.id]));
        } catch (err) {
          setAlertModal({ variant: 'error', title: t('errorTitle'), message: err.message || t('deleteError') });
        }
      },
    });
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const visibleProjects = rawProjects.filter(p => !deletedIds.has(p.id));

  const totalCount  = visibleProjects.length;
  const openCount   = visibleProjects.filter(p => p.status !== 'closed' && !p.done_at && !p.closed_at).length;
  const closedCount = visibleProjects.filter(p => p.status === 'closed' || p.done_at || p.closed_at).length;

  let filtered = visibleProjects;
  if (filter === 'active') filtered = filtered.filter(p => p.status !== 'closed' && !p.done_at && !p.closed_at && p.status !== 'paused');
  if (filter === 'closed') filtered = filtered.filter(p => p.status === 'closed' || p.done_at || p.closed_at);
  if (search.trim()) {
    const q = norm(search);
    filtered = filtered.filter(p => {
      const c = allClients.find(cl => cl.id === p.client_id);
      return norm(p.name).includes(q) || norm(c?.name || '').includes(q);
    });
  }

  // ── Card renderer ─────────────────────────────────────────────────────────

  const currency = userCurrency || 'HUF';

  const renderCard = (p) => {
    const client = allClients.find(c => c.id === p.client_id);

    const invoiceTotal = allInvoices
      .filter(i => i.project_id === p.id && !i.deleted_at)
      .reduce((s, i) => s + Number(i.value_huf || 0), 0);
    const labourTotal = allLabour
      .filter(e => e.project_id === p.id)
      .reduce((s, e) => s + Number(e.value_huf || 0), 0);
    const totalSpend = invoiceTotal + labourTotal;

    // Target cost: linked offer total → manual cost_target → null (N/A)
    const linkedQuote = allQuotes.find(q => q.project_id === p.id);
    const targetCost = linkedQuote
      ? Number(linkedQuote.total_huf || 0)
      : (p.cost_target != null ? Number(p.cost_target) : null);

    const pct    = targetCost > 0 ? Math.round((totalSpend / targetCost) * 100) : null;
    const isOver = pct !== null && pct > 95;

    const isDone   = p.status === 'closed' || !!p.done_at || !!p.closed_at;
    const isPaused = !isDone && p.status === 'paused';

    let statusBg, statusColor, statusLabel;
    if (isDone)        { statusBg = '#E3E7EE'; statusColor = '#263248'; statusLabel = t('statusClosed'); }
    else if (isPaused) { statusBg = '#FFF4E5'; statusColor = '#6B3A00'; statusLabel = t('statusPaused'); }
    else               { statusBg = '#E7F4EC'; statusColor = '#14532D'; statusLabel = t('statusActive'); }

    const clientMeta = [client?.name, p.location].filter(Boolean).join(' · ');

    const Stat = ({ label, value, valueColor }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68' }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, color: valueColor || '#0E1116', letterSpacing: '-0.02em' }}>
          {value}
        </span>
      </div>
    );

    return (
      <button
        key={p.id}
        onClick={() => router.push(`${navPrefix}/projektek/${p.id}`)}
        className="dk-card"
        style={{ border: 0, textAlign: 'left', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}
      >
        {/* Name + status */}
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <b className="dk-n" style={{ fontSize: 18, flex: 1, minWidth: 0, lineHeight: 1.3 }}>{p.name}</b>
          <span className="dk-badge" style={{ background: statusBg, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
        </span>

        {/* Client + location */}
        {clientMeta && <span className="dk-m">{clientMeta}</span>}

        {/* Stats grid: Target · Invoiced · Labour */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, borderTop: '1px solid #EDEBE5', paddingTop: 10, marginTop: 2 }}>
          <Stat
            label={t('cardTarget')}
            value={targetCost != null ? formatMoney(targetCost, currency) : '—'}
            valueColor={targetCost != null ? '#0E1116' : '#9AA3B2'}
          />
          <Stat label={t('invoices')} value={formatMoney(invoiceTotal, currency)} />
          <Stat label={t('labour')}   value={formatMoney(labourTotal,  currency)} />
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <>
            <span style={{ height: 8, borderRadius: 4, background: '#E3E7EE', overflow: 'hidden', display: 'block' }}>
              <span style={{ display: 'block', height: 8, width: `${Math.min(pct, 100)}%`, background: isOver ? '#B71C1C' : '#263248', borderRadius: 4 }} />
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="dk-m">{t('spent')}: {formatMoney(totalSpend, currency)}</span>
              <span className="dk-m" style={{ color: isOver ? '#B71C1C' : '#263248', fontWeight: 700 }}>{pct}%</span>
            </span>
          </>
        )}
      </button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const workspaceLabel = projEntityId
    ? (collectives.find(c => c.id === projEntityId)?.name || '')
    : t('personalWorkspace');

  return (
    <div className="dk-page dk-mod-projects">
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('pageTitle')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ position: 'relative', display: 'block', width: 280 }}>
            <span style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
              <Search size={20} />
            </span>
            <input
              className="dk-input"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 42, borderRadius: 23, height: 44 }}
            />
          </label>
          <button
            onClick={atCreateLimit ? () => setUpgradeModal({ docType: 'project' }) : openCreate}
            className="dk-btn dk-btn-w"
            type="button"
          >
            <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
            {t('new')}
          </button>
        </div>
      </header>

      <div className="dk-body" style={{ background: 'var(--dk-deep)', padding: '16px 32px 24px' }}>
        <WorkspacePodStack>
          {activeColl?.status === 'not_activated' && <WorkspaceNotActivatedBanner />}
          {activeColl?.status !== 'not_activated' && (
            <>
              {activeColl?.status === 'frozen' && <WorkspaceFrozenBanner isOwner={activeColl?.role === 'owner'} />}
              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'all',    label: `${t('filterAll')} (${totalCount})` },
                  { key: 'active', label: `${t('filterOpen')} (${openCount})` },
                  { key: 'closed', label: `${t('filterClosed')} (${closedCount})` },
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className="dk-chip"
                    style={{ background: filter === f.key ? '#263248' : '#F1F1F3', color: filter === f.key ? '#fff' : '#0E1116' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Project grid */}
              {filtered.length === 0 ? (
                <div className="dk-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <FolderKanban size={40} style={{ color: '#5A5F68' }} aria-hidden="true" />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0E1116' }}>{t('emptyTitle')}</span>
                  <span className="dk-m">{search ? t('emptyTitleFiltered') : t('emptyNoProjects')}</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {filtered.map(p => renderCard(p))}
                </div>
              )}
            </>
          )}
        </WorkspacePodStack>
      </div>

      {/* ── Step 1: Workspace picker ─────────────────────────────────────────── */}
      {showCreate && createStep === 1 && (
        <WorkspacePicker
          collectives={collectives}
          selected={projEntityId}
          onChange={setProjEntityId}
          onClose={closeCreate}
          onNext={() => setCreateStep(2)}
          docType="project"
        />
      )}

      {/* ── Step 2: Create project form overlay ──────────────────────────────── */}
      {showCreate && createStep === 2 && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={closeCreate}
        >
          <div
            style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', height: 64, flexShrink: 0 }}>
              <button
                type="button"
                onClick={showNewClientForm ? () => setShowNewClientForm(false) : (collectives.length > 0 ? () => setCreateStep(1) : closeCreate)}
                style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label={t('back')}
              >
                <ArrowLeft size={22} color="#0f172a" strokeWidth={1.75} aria-hidden="true" />
              </button>
              {collectives.length > 0 && (
                <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>2 / 2</span>
              )}
            </div>

            {showNewClientForm ? (
              /* ── New client inline panel ───────────────────────────────────── */
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '30px', marginBottom: 6 }}>
                    {t('newClientSection')}
                  </h1>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#475569', marginBottom: 24, lineHeight: '22px' }}>&nbsp;</p>
                  {ncError && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                      {ncError}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{tForms('nameLabel')}</label>
                      <input type="text" className="dk-input" autoFocus value={ncName} onChange={e => setNcName(e.target.value)} placeholder="Horváth Béla" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{tForms('emailRequired')}</label>
                      <input type="email" className="dk-input" value={ncEmail} onChange={e => setNcEmail(e.target.value)} placeholder="email@…" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 14, background: ncGdpr ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${ncGdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer' }}>
                      <input type="checkbox" checked={ncGdpr} onChange={e => setNcGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--accent)', width: 16, height: 16 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('gdprConsentText')} <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div style={{ padding: '0 16px 24px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleNcSubmit}
                    disabled={ncSaving || !ncGdpr || !ncName.trim()}
                    style={{ width: '100%', height: 56, borderRadius: 999, background: '#0f172a', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!ncGdpr || !ncName.trim() || ncSaving) ? 0.5 : 1 }}
                  >
                    {ncSaving ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />{t('creatingClientBtn')}</> : t('createClientBtn')}
                  </button>
                </div>
              </>
            ) : (
              /* ── Main create form ──────────────────────────────────────────── */
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '30px', marginBottom: 6 }}>
                    {t('newModalTitle')}
                  </h1>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#475569', marginBottom: 24, lineHeight: '22px' }}>
                    {workspaceLabel}
                  </p>

                  {createError && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                      {createError}
                    </div>
                  )}

                  <form id="new-proj-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Project name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('nameLabel')}</label>
                      <input
                        type="text"
                        className="dk-input"
                        autoFocus
                        required
                        value={projName}
                        onChange={e => setProjName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                      />
                    </div>

                    {/* Client */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('clientLabel')}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <ClientSelect
                          value={projClientId}
                          onChange={e => setProjClientId(e.target.value)}
                          clients={allClients}
                          style={{ flex: 1 }}
                          className="dk-input"
                        />
                        <button
                          type="button"
                          onClick={() => { setNcError(''); setShowNewClientForm(true); }}
                          aria-label={t('newClientSection')}
                          style={{ width: 46, height: 46, borderRadius: 23, border: 0, background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <Plus size={20} aria-hidden="true" />
                        </button>
                      </div>
                      {projClientId && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                          ✓ {allClients.find(c => c.id === projClientId)?.name}
                        </div>
                      )}
                    </div>

                    {/* Linked offer */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 120 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {t('linkedQuoteLabel')}{' '}
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>{t('linkedQuoteOptional')}</span>
                      </label>
                      {projLinkedQuoteId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#EDE7FB', border: '1px solid #D8CCFA' }}>
                          <FileText size={16} color="#6D3FD1" style={{ flexShrink: 0 }} aria-hidden="true" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#6D3FD1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {allQuotes.find(q => q.id === projLinkedQuoteId)?.title}
                            </div>
                          </div>
                          <button type="button" onClick={clearQuote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6D3FD1', display: 'flex', padding: 4 }}>
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ position: 'relative' }}>
                            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
                            <input
                              type="text"
                              className="dk-input"
                              style={{ paddingLeft: 42 }}
                              placeholder={allQuotes.length === 0 ? t('noQuotesPh') : t('searchQuotesPh')}
                              disabled={allQuotes.length === 0}
                              value={quoteSearch}
                              onChange={e => { setQuoteSearch(e.target.value); setShowQuoteDropdown(true); }}
                              onFocus={() => setShowQuoteDropdown(true)}
                              onBlur={() => setTimeout(() => setShowQuoteDropdown(false), 150)}
                            />
                            {showQuoteDropdown && allQuotes.length > 0 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                                {filteredQuotes.length === 0 ? (
                                  <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>{t('noQuoteResults')}</div>
                                ) : filteredQuotes.map(q => (
                                  <button
                                    key={q.id}
                                    type="button"
                                    onMouseDown={() => { handleQuoteLink(q.id); setQuoteSearch(''); setShowQuoteDropdown(false); }}
                                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}
                                  >
                                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{q.title}</span>
                                    {q.location && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.location}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </form>
                </div>

                <div style={{ padding: '0 16px 24px', flexShrink: 0 }}>
                  <button
                    type="submit"
                    form="new-proj-form"
                    disabled={isSubmitting || !projName.trim()}
                    style={{ width: '100%', height: 56, borderRadius: 999, background: '#0f172a', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!projName.trim() || isSubmitting) ? 0.5 : 1 }}
                  >
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />{t('creatingBtn')}</> : t('createBtn')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null); }}
        title={t('deleteConfirmTitle')}
        message={confirmDelete?.message}
        confirmLabel={t('confirmDeleteLabel')}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant || 'error'}
        title={alertModal?.title}
        message={alertModal?.message}
      />
      <UpgradeModal
        isOpen={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        docType={upgradeModal?.docType}
      />
    </div>
  );
}
