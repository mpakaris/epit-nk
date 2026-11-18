'use client';

/**
 * P3–P8 — Project detail with tabs (mobile pods view)
 * Expenses / Diary / Payment plan / Portal as in-screen tabs
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import { calculateProjectFinancials } from '@/lib/calculations';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';

const PROJ_BG = '#263248';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

function projectStatusStyle(status, t) {
  const s = status || 'active';
  const map = {
    active:  { bg: '#E7F4EC', fg: '#14532D', bar: '#2E9E5B', label: t('statusActive') },
    paused:  { bg: '#FFF1E0', fg: '#8A4200', bar: '#FF8A2B', label: t('statusPaused') },
    closed:  { bg: '#E3E7EE', fg: '#263248', bar: '#8A94A8', label: t('statusClosed') },
    expired: { bg: '#FDECEC', fg: '#9B1C1C', bar: '#D64545', label: t('statusExpired') },
  };
  return map[s] || map.active;
}

const CAT_COLORS = {
  material:  { bg: '#E4ECFA', fg: '#2B4C9B' },
  labour:    { bg: '#E2F3E8', fg: '#14532D' },
  equipment: { bg: '#FFF1E0', fg: '#8A4200' },
  fuel:      { bg: '#EDE7FB', fg: '#4A2796' },
  other:     { bg: '#F1F1F3', fg: '#2B3038' },
};

function InfoRow({ label, value }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15 }}>
      <span style={{ color: '#5A5F68', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value || '—'}</span>
    </span>
  );
}

function SheetRowInline({ icon: iconKey, label, onClick, danger }) {
  const ICONS = {
    edit: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
    play: 'M5 3l14 9-14 9z',
    close: 'M6 6l12 12M18 6L6 18',
    folder: 'M3 7h6l2 2h10v11H3z',
    link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
    check: 'M5 12l5 5 9-10',
  };
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={ICONS[iconKey] || ''} /></svg>
      </span>
      {label}
    </button>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Bezárás" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  );
}

function CloseBtnDark({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Bezárás" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  );
}

export default function ProjectDetailMobile({ projectId }) {
  const t = useTranslations('projectDetail');
  const tProj = useTranslations('projects');
  const tDiary = useTranslations('diary');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    projects = [], invoices = [], labourEntries = [],
    clients = [], currentUser, isDemoMode, userCurrency,
    collectives: userMemberships = [], deleteProject,
    diaryEntriesByProject = {}, fetchDiaryEntries,
    deleteInvoice: ctxDeleteInvoice, deleteLabourEntry: ctxDeleteLabourEntry,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const scrollRef    = useRef(null);
  const [compactBar, setCompactBar] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCompactBar(el.scrollTop > 80);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const [activeTab, setActiveTab] = useState('expenses');
  const [expensesTab, setExpensesTab] = useState('invoices');
  const [mode, setMode] = useState(null);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [labourSheet, setLabourSheet] = useState(false);
  const [labourForm, setLabourForm] = useState({ work_type: '', date: '', unit: 'óra', quantity: '', unit_price: '', notes: '' });
  const [savingLabour, setSavingLabour] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [shareLinks, setShareLinks] = useState([]);
  const [rooms, setRooms] = useState([]);

  const project = useMemo(() => (projects || []).find(pr => pr.id === projectId), [projects, projectId]);
  const client = useMemo(() => clients.find(c => c.id === project?.client_id), [clients, project]);

  const memberRole = useMemo(() => {
    if (!project?.collective_id) return null;
    const mem = (userMemberships || []).find(m => m.collective_id === project.collective_id);
    return mem?.role || null;
  }, [project, userMemberships]);

  const isOwner = project ? (project.owner_id === currentUser?.id || project.created_by === currentUser?.id) : false;
  const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
  const canOwnerAct = isOwner || isKollektivOwner;
  const isMember = !!project?.collective_id && !canOwnerAct;
  const isClosed = project?.status === 'closed' || project?.status === 'expired';

  const projInvoices = useMemo(() => (invoices || []).filter(inv => inv.project_id === projectId && !inv.deleted_at), [invoices, projectId]);
  const projLabour = useMemo(() => (labourEntries || []).filter(le => le.project_id === projectId && !le.deleted_at), [labourEntries, projectId]);
  const diaryEntries = useMemo(() => (diaryEntriesByProject || {})[projectId] || [], [diaryEntriesByProject, projectId]);

  const financials = useMemo(() => {
    if (!project) return { totalExpenses: 0, totalLabour: 0 };
    return calculateProjectFinancials(project, projInvoices, projLabour);
  }, [project, projInvoices, projLabour]);

  const totalSpent = (projInvoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0)) + (projLabour.reduce((s, le) => s + Number(le.value_huf || 0), 0));
  const linkedQuote = useMemo(() => {
    // project may have quote_id or linked_quote_id
    const qId = project?.quote_id || project?.linked_quote_id;
    if (!qId) return null;
    return null; // We don't have quotes in context here easily, skip
  }, [project]);

  // Load payment plan when tab is visited
  useEffect(() => {
    if (activeTab !== 'payments' || !projectId) return;
    const load = async () => {
      setLoadingPayment(true);
      try {
        const res = await fetch(`/api/payment-plan?project_id=${projectId}`);
        const d = res.ok ? await res.json() : { items: [] };
        setPaymentPlan(d.items || []);
      } catch { /* ignore */ } finally { setLoadingPayment(false); }
    };
    load();
  }, [activeTab, projectId]);

  // Load diary entries
  useEffect(() => {
    if (projectId && fetchDiaryEntries) {
      fetchDiaryEntries(projectId).catch(() => {});
    }
  }, [projectId, fetchDiaryEntries]);

  // Load rooms
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/rooms`)
      .then(r => r.ok ? r.json() : { rooms: [] })
      .then(d => setRooms(d.rooms || []))
      .catch(() => {});
  }, [projectId]);

  const handleCopyPortalLink = async () => {
    if (!client?.id) return;
    const url = `${window.location.origin}/clients/${client.id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStatusChange = async (newStatus) => {
    if (!statusReason.trim()) {
      setAlertModal({ open: true, message: t('statusReasonRequired') });
      return;
    }
    setSavingStatus(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, status_reason: statusReason.trim() }),
    });
    setSavingStatus(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setMode(null);
    setStatusReason('');
  };

  const handleDeleteProject = async () => {
    setMode(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('deleteError') });
      return;
    }
    router.push(p('/projektek'));
  };

  const handleDeleteInvoice = async (invoiceId) => {
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('deleteError') });
    }
  };

  const handleDeleteLabour = async (labourId) => {
    const res = await fetch(`/api/labour-entries/${labourId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('deleteError') });
    }
  };

  const handleAddLabour = async () => {
    if (!labourForm.work_type || !labourForm.quantity || !labourForm.unit_price) return;
    setSavingLabour(true);
    const totalValue = Math.round(Number(labourForm.quantity) * Number(labourForm.unit_price));
    const res = await fetch('/api/labour-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        work_type: labourForm.work_type,
        date: labourForm.date || new Date().toISOString().slice(0, 10),
        unit: labourForm.unit,
        quantity: Number(labourForm.quantity),
        unit_price: Number(labourForm.unit_price),
        value_huf: totalValue,
        notes: labourForm.notes || null,
      }),
    });
    setSavingLabour(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setLabourSheet(false);
    setLabourForm({ work_type: '', date: '', unit: 'óra', quantity: '', unit_price: '', notes: '' });
  };

  const handleMarkPaymentPaid = async (itemId) => {
    const res = await fetch(`/api/payment-plan/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    if (!res.ok) return;
    setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, status: 'paid' } : i));
  };

  if (!project) {
    return (
      <div style={{ minHeight: '100dvh', background: PROJ_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{tProj('notFound')}</span>
        <button onClick={() => router.push(p('/projektek'))} style={{ height: 52, padding: '0 20px', border: 0, borderRadius: 26, background: '#fff', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tProj('back')}</button>
      </div>
    );
  }

  const st = projectStatusStyle(project.status, tProj);

  const TABS = [
    { id: 'expenses', label: t('tabExpenses') },
    { id: 'diary', label: t('tabDiary') },
    { id: 'payments', label: t('tabPayments') },
    { id: 'portal', label: t('tabPortal') },
  ];

  const inputStyle = { width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05)' };

  return (
    <div className="pod-screen m-root" style={{ minHeight: '100dvh', background: 'var(--m-bg, #EDEBE5)', color: 'var(--m-ink)', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {tProj('offlineBanner')}
        </div>
      )}

      {/* Compact sticky header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 28, background: PROJ_BG, padding: '10px 16px', paddingTop: 'max(10px, env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '0 0 22px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transform: compactBar && !mode ? 'translateY(0)' : 'translateY(-110%)', transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)', pointerEvents: compactBar && !mode ? 'auto' : 'none' }}>
        <button aria-label={tProj('back')} onClick={() => router.push(p('/projektek'))} style={{ flexShrink: 0, width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>{project?.name}</span>
        <button aria-label={t('actionsMenuLabel')} onClick={() => setMode('menu')} style={{ flexShrink: 0, width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
        </button>
      </div>

      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '100dvh', paddingBottom: canOwnerAct && !isClosed ? 180 : 100 }}>

        {/* Header */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: PROJ_BG, color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button aria-label={tProj('back')} onClick={() => router.push(p('/projektek'))} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <span style={{ height: 32, padding: '0 12px', borderRadius: 16, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: st.bg, color: st.fg }}>{st.label}</span>
            <button aria-label={t('actionsMenuLabel')} onClick={() => setMode('menu')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
            </button>
          </div>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {project.name}
          </h1>
          <span style={{ position: 'relative', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>
            {[client?.name, project.location].filter(Boolean).join(' · ')}
          </span>

          {/* Financial summary row */}
          <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
            {[
              [t('totalExpenses'), formatMoney(totalSpent, userCurrency)],
              [t('totalLabour'), formatMoney(projLabour.reduce((s, le) => s + Number(le.value_huf || 0), 0), userCurrency)],
            ].map(([label, val]) => (
              <div key={label} style={{ flex: 1, boxSizing: 'border-box', padding: '10px 12px', borderRadius: 18, background: 'rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.70)', display: 'block' }}>{label}</span>
                <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 20 }}>{val}</b>
              </div>
            ))}
          </div>
        </header>

        {/* Closed banner */}
        {isClosed && (
          <div style={{ margin: '12px 16px 0', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 22, background: '#FDECEC', color: '#9B1C1C', display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, fontWeight: 700 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block' }}>{t('closedBanner')}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{t('closedBannerSub')}</span>
            </span>
          </div>
        )}

        {/* Contributor note */}
        {isMember && (
          <div style={{ margin: '12px 16px 0', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 22, background: '#E3E7EE', color: '#263248', display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
            <span>{t('contributorCannotEditOthers')}</span>
          </div>
        )}

        {/* Info card */}
        <div style={{ margin: '14px 16px 0', boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {client && <InfoRow label={t('clientSection')} value={client.name} />}
          {project.start_date && <InfoRow label={tProj('startLabel')} value={formatDate(project.start_date)} />}
          {project.end_date && <InfoRow label={tProj('endLabel')} value={formatDate(project.end_date)} />}
          {project.location && <InfoRow label={tProj('locationLabel')} value={project.location} />}
          {project.work_type && <InfoRow label={tProj('workTypeLabel')} value={project.work_type} />}
          {project.description && (
            <span style={{ fontSize: 14, fontWeight: 500, color: '#4A4F57', lineHeight: 1.5 }}>{project.description}</span>
          )}
          {client?.id && (
            <button onClick={handleCopyPortalLink} style={{ alignSelf: 'flex-start', height: 44, padding: '0 16px', border: 0, borderRadius: 22, background: '#E3E7EE', color: PROJ_BG, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>
              {copiedLink ? t('linkCopied') : t('copyPortalLink')}
            </button>
          )}
        </div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '14px 16px 0', scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={on}
                style={{ height: 48, padding: '0 16px', border: 0, borderRadius: 24, fontSize: 14, fontWeight: 700, background: on ? PROJ_BG : 'rgba(38,50,72,0.10)', color: on ? '#fff' : 'var(--m-ink)', flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Kiadások */}
        {activeTab === 'expenses' && (
          <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[['invoices', t('invoicesTab')], ['labour', t('labourTab')]].map(([id, label]) => {
                const on = expensesTab === id;
                return (
                  <button key={id} onClick={() => setExpensesTab(id)} aria-pressed={on} style={{ height: 44, padding: '0 14px', border: 0, borderRadius: 22, fontSize: 14, fontWeight: 700, background: on ? '#fff' : 'rgba(38,50,72,0.08)', color: on ? PROJ_BG : 'var(--m-ink)', cursor: 'pointer', boxShadow: on ? CARD_SHADOW : 'none' }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {expensesTab === 'invoices' && (
              <>
                {projInvoices.length === 0 ? (
                  <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{t('noInvoices')}</div>
                ) : projInvoices.map(inv => {
                  const cc = CAT_COLORS[inv.category] || CAT_COLORS.other;
                  return (
                    <div key={inv.id} style={{ boxSizing: 'border-box', borderRadius: 22, background: '#fff', boxShadow: CARD_SHADOW, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: cc.bg, color: cc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4"/></svg>
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                        <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.description || '—'}</b>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{inv.date ? formatDate(inv.date) : ''}</span>
                      </span>
                      <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 17, flexShrink: 0 }}>{formatMoney(Number(inv.value_huf || 0), userCurrency)}</b>
                      {!isClosed && (canOwnerAct || inv.uploaded_by === currentUser?.id) && (
                        <button onClick={() => handleDeleteInvoice(inv.id)} style={{ flexShrink: 0, width: 36, height: 36, border: 0, borderRadius: 12, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                {!isClosed && (
                  <button onClick={() => router.push(p(`/projektek/${projectId}/feltoltes`))} style={{ height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                    {t('addInvoice')}
                  </button>
                )}
              </>
            )}

            {expensesTab === 'labour' && (
              <>
                {projLabour.length === 0 ? (
                  <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{t('noLabour')}</div>
                ) : projLabour.map(le => (
                  <div key={le.id} style={{ boxSizing: 'border-box', borderRadius: 22, background: '#fff', boxShadow: CARD_SHADOW, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: '#E2F3E8', color: '#14532D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 6l4 4M5 19l8-8M12 5l3-2 6 6-2 3z"/></svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{le.work_type || '—'}</b>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{le.quantity} {le.unit} · {le.date ? formatDate(le.date) : ''}</span>
                    </span>
                    <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 17, flexShrink: 0 }}>{formatMoney(Number(le.value_huf || 0), userCurrency)}</b>
                    {!isClosed && (canOwnerAct || le.user_id === currentUser?.id || le.created_by === currentUser?.id) && (
                      <button onClick={() => handleDeleteLabour(le.id)} style={{ flexShrink: 0, width: 36, height: 36, border: 0, borderRadius: 12, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                {!isClosed && (
                  <button onClick={() => setLabourSheet(true)} style={{ height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                    {t('addLabour')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Napló */}
        {activeTab === 'diary' && (
          <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diaryEntries.length === 0 ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{tDiary('noEntries')}</div>
            ) : diaryEntries.filter(e => !e.deleted_at).map(entry => (
              <div key={entry.id} style={{ boxSizing: 'border-box', borderRadius: 22, background: '#fff', boxShadow: CARD_SHADOW, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 15 }}>{entry.title || entry.work_type || '—'}</b>
                  <span style={{ height: 24, padding: '0 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: entry.is_public ? '#E7F4EC' : '#E3E7EE', color: entry.is_public ? '#14532D' : '#263248', flexShrink: 0 }}>
                    {entry.is_public ? tDiary('publicBadge') : tDiary('privateBadge')}
                  </span>
                </div>
                {entry.text && <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#4A4F57', lineHeight: 1.5 }}>{entry.text.slice(0, 120)}{entry.text.length > 120 ? '…' : ''}</p>}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68' }}>{entry.date ? formatDate(entry.date) : ''}</span>
              </div>
            ))}
            {!isClosed && (
              <button onClick={() => router.push(p(`/projektek/${projectId}/naplo/uj`))} style={{ height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {tDiary('addEntry')}
              </button>
            )}
          </div>
        )}

        {/* Tab: Fizetési terv */}
        {activeTab === 'payments' && (
          <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!canOwnerAct ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{t('paymentPlanOwnerOnly')}</div>
            ) : loadingPayment ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', height: 80, animation: 'pulse 1.4s infinite' }} />
            ) : paymentPlan.length === 0 ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{t('paymentPlanEmpty')}</div>
            ) : paymentPlan.map(item => {
              const statusColors = {
                pending: { bg: '#FFF1E0', fg: '#8A4200' },
                paid:    { bg: '#E7F4EC', fg: '#14532D' },
                cancelled: { bg: '#E3E7EE', fg: '#263248' },
              };
              const sc = statusColors[item.status] || statusColors.pending;
              const statusLabel = item.status === 'paid' ? t('statusPaid') : item.status === 'cancelled' ? t('statusCanceled') : t('statusPending');
              return (
                <div key={item.id} style={{ boxSizing: 'border-box', borderRadius: 22, background: '#fff', boxShadow: CARD_SHADOW, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <b style={{ fontSize: 15 }}>{item.name || '—'}</b>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{formatMoney(Number(item.amount_huf || 0), userCurrency)}</span>
                  </span>
                  <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.fg, flexShrink: 0 }}>{statusLabel}</span>
                  {item.status === 'pending' && (
                    <button onClick={() => handleMarkPaymentPaid(item.id)} style={{ flexShrink: 0, height: 36, padding: '0 12px', border: 0, borderRadius: 18, background: '#E7F4EC', color: '#14532D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('markPaid')}</button>
                  )}
                </div>
              );
            })}
            {canOwnerAct && !isClosed && (
              <button onClick={() => router.push(p(`/projektek/${projectId}?tab=payment`))} style={{ height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {t('addPaymentItem')}
              </button>
            )}
          </div>
        )}

        {/* Tab: Portál */}
        {activeTab === 'portal' && (
          <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!canOwnerAct ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>{t('portalOwnerOnly')}</div>
            ) : !client?.id ? (
              <div style={{ borderRadius: 22, background: 'rgba(38,50,72,0.08)', padding: '18px 16px', textAlign: 'center' }}>
                <b style={{ fontSize: 15, color: 'var(--m-ink)', display: 'block', marginBottom: 4 }}>{t('portalNoClient')}</b>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('portalNoClientSub')}</span>
              </div>
            ) : (
              <>
                <div style={{ boxSizing: 'border-box', borderRadius: 22, background: '#fff', boxShadow: CARD_SHADOW, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{client.name}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCopyPortalLink} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: '#E3E7EE', color: PROJ_BG, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                      {copiedLink ? t('linkCopied') : t('portalCopyLink')}
                    </button>
                    <button onClick={() => window.open(`/clients/${client.id}`, '_blank')} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                      {t('portalOpenPortal')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky status action bar (owner/admin only) */}
      {canOwnerAct && (
        <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `20px 16px calc(18px + env(safe-area-inset-bottom))`, background: 'linear-gradient(to top, var(--m-bg, #EDEBE5) 65%, rgba(237,235,229,0))', display: 'flex', gap: 10 }}>
          {!isClosed && project.status !== 'paused' && (
            <button onClick={() => setMode('pause')} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#fff', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, boxShadow: CARD_SHADOW, cursor: 'pointer' }}>{t('setPaused')}</button>
          )}
          {project.status === 'paused' && (
            <button onClick={() => setMode('continue')} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#E7F4EC', color: '#14532D', fontSize: 15, fontWeight: 700, boxShadow: CARD_SHADOW, cursor: 'pointer' }}>{t('setActive')}</button>
          )}
          {!isClosed && (
            <button onClick={() => setMode('close')} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('setClosed')}</button>
          )}
          {isClosed && (
            <button onClick={() => setMode('reopen')} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('reopen')}</button>
          )}
        </div>
      )}

      {/* Overlay backdrop */}
      {mode && (
        <div onClick={() => setMode(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setMode(null)} />
      )}

      {/* Actions menu */}
      {mode === 'menu' && (
        <div role="dialog" aria-label={t('actionsMenuLabel')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('myOptions')}</span>
            <CloseBtnDark onClick={() => setMode(null)} />
          </div>
          {!isClosed && canOwnerAct && <SheetRowInline icon="edit" label={t('editProject')} onClick={() => { setMode(null); router.push(p(`/projektek/${projectId}/szerkesztes`)); }} />}
          {canOwnerAct && <SheetRowInline icon="trash" label={t('deleteProject')} onClick={() => setMode('delete')} danger />}
        </div>
      )}

      {/* Delete confirm */}
      {mode === 'delete' && (
        <div role="alertdialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('deleteProject')}</span>
          <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--m-ink)' }}>{t('deleteConfirm', { name: project.name })}</span>
          <button onClick={handleDeleteProject} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('deleteProject')}</button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tProj('cancel')}</button>
        </div>
      )}

      {/* Status change sheets */}
      {(mode === 'pause' || mode === 'close' || mode === 'reopen' || mode === 'continue') && (
        <div role="dialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>
              {mode === 'pause' ? t('statusPausedTitle') : mode === 'close' ? t('statusClosedTitle') : mode === 'reopen' ? t('statusReopenTitle') : t('statusContinueTitle')}
            </span>
            <CloseBtnDark onClick={() => setMode(null)} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>
            {mode === 'pause' ? t('statusPausedPrompt') : mode === 'close' ? t('statusClosedPrompt') : mode === 'reopen' ? t('statusReopenPrompt') : t('statusContinuePrompt')}
          </span>
          <textarea
            value={statusReason}
            onChange={e => setStatusReason(e.target.value)}
            placeholder={t('statusReasonPlaceholder')}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', height: 88, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)' }}
          />
          <button
            onClick={() => handleStatusChange(mode === 'pause' ? 'paused' : mode === 'close' ? 'closed' : mode === 'reopen' ? 'active' : 'active')}
            disabled={savingStatus || !statusReason.trim()}
            style={{ height: 60, border: 0, borderRadius: 30, background: savingStatus || !statusReason.trim() ? '#B9B5AA' : PROJ_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
          >
            {savingStatus ? '…' : t('confirmStatusChange')}
          </button>
        </div>
      )}

      {/* Labour add sheet */}
      {labourSheet && (
        <>
          <div onClick={() => setLabourSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setLabourSheet(false)} />
          <div role="dialog" aria-label={t('labourSheet')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('labourSheet')}</span>
              <CloseBtnDark onClick={() => setLabourSheet(false)} />
            </div>
            <input type="text" placeholder={t('labourType')} value={labourForm.work_type} onChange={e => setLabourForm(f => ({ ...f, work_type: e.target.value }))} style={inputStyle} />
            <input type="date" value={labourForm.date} onChange={e => setLabourForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="number" inputMode="decimal" placeholder={t('labourQty')} value={labourForm.quantity} onChange={e => setLabourForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              <input type="text" placeholder={t('labourUnit')} value={labourForm.unit} onChange={e => setLabourForm(f => ({ ...f, unit: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input type="number" inputMode="numeric" placeholder={t('labourUnitPrice')} value={labourForm.unit_price} onChange={e => setLabourForm(f => ({ ...f, unit_price: e.target.value }))} style={inputStyle} />
            {labourForm.quantity && labourForm.unit_price && (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#5A5F68' }}>{t('labourTotal')}: {formatMoney(Math.round(Number(labourForm.quantity) * Number(labourForm.unit_price)), userCurrency)}</span>
            )}
            <textarea placeholder={t('labourNotes')} value={labourForm.notes} onChange={e => setLabourForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', height: 72, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)' }} />
            <button onClick={handleAddLabour} disabled={savingLabour || !labourForm.work_type || !labourForm.quantity || !labourForm.unit_price} style={{ height: 60, border: 0, borderRadius: 30, background: PROJ_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {savingLabour ? '…' : t('saveLabour')}
            </button>
          </div>
        </>
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
