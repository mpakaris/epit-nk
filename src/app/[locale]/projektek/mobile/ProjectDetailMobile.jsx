'use client';

/**
 * P3–P8 — Project detail with tabs (mobile pods view)
 * Expenses / Diary / Payment plan / Portal as in-screen tabs
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate, LABOUR_UNITS, UNIT_I18N, MAX_DIARY_PHOTOS } from '@/lib/constants';
import { normalizeHU } from '@/lib/utils';
import { calculateProjectFinancials } from '@/lib/calculations';
import { processMediaFile } from '@/lib/mediaGate';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';
import Lightbox from '@/components/Lightbox';
import HistorySheet from '@/components/mobile/pods/HistorySheet';
import BottomSheet from '@/components/mobile/BottomSheet';
import { Paperclip, FileText, Send, Trash2, MoreHorizontal, MessageSquare } from 'lucide-react';

const PROJ_BG   = '#263248';
const PROJ_DEEP = '#0B0F17';
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
  delivery:  { bg: '#EDE7FB', fg: '#4A2796' },
  parking:   { bg: '#E0F2FE', fg: '#0369A1' },
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
    target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
    hist: 'M4 12a8 8 0 108-8M4 4v5h5M12 8v4l3 2',
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

function InfoPod({ isOpen, onToggle, title, headerRight, action, children }) {
  return (
    <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, overflow: 'hidden', color: 'var(--m-ink, #0E1116)' }}>
      <div style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={onToggle} aria-expanded={isOpen}
          style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68', flexShrink: 0 }}>{title}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>{headerRight}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"
            style={{ flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {action}
      </div>
      {isOpen && (
        <div style={{ borderTop: '1px solid #EDEBE5', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CostChart({ events, target, userCurrency, t }) {
  const W = 300, H = 126;
  const PAD = { top: 18, right: 8, bottom: 34, left: 8 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  if (events.length === 0) {
    return <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '4px 0', display: 'block' }}>{t('costChartEmpty')}</span>;
  }

  const maxY = Math.max(...events.map(e => e.cumulative), target || 0) || 1;
  const toX = (i) => PAD.left + (events.length < 2 ? iW / 2 : (i / (events.length - 1)) * iW);
  const toY = (v) => PAD.top + iH - (v / maxY) * iH;

  const linePts = events.map((e, i) => `${toX(i)},${toY(e.cumulative)}`).join(' ');
  const fillD   = `M${toX(0)},${H - PAD.bottom} ${events.map((e, i) => `L${toX(i)},${toY(e.cumulative)}`).join(' ')} L${toX(events.length - 1)},${H - PAD.bottom} Z`;
  const targetY = target ? toY(target) : null;
  const last    = events[events.length - 1];
  const pct     = target ? Math.round((last.cumulative / target) * 100) : null;
  const over    = target && last.cumulative > target;

  // Date labels: up to 4 evenly distributed, deduped by month
  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };
  const allSpanYears = (() => {
    const y0 = new Date(events[0].date + 'T12:00:00').getFullYear();
    const y1 = new Date(last.date + 'T12:00:00').getFullYear();
    return y0 !== y1;
  })();
  const labelCount = Math.min(4, events.length);
  const rawIndices = labelCount <= 1
    ? [0]
    : Array.from({ length: labelCount }, (_, k) => Math.round(k * (events.length - 1) / (labelCount - 1)));
  // Deduplicate by month string so we never print the same month twice
  const seen = new Set();
  const labelIndices = rawIndices.filter(i => {
    const key = events[i].date.slice(0, 7);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const baseline = H - PAD.bottom;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
        {/* Baseline rule */}
        <line x1={PAD.left} y1={baseline} x2={W - PAD.right} y2={baseline}
          stroke="#D5D2C8" strokeWidth="1" />
        <path d={fillD} fill={over ? 'rgba(183,28,28,0.08)' : 'rgba(38,50,72,0.07)'} />
        <polyline points={linePts} fill="none" stroke={over ? '#B71C1C' : PROJ_BG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {targetY != null && (
          <line x1={PAD.left} y1={targetY} x2={W - PAD.right} y2={targetY}
            stroke="#E06000" strokeWidth="1.5" strokeDasharray="5 3" />
        )}
        {events.map((e, i) => (
          <circle key={i} cx={toX(i)} cy={toY(e.cumulative)} r={i === events.length - 1 ? 4 : 2.5}
            fill={over ? '#B71C1C' : PROJ_BG} />
        ))}
        {/* Date labels */}
        {labelIndices.map(i => (
          <text
            key={i}
            x={toX(i)}
            y={baseline + 14}
            textAnchor={i === 0 ? 'start' : i === events.length - 1 ? 'end' : 'middle'}
            fontSize="9.5"
            fill="#8A8F97"
            fontFamily="var(--font-main, system-ui)"
            fontWeight="600"
          >
            {fmtLabel(events[i].date)}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: over ? '#FDECEC' : '#E3E7EE', borderRadius: 14, padding: '8px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: over ? '#9B1C1C' : '#5A5F68', display: 'block' }}>{t('costChartSpent')}</span>
          <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 18, color: over ? '#B71C1C' : PROJ_BG }}>{formatMoney(last.cumulative, userCurrency)}</b>
        </div>
        {target && (
          <div style={{ flex: 1, background: '#FFF1E0', borderRadius: 14, padding: '8px 12px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8A4200', display: 'block' }}>{t('costChartTarget')}</span>
            <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 18, color: '#E06000' }}>{pct}%</b>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailMobile({ projectId }) {
  const t = useTranslations('projectDetail');
  const tProj = useTranslations('projects');
  const tProj2 = useTranslations('projects');
  const tDiary = useTranslations('diary');
  const tSD = useTranslations('surveyDetail');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    projects = [], invoices = [], labourEntries = [],
    clients = [], currentUser, isDemoMode, userCurrency,
    collectives: userMemberships = [], deleteProject,
    diaryEntriesByProject = {}, fetchDiaryEntries,
    deleteInvoice: ctxDeleteInvoice, deleteLabourEntry: ctxDeleteLabourEntry,
    quotes = [], quoteEntries = [], refreshSupabaseData,
    createInvoice, uploadInvoiceImage, projectRooms = [],
    createDiaryEntry, uploadDiaryPhotos,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const scrollRef    = useRef(null);
  const cameraRef    = useRef(null);
  const galleryRef   = useRef(null);
  const [compactBar, setCompactBar] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCompactBar(el.scrollTop > 80);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const [openPods, setOpenPods] = useState({ client: false, info: false, chart: true, invoices: true, labour: false, diary: false, payments: false, portal: false });
  const [projHistory, setProjHistory] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const togglePod = (key) => setOpenPods(prev => ({ ...prev, [key]: !prev[key] }));
  const [mode, setMode] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', clientId: '', startDate: '', endDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [costTargetInput, setCostTargetInput] = useState('');
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [labourSearch, setLabourSearch] = useState('');
  const [diarySearch, setDiarySearch] = useState('');
  const [diarySheet, setDiarySheet] = useState(false);
  const [paymentSheet, setPaymentSheet] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ label: '', amount: '', due_date: '', note: '' });
  const [paymentFile, setPaymentFile] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [sendConfirmItem, setSendConfirmItem] = useState(null);
  const [invoiceSendEmail, setInvoiceSendEmail] = useState('');
  const [sendingItemId, setSendingItemId] = useState(null);
  const [noteItem, setNoteItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const paymentFileRef = useRef(null);
  const [diaryForm, setDiaryForm] = useState({ title: '', date: '', workType: '', body: '', internalNote: '', isPublic: true });
  const [diaryFiles, setDiaryFiles] = useState([]);
  const [diaryPreviews, setDiaryPreviews] = useState([]);
  const [savingDiary, setSavingDiary] = useState(false);
  const diaryCameraRef = useRef(null);
  const diaryGalleryRef = useRef(null);
  const [invSearch, setInvSearch] = useState('');
  const [invCatFilter, setInvCatFilter] = useState(null);
  const [invUploaderFilter, setInvUploaderFilter] = useState(null);
  const [expandedInvId, setExpandedInvId] = useState(null);
  const [expandedLabourId, setExpandedLabourId] = useState(null);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [lightboxDiary, setLightboxDiary] = useState(null); // { photos, startIndex }
  const [lightboxInv, setLightboxInv] = useState(null);
  const [labourSheet, setLabourSheet] = useState(false);
  const [labourForm, setLabourForm] = useState({ work_type: '', date: '', end_date: '', unit: 'h', quantity: 0, unit_price: '', notes: '', counts_as_expense: true });
  const [savingLabour, setSavingLabour] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [shareLinks, setShareLinks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [invoiceSheet, setInvoiceSheet] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [savingInvoices, setSavingInvoices] = useState(false);

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
  const filteredInvoices = useMemo(() => {
    let list = projInvoices;
    if (invCatFilter) list = list.filter(inv => inv.category === invCatFilter);
    if (invUploaderFilter) list = list.filter(inv => inv.uploader_name === invUploaderFilter);
    if (invSearch.trim()) {
      const q = normalizeHU(invSearch);
      list = list.filter(inv =>
        normalizeHU(inv.description).includes(q) ||
        normalizeHU(inv.uploader_name).includes(q)
      );
    }
    return list;
  }, [projInvoices, invCatFilter, invUploaderFilter, invSearch]);
  const usedInvCats = ['material', 'labour', 'equipment', 'delivery', 'parking', 'other'];
  const invUploaders = useMemo(() => {
    const seen = new Map();
    projInvoices.forEach(inv => { if (inv.uploader_name && !seen.has(inv.uploader_name)) seen.set(inv.uploader_name, true); });
    return [...seen.keys()];
  }, [projInvoices]);
  const projLabour = useMemo(() => (labourEntries || []).filter(le => le.project_id === projectId && !le.deleted_at), [labourEntries, projectId]);
  const filteredLabour = useMemo(() => {
    if (!labourSearch.trim()) return projLabour;
    const q = normalizeHU(labourSearch);
    return projLabour.filter(le =>
      normalizeHU(le.labour_type).includes(q) ||
      normalizeHU(le.description || le.notes).includes(q)
    );
  }, [projLabour, labourSearch]);
  const diaryEntries = useMemo(() => (diaryEntriesByProject || {})[projectId] || [], [diaryEntriesByProject, projectId]);
  const filteredDiary = useMemo(() => {
    const active = diaryEntries.filter(e => !e.deleted_at);
    if (!diarySearch.trim()) return active;
    const q = normalizeHU(diarySearch);
    return active.filter(e =>
      normalizeHU(e.title).includes(q) ||
      normalizeHU(e.work_type).includes(q) ||
      normalizeHU(e.body).includes(q)
    );
  }, [diaryEntries, diarySearch]);

  const financials = useMemo(() => {
    if (!project) return { totalExpenses: 0, totalLabour: 0 };
    return calculateProjectFinancials(project, projInvoices, projLabour);
  }, [project, projInvoices, projLabour]);

  const totalSpent = (projInvoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0)) + (projLabour.filter(le => le.counts_as_expense !== false).reduce((s, le) => s + Number(le.value_huf || 0), 0));
  const linkedQuote = useMemo(() => {
    const qId = project?.quote_id || project?.linked_quote_id;
    if (!qId) return null;
    return (quotes || []).find(q => q.id === qId) || null;
  }, [project, quotes]);

  const linkedOfferSubtotal = useMemo(() => {
    if (!linkedQuote) return null;
    return (quoteEntries || [])
      .filter(e => e.quote_id === linkedQuote.id)
      .reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  }, [linkedQuote, quoteEntries]);

  const chartEvents = useMemo(() => {
    const all = [
      ...projInvoices.map(inv => ({ date: inv.date || inv.created_at?.slice(0, 10), value: Number(inv.value_huf || 0) })),
      ...projLabour.map(le => ({ date: le.date || le.created_at?.slice(0, 10), value: Number(le.value_huf || 0) })),
    ].filter(e => e.date && e.value > 0).sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    return all.map(e => ({ date: e.date, cumulative: cum += e.value }));
  }, [projInvoices, projLabour]);

  const chartTarget = linkedOfferSubtotal != null ? linkedOfferSubtotal : (project?.cost_target || null);

  // Load payment plan when pod is opened
  useEffect(() => {
    if (!openPods.payments || !projectId) return;
    const load = async () => {
      setLoadingPayment(true);
      try {
        const res = await fetch(`/api/payment-plan?project_id=${projectId}`);
        const d = res.ok ? await res.json() : { items: [] };
        setPaymentPlan(d.items || []);
      } catch { /* ignore */ } finally { setLoadingPayment(false); }
    };
    load();
  }, [openPods.payments, projectId]);


  // Load diary entries once per project (fetchDiaryEntries is not memoized — omit from deps)
  useEffect(() => {
    if (projectId && fetchDiaryEntries) {
      fetchDiaryEntries(projectId).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  const CAT_OPTIONS = [
    { id: 'material',  label: tProj2('catMaterial'),  bg: '#E4ECFA', fg: '#2B4C9B' },
    { id: 'labour',    label: tProj2('catLabour'),    bg: '#E2F3E8', fg: '#14532D' },
    { id: 'equipment', label: tProj2('catTools'),     bg: '#FFF1E0', fg: '#8A4200' },
    { id: 'delivery',  label: tProj2('catDelivery'),  bg: '#EDE7FB', fg: '#4A2796' },
    { id: 'parking',   label: tProj2('catParking'),   bg: '#E0F2FE', fg: '#0369A1' },
    { id: 'other',     label: tProj2('catOther'),     bg: '#F1F1F3', fg: '#2B3038' },
  ];

  const newInvoiceItem = (overrides = {}) => ({
    localId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    file: null, previewUrl: null, status: 'ready',
    valueHuf: '', category: 'material', description: '',
    roomId: '', foreignCurrency: false, ocrValue: null,
    aiLineItems: null, aiTotal: null, aiCurrency: 'HUF', descriptionSuggestion: '',
    ...overrides,
  });

  const updateInvoiceItem = (localId, changes) =>
    setInvoiceItems(prev => prev.map(i => i.localId === localId ? { ...i, ...changes } : i));

  const removeInvoiceItem = (localId) => {
    setInvoiceItems(prev => {
      const item = prev.find(i => i.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.localId !== localId);
    });
  };

  const processInvoiceItem = async (localId, file) => {
    updateInvoiceItem(localId, { status: 'processing' });
    try {
      const reader = new FileReader();
      const imageDataUrl = await new Promise((res, rej) => { reader.onloadend = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file); });
      const [ocrData, aiData] = await Promise.all([
        fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: imageDataUrl }) }).then(r => r.json()).catch(() => null),
        fetch('/api/invoice-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageDataUrl }) }).then(r => r.json()).catch(() => null),
      ]);
      const update = { status: 'ready' };
      if (aiData?.lineItems?.length > 0) {
        const currency = aiData.currency || 'HUF';
        update.aiLineItems = aiData.lineItems; update.aiTotal = aiData.grandTotal || 0;
        update.aiCurrency = currency; update.foreignCurrency = currency !== 'HUF';
        if (aiData.grandTotal > 0 && currency === 'HUF') update.valueHuf = Math.round(aiData.grandTotal).toString();
        const names = aiData.lineItems.map(i => i.name).filter(Boolean);
        if (names.length) update.descriptionSuggestion = names.slice(0, 3).join(', ');
      }
      if (!update.valueHuf && ocrData?.suggestedValue > 0) {
        update.valueHuf = ocrData.suggestedValue.toString(); update.ocrValue = ocrData.suggestedValue;
      }
      updateInvoiceItem(localId, update);
    } catch { updateInvoiceItem(localId, { status: 'error' }); }
  };

  const handleInvoiceFiles = async (files) => {
    const newItems = Array.from(files).map(f => newInvoiceItem({ file: f, previewUrl: URL.createObjectURL(f), status: 'pending' }));
    setInvoiceItems(prev => [...prev, ...newItems]);
    for (const item of newItems) await processInvoiceItem(item.localId, item.file);
  };

  const handleInvoiceSubmit = async () => {
    if (!invoiceItems.length) return;
    if (invoiceItems.some(i => i.status === 'processing' || i.status === 'pending')) {
      setAlertModal({ open: true, message: tProj2('processingOcr') }); return;
    }
    if (invoiceItems.find(i => !(Number(i.valueHuf) > 0))) {
      setAlertModal({ open: true, message: tProj2('invoiceAmountHint') }); return;
    }
    setSavingInvoices(true);
    const failed = [];
    for (const item of invoiceItems) {
      try {
        let imageUrl = null, storagePath = null;
        if (item.file) {
          const compressed = await processMediaFile(item.file);
          ({ imageUrl, storagePath } = await uploadInvoiceImage(compressed));
        }
        await createInvoice({ projectId, valueHuf: Math.round(Number(item.valueHuf)), category: item.category, description: item.description.trim(), imageUrl: imageUrl || null, storagePath: storagePath || null, roomId: item.roomId || null, aiLineItems: item.aiLineItems?.length > 0 ? item.aiLineItems : null, aiTotal: item.aiTotal || null, ocrSuggestedValue: item.ocrValue });
      } catch { failed.push(item.file?.name || '?'); }
    }
    setSavingInvoices(false);
    if (failed.length) { setAlertModal({ open: true, message: tProj2('ocrFailed') }); }
    else { setInvoiceSheet(false); setInvoiceItems([]); }
  };

  const openEditSheet = () => {
    setEditForm({
      name: project.name || '',
      clientId: project.client_id || '',
      startDate: project.start_date || '',
      endDate: project.end_date || '',
    });
    setMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        client_id: editForm.clientId || null,
        start_date: editForm.startDate || null,
        end_date: editForm.endDate || null,
      }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setMode(null);
    await refreshSupabaseData();
  };

  const handleSaveCostTarget = async () => {
    const val = parseFloat(costTargetInput.replace(/\s/g, '').replace(',', '.'));
    if (!val || val <= 0) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_target: Math.round(val) }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setMode(null);
    await refreshSupabaseData();
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
      return;
    }
    refreshSupabaseData?.();
  };

  const handleDeleteLabour = async (labourId) => {
    const res = await fetch(`/api/labour-entries/${labourId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('deleteError') });
      return;
    }
    refreshSupabaseData?.();
  };

  const closePaymentSheet = () => {
    setPaymentSheet(false);
    setPaymentForm({ label: '', amount: '', due_date: '', note: '' });
    setPaymentFile(null);
  };

  const handleAddPayment = async (andSend = false) => {
    if (!paymentForm.label.trim() || !(Number(paymentForm.amount) > 0)) return;
    setSavingPayment(true);
    try {
      // 1. Create item
      const createRes = await fetch('/api/payment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          label:      paymentForm.label.trim(),
          amount_huf: Math.round(Number(paymentForm.amount)),
          due_date:   paymentForm.due_date || null,
          note:       paymentForm.note.trim() || null,
        }),
      });
      if (!createRes.ok) {
        const { error } = await createRes.json().catch(() => ({}));
        setAlertModal({ open: true, message: error || t('saveError') });
        return;
      }
      let { item } = await createRes.json();
      item = { ...item, files: [] };

      // 2. Upload file if one was chosen
      if (paymentFile) {
        const fd = new FormData();
        fd.append('file', paymentFile);
        const uploadRes = await fetch(`/api/payment-plan/${item.id}/files`, { method: 'POST', body: fd });
        if (uploadRes.ok) {
          const { file: uploaded } = await uploadRes.json();
          item = { ...item, files: [uploaded] };
        }
      }

      // 3. Send to client if requested (and a file was successfully uploaded)
      if (andSend && item.files.length > 0) {
        const sendRes = await fetch(`/api/payment-plan/${item.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (sendRes.ok) {
          const { item: sent } = await sendRes.json();
          item = { ...sent, files: item.files };
              } else {
          const { error } = await sendRes.json().catch(() => ({}));
          setAlertModal({ open: true, message: error || t('saveError') });
        }
      }

      setPaymentPlan(prev => [...prev, item]);
      closePaymentSheet();
    } finally {
      setSavingPayment(false);
    }
  };


  const handleSendInvoice = async (itemId, toEmail) => {
    setSendingItemId(itemId);
    const res = await fetch(`/api/payment-plan/${itemId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toEmail ? { to_email: toEmail } : {}),
    });
    setSendingItemId(null);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    const { item } = await res.json();
    setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...item } : i));
  };

  const handleSaveNote = async () => {
    if (!noteItem) return;
    setSavingNote(true);
    const res = await fetch(`/api/payment-plan/${noteItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteText.trim() || null }),
    });
    setSavingNote(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setPaymentPlan(prev => prev.map(i => i.id === noteItem.id ? { ...i, note: noteText.trim() || null } : i));
    setNoteItem(null);
  };

  const handleDeletePaymentItem = async (itemId) => {
    const res = await fetch(`/api/payment-plan/${itemId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('deleteError') });
      return;
    }
    setPaymentPlan(prev => prev.filter(i => i.id !== itemId));
  };

  const handleAddDiary = async () => {
    if (!diaryForm.title.trim()) return;
    setSavingDiary(true);
    try {
      let photoIds = [];
      if (diaryFiles.length > 0) {
        const uploaded = await uploadDiaryPhotos(projectId, diaryFiles, false);
        photoIds = uploaded.map(p => p.id);
      }
      await createDiaryEntry({
        projectId,
        title: diaryForm.title.trim(),
        body: diaryForm.body.trim() || undefined,
        entryDate: diaryForm.date || new Date().toISOString().slice(0, 10),
        photoIds,
        workType: diaryForm.workType.trim() || undefined,
        internalNote: diaryForm.internalNote.trim() || undefined,
        isPublic: diaryForm.isPublic,
      });
      setDiarySheet(false);
      setDiaryForm({ title: '', date: '', workType: '', body: '', internalNote: '', isPublic: true });
      setDiaryFiles([]);
      setDiaryPreviews([]);
    } catch (err) {
      setAlertModal({ open: true, message: err.message || t('saveError') });
    } finally {
      setSavingDiary(false);
    }
  };

  const handleAddLabour = async () => {
    if (!labourForm.work_type || !(labourForm.quantity > 0) || !labourForm.unit_price) return;
    setSavingLabour(true);
    const res = await fetch('/api/labour-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id:        projectId,
        work_type:         labourForm.work_type,
        date:              labourForm.date || new Date().toISOString().slice(0, 10),
        end_date:          labourForm.end_date || null,
        unit:              labourForm.unit,
        quantity:          Number(labourForm.quantity),
        unit_price:        Number(labourForm.unit_price),
        notes:             labourForm.notes || null,
        counts_as_expense: labourForm.counts_as_expense,
      }),
    });
    setSavingLabour(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setLabourSheet(false);
    setLabourForm({ work_type: '', date: '', end_date: '', unit: 'h', quantity: 0, unit_price: '', notes: '', counts_as_expense: true });
    refreshSupabaseData?.();
  };

  const handleMarkPaymentPaid = async (itemId) => {
    const res = await fetch(`/api/payment-plan/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, status: 'paid', paid_at: new Date().toISOString() } : i));
  };

  if (!project) {
    return (
      <div style={{ minHeight: '100dvh', background: PROJ_DEEP, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{tProj('notFound')}</span>
        <button onClick={() => router.push(p('/projektek'))} style={{ height: 52, padding: '0 20px', border: 0, borderRadius: 26, background: '#fff', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tProj('back')}</button>
      </div>
    );
  }

  const st = projectStatusStyle(project.status, tProj);
  const inputStyle = { width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05)', outline: 0 };

  return (
    <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: PROJ_DEEP, color: '#fff', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
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

      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '100dvh', paddingBottom: !isClosed ? 140 : 100 }}>

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
              linkedOfferSubtotal != null
                ? [t('linkedOfferSubtotal'), formatMoney(linkedOfferSubtotal, userCurrency)]
                : project.cost_target != null
                  ? [t('costTargetLabel'), formatMoney(project.cost_target, userCurrency)]
                  : [t('totalLabour'), formatMoney(projLabour.reduce((s, le) => s + Number(le.value_huf || 0), 0), userCurrency)],
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
          <div style={{ boxSizing: 'border-box', padding: '12px 16px', borderRadius: 22, background: 'rgba(183,28,28,0.75)', color: '#fff', display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, fontWeight: 700 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block' }}>{t('closedBanner')}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{t('closedBannerSub')}</span>
            </span>
          </div>
        )}

        {/* Contributor note */}
        {isMember && (
          <div style={{ boxSizing: 'border-box', padding: '12px 16px', borderRadius: 22, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.90)', display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
            <span>{t('contributorCannotEditOthers')}</span>
          </div>
        )}

        {/* Pods */}
        <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── Overview ── */}
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('sectionOverview')}</h2>

          {/* Pod: Client */}
          <InfoPod
            isOpen={openPods.client}
            onToggle={() => togglePod('client')}
            title={t('clientSection')}
            headerRight={client
              ? <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{client.name}</span>
              : <span style={{ fontSize: 14, fontWeight: 600, color: '#8A8F97' }}>—</span>}
          >
            {client ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: '#E3E7EE', color: PROJ_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                  </span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                    <b style={{ fontSize: 17 }}>{client.name}</b>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client.email || client.phone || ''}</span>
                  </span>
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleCopyPortalLink} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: '#E3E7EE', color: PROJ_BG, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>
                    {copiedLink ? t('linkCopied') : t('portalCopyLink')}
                  </button>
                  <button onClick={() => window.open(`/clients/${client.id}`, '_blank')} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    {t('portalOpenPortal')}
                  </button>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('portalNoClient')}</span>
            )}
          </InfoPod>

          {/* Pod: Project info */}
          <InfoPod
            isOpen={openPods.info}
            onToggle={() => togglePod('info')}
            title={t('podProjectInfo')}
            headerRight={
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                {project.location || project.work_type || (project.start_date ? formatDate(project.start_date) : '')}
              </span>
            }
          >
            {project.start_date && <InfoRow label={tProj('startLabel')} value={formatDate(project.start_date)} />}
            {project.end_date && <InfoRow label={tProj('endLabel')} value={formatDate(project.end_date)} />}
            {project.location && <InfoRow label={tProj('locationLabel')} value={project.location} />}
            {project.work_type && <InfoRow label={tProj('workTypeLabel')} value={project.work_type} />}
            {linkedQuote && <InfoRow label={t('linkedOfferSubtotal')} value={`${linkedQuote.title} · ${formatMoney(linkedOfferSubtotal, userCurrency)}`} />}
            {project.description && <span style={{ fontSize: 14, fontWeight: 500, color: '#4A4F57', lineHeight: 1.5 }}>{project.description}</span>}
            {!isClosed && canOwnerAct && (
              <button onClick={openEditSheet} style={{ marginTop: 4, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/></svg>
                {t('editProject')}
              </button>
            )}
          </InfoPod>

          {/* Pod: Cost chart */}
          <InfoPod
            isOpen={openPods.chart}
            onToggle={() => togglePod('chart')}
            title={t('podCostChart')}
            headerRight={
              chartTarget
                ? <span style={{ fontSize: 13, fontWeight: 700, color: chartEvents.length > 0 && chartEvents[chartEvents.length - 1]?.cumulative > chartTarget ? '#B71C1C' : '#5A5F68' }}>
                    {chartEvents.length > 0 ? `${Math.round((chartEvents[chartEvents.length - 1].cumulative / chartTarget) * 100)}%` : '0%'}
                  </span>
                : null
            }
          >
            <CostChart events={chartEvents} target={chartTarget} userCurrency={userCurrency} t={t} />
          </InfoPod>

          {/* ── Expenses ── */}
          <h2 style={{ margin: '6px 0 0', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('sectionExpenses')}</h2>

          {/* Pod: Invoices */}
          <InfoPod
            isOpen={openPods.invoices}
            onToggle={() => togglePod('invoices')}
            title={t('invoicesTab')}
            headerRight={
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>
                {projInvoices.length > 0 ? formatMoney(projInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0), userCurrency) : `${projInvoices.length}`}
              </span>
            }
          >
            {projInvoices.length === 0 ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('noInvoices')}</span>
            ) : (() => {
              const CAT_LABEL = {
                material: tProj('catMaterial'), labour: tProj('catLabour'), equipment: tProj('catTools'),
                delivery: tProj('catDelivery'), parking: tProj('catParking'), other: tProj('catOther'),
              };
              const isCollective = !!project?.collective_id;
              return (
                <>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8F97', display: 'flex', pointerEvents: 'none' }} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                    </span>
                    <input
                      type="search"
                      value={invSearch}
                      onChange={e => setInvSearch(e.target.value)}
                      placeholder={tProj('invoiceSearch')}
                      style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #E5E3DC', borderRadius: 22, background: '#F7F5EF', paddingLeft: 36, paddingRight: 12, fontSize: 14, fontWeight: 500, color: 'var(--m-ink)', outline: 0 }}
                    />
                  </div>

                  {/* Category filter chips */}
                  <div className="scroll-x-hidden" style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
                      {[null, ...usedInvCats].map(cat => {
                        const on = invCatFilter === cat;
                        const cc = cat ? CAT_COLORS[cat] || CAT_COLORS.other : null;
                        return (
                          <button key={cat ?? 'all'} type="button" onClick={() => setInvCatFilter(cat)}
                            style={{ flexShrink: 0, height: 32, padding: '0 12px', border: `1.5px solid ${on ? (cc?.fg || PROJ_BG) : '#D5D2C8'}`, borderRadius: 16, background: on ? (cc?.bg || '#E3E7EE') : '#fff', color: on ? (cc?.fg || PROJ_BG) : '#4A4F57', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {cat ? CAT_LABEL[cat] : tProj('filterAll')}
                          </button>
                        );
                      })}
                    </div>

                  {/* Uploader filter chips — collective only, when >1 person */}
                  {isCollective && invUploaders.length > 1 && (
                    <div className="scroll-x-hidden" style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
                      {[null, ...invUploaders].map(name => {
                        const on = invUploaderFilter === name;
                        return (
                          <button key={name ?? 'all'} type="button" onClick={() => setInvUploaderFilter(name)}
                            style={{ flexShrink: 0, height: 32, padding: '0 12px', border: `1.5px solid ${on ? PROJ_BG : '#D5D2C8'}`, borderRadius: 16, background: on ? '#E3E7EE' : '#fff', color: on ? PROJ_BG : '#4A4F57', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {!name && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                            )}
                            {name ?? tProj('filterAll')}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Invoice list — capped at ~9 rows, then scrollable */}
                  {filteredInvoices.length === 0 ? (
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F97', padding: '4px 2px' }}>{t('noInvoices')}</span>
                  ) : <div className="scroll-x-hidden" style={{ overflowY: 'auto', overflowX: 'visible', maxHeight: 480, display: 'flex', flexDirection: 'column' }}>{filteredInvoices.map(inv => {
                    const cc = CAT_COLORS[inv.category] || CAT_COLORS.other;
                    const isExpanded = expandedInvId === inv.id;
                    const hasImage = !!inv.image_url;
                    const subtitle = [
                      CAT_LABEL[inv.category],
                      inv.date ? formatDate(inv.date) : null,
                      isCollective && inv.uploader_name ? inv.uploader_name : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <article key={inv.id} style={{ borderRadius: 16, background: isExpanded ? '#F7F5EF' : 'transparent', border: isExpanded ? '1.5px solid #E5E3DC' : '1.5px solid transparent', overflow: 'hidden' }}>
                        {/* Row header — tap to expand */}
                        <button
                          type="button"
                          onClick={() => setExpandedInvId(prev => prev === inv.id ? null : inv.id)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                        >
                          <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: cc.bg, color: cc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4"/></svg>
                          </span>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                            <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--m-ink)' }}>{inv.description || '—'}</b>
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#9A9690', marginTop: 1 }}>{subtitle}</span>
                          </span>
                          <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, flexShrink: 0, color: 'var(--m-ink)' }}>{formatMoney(Number(inv.value_huf || 0), userCurrency)}</b>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F97" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .18s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>

                        {/* Expanded body */}
                        {isExpanded && (
                          <div style={{ padding: '0 8px 10px 54px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {hasImage ? (
                              <button
                                type="button"
                                onClick={() => setLightboxInv(inv)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                              >
                                <img
                                  src={inv.image_url}
                                  alt={inv.description || ''}
                                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1.5px solid #E5E3DC' }}
                                />
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: PROJ_BG }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true"><path d="M15 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9zM15 3v6h6M10 14l2 2 4-4"/></svg>
                                    {t('viewInvoiceImage')}
                                  </span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: '#8A8F97' }}>{t('tapToOpen')}</span>
                                </span>
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#B0ADA6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4"/></svg>
                                {t('noInvoiceImage')}
                              </span>
                            )}
                            {!isClosed && (canOwnerAct || inv.uploaded_by === currentUser?.id) && (
                              <button
                                onClick={() => { setExpandedInvId(null); handleDeleteInvoice(inv.id); }}
                                style={{ alignSelf: 'flex-start', height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                                {t('deleteInvoice')}
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}</div>}
                </>
              );
            })()}
          </InfoPod>

          {/* Pod: Labour */}
          <InfoPod
            isOpen={openPods.labour}
            onToggle={() => togglePod('labour')}
            title={t('labourTab')}
            headerRight={
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>
                {projLabour.length > 0 ? formatMoney(projLabour.filter(le => le.counts_as_expense !== false).reduce((s, le) => s + Number(le.value_huf || 0), 0), userCurrency) : `${projLabour.length}`}
              </span>
            }
          >
            {projLabour.length === 0 ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('noLabour')}</span>
            ) : (
              <>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8F97', display: 'flex', pointerEvents: 'none' }} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                  </span>
                  <input
                    type="search"
                    value={labourSearch}
                    onChange={e => setLabourSearch(e.target.value)}
                    placeholder={t('labourSearch')}
                    style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #E5E3DC', borderRadius: 22, background: '#F7F5EF', paddingLeft: 36, paddingRight: 12, fontSize: 14, fontWeight: 500, color: 'var(--m-ink)', outline: 0 }}
                  />
                </div>

                {filteredLabour.length === 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F97' }}>{t('noLabour')}</span>
                ) : filteredLabour.map(le => {
                  const isExpanded = expandedLabourId === le.id;
                  const isEigen = le.counts_as_expense === false;
                  const iconBg  = isEigen ? '#FFF1E0' : '#E2F3E8';
                  const iconFg  = isEigen ? '#8A4200' : '#14532D';
                  const unitStr = le.unit ? (UNIT_I18N[le.unit] ? tSD(UNIT_I18N[le.unit]) : le.unit) : '';
                  const dateStr = le.end_date
                    ? `${le.date ? formatDate(le.date) : ''}–${formatDate(le.end_date)}`
                    : (le.date ? formatDate(le.date) : '');
                  const subtitle = [le.hours && unitStr ? `${le.hours} ${unitStr}` : null, dateStr].filter(Boolean).join(' · ');
                  return (
                    <article key={le.id} style={{ borderRadius: 16, background: isExpanded ? '#F7F5EF' : 'transparent', border: `1.5px solid ${isExpanded ? '#E5E3DC' : 'transparent'}`, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLabourId(prev => prev === le.id ? null : le.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                      >
                        <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 6l4 4M5 19l8-8M12 5l3-2 6 6-2 3z"/></svg>
                        </span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                          <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--m-ink)' }}>{le.labour_type || '—'}</b>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#9A9690', marginTop: 1 }}>{subtitle}</span>
                        </span>
                        <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, flexShrink: 0, color: isEigen ? '#8A4200' : 'var(--m-ink)' }}>{formatMoney(Number(le.value_huf || 0), userCurrency)}</b>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F97" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .18s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {isExpanded && (
                        <div style={{ padding: '0 8px 10px 54px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {/* Expense status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: isEigen ? '#FFF1E0' : '#E8F4EC' }}>
                            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: isEigen ? '#8A4200' : '#14532D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isEigen
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 2v10m0 4h.01"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
                              }
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isEigen ? '#8A4200' : '#14532D' }}>
                              {isEigen ? t('labourCountsAsExpenseOff') : t('labourCountsAsExpenseOn')}
                            </span>
                          </div>
                          {/* Delete */}
                          {!isClosed && (canOwnerAct || le.user_id === currentUser?.id || le.created_by === currentUser?.id) && (
                            <button
                              onClick={() => { setExpandedLabourId(null); handleDeleteLabour(le.id); }}
                              style={{ alignSelf: 'flex-start', height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                              {t('deleteLabour')}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </>
            )}
            {!isClosed && (
              <button onClick={() => setLabourSheet(true)} style={{ marginTop: 4, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {t('addLabour')}
              </button>
            )}
          </InfoPod>

          {/* ── Diary ── */}
          <h2 style={{ margin: '6px 0 0', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('sectionDiary')}</h2>

          {/* Pod: Diary */}
          <InfoPod
            isOpen={openPods.diary}
            onToggle={() => togglePod('diary')}
            title={tDiary('pageTitle')}
            headerRight={<span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>{diaryEntries.filter(e => !e.deleted_at).length}</span>}

          >
            {diaryEntries.filter(e => !e.deleted_at).length === 0 ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{tDiary('noEntries')}</span>
            ) : (
            <>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8F97', display: 'flex', pointerEvents: 'none' }} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                </span>
                <input
                  type="search"
                  value={diarySearch}
                  onChange={e => setDiarySearch(e.target.value)}
                  placeholder={tDiary('diarySearch')}
                  style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #E5E3DC', borderRadius: 22, background: '#F7F5EF', paddingLeft: 36, paddingRight: 12, fontSize: 14, fontWeight: 500, color: 'var(--m-ink)', outline: 0 }}
                />
              </div>
              {filteredDiary.length === 0
                ? <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F97' }}>{tDiary('noEntries')}</span>
                : filteredDiary.map(entry => {
              const isExpanded = expandedDiaryId === entry.id;
              const photos = (entry.photos || []).filter(p => !p.is_private);
              const subtitle = [entry.work_type, entry.entry_date ? formatDate(entry.entry_date) : null].filter(Boolean).join(' · ');
              return (
                <article key={entry.id} style={{ borderRadius: 16, background: isExpanded ? '#F7F5EF' : 'transparent', border: `1.5px solid ${isExpanded ? '#E5E3DC' : 'transparent'}`, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedDiaryId(prev => prev === entry.id ? null : entry.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: entry.is_public ? '#E7F4EC' : '#E3E7EE', color: entry.is_public ? '#14532D' : PROJ_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {entry.is_public
                          ? <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6"/>
                          : <path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/>}
                      </svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--m-ink)' }}>{entry.title || entry.work_type || '—'}</b>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#9A9690', marginTop: 1 }}>{subtitle}</span>
                    </span>
                    <span style={{ height: 20, padding: '0 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: entry.is_public ? '#E7F4EC' : '#E3E7EE', color: entry.is_public ? '#14532D' : PROJ_BG, flexShrink: 0 }}>
                      {entry.is_public ? tDiary('publicBadge') : tDiary('privateBadge')}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F97" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .18s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 8px 10px 54px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Body */}
                      {entry.body && (
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#4A4F57', lineHeight: 1.5 }}>{entry.body}</p>
                      )}
                      {/* Internal note */}
                      {entry.internal_note && (
                        <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F7F5EF', border: '1px solid #EAE8E2' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: '#dc2626', borderRadius: 4, padding: '1px 6px', marginBottom: 4, display: 'inline-block' }}>PRIVÁT</span>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#4A4F57', lineHeight: 1.45 }}>{entry.internal_note}</p>
                        </div>
                      )}
                      {/* Photos */}
                      {photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {photos.map((photo, idx) => (
                            <button key={photo.id} type="button" onClick={() => setLightboxDiary({ photos, startIndex: idx })}
                              style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #E5E3DC', background: '#F4F2EC', flexShrink: 0, padding: 0, cursor: 'pointer' }}>
                              <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            </>)}
            {!isClosed && (
              <button onClick={() => setDiarySheet(true)} style={{ marginTop: 4, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {tDiary('addEntry')}
              </button>
            )}
          </InfoPod>

          {/* ── Payments ── */}
          <h2 style={{ margin: '6px 0 0', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('sectionPayments')}</h2>

          {/* Pod: Payment plan */}
          <InfoPod
            isOpen={openPods.payments}
            onToggle={() => togglePod('payments')}
            title={t('tabPayments')}
            headerRight={<span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>{paymentPlan.length}</span>}
          >
            {!canOwnerAct ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('paymentPlanOwnerOnly')}</span>
            ) : loadingPayment ? (
              <div style={{ height: 60, borderRadius: 16, background: '#F4F2EC', animation: 'pulse 1.4s infinite' }} />
            ) : paymentPlan.length === 0 ? (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('paymentPlanEmpty')}</span>
            ) : paymentPlan.map(item => {
              const SC = {
                pending:   { bg: '#E3E7EE', fg: '#263248' },
                sent:      { bg: '#E0F2FE', fg: '#0369A1' },
                paid:      { bg: '#E7F4EC', fg: '#14532D' },
                cancelled: { bg: '#FDECEC', fg: '#9B1C1C' },
              }[item.status] || { bg: '#E3E7EE', fg: '#263248' };
              const statusLabel = { paid: t('statusPaid'), sent: t('statusSent'), cancelled: t('statusCanceled'), pending: t('statusPending') }[item.status] || t('statusPending');
              const hasFiles = (item.files || []).length > 0;
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', boxShadow: '0 2px 8px rgba(14,17,22,0.08), 0 1px 2px rgba(14,17,22,0.04)', marginBottom: 8 }}>
                  {/* Status badge above title */}
                  <span style={{ display: 'inline-block', height: 20, padding: '0 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', background: SC.bg, color: SC.fg, marginBottom: 6 }}>{statusLabel}</span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <b style={{ fontSize: 15, color: '#1A1F2B' }}>{item.label || '—'}</b>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#263248' }}>{formatMoney(Number(item.amount_huf || 0), userCurrency)}</span>
                      {item.due_date && <span style={{ fontSize: 12, color: '#8A8F97' }}>{formatDate(item.due_date)}</span>}
                    </span>
                    {canOwnerAct && (
                      <button type="button" onClick={() => setContextMenuItem(item)} aria-label="Műveletek" style={{ width: 32, height: 32, border: 0, borderRadius: 8, background: '#F4F2EC', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  </div>
                  {(hasFiles || item.note) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      {hasFiles && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Paperclip size={12} color="#8A8F97" />
                          <span style={{ fontSize: 12, color: '#5A5F68', fontWeight: 600 }}>{item.files[0].file_name || 'Fájl'}</span>
                        </span>
                      )}
                      {item.note && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MessageSquare size={12} color="#8A8F97" />
                          <span style={{ fontSize: 12, color: '#5A5F68', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {canOwnerAct && !isClosed && (
              <button onClick={() => setPaymentSheet(true)} style={{ marginTop: 4, height: 48, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {t('addPaymentItem')}
              </button>
            )}
          </InfoPod>


        </div>
      </div>

      {/* Add Invoice FAB */}
      {!isClosed && (
        <button
          onClick={() => { setInvoiceItems([]); setInvoiceSheet(true); }}
          aria-label={t('addInvoice')}
          style={{
            position: 'fixed', zIndex: 25,
            bottom: `calc(22px + env(safe-area-inset-bottom))`,
            left: '50%', transform: 'translateX(-50%)',
            height: 56, padding: '0 28px',
            border: 0, borderRadius: 28,
            background: PROJ_BG, color: '#fff',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
            boxShadow: '0 8px 24px -6px rgba(11,15,23,0.55)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          {t('addInvoice')}
        </button>
      )}

      {/* Hidden file inputs for invoice sheet */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) handleInvoiceFiles(files); }} />
      <input ref={galleryRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) handleInvoiceFiles(files); }} />

      {/* Invoice sheet */}
      {invoiceSheet && (
        <>
          <div onClick={() => { setInvoiceSheet(false); setInvoiceItems([]); }} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setInvoiceSheet(false)} />
          <div role="dialog" aria-label={t('addInvoice')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('addInvoice')}</span>
              <CloseBtnDark onClick={() => { setInvoiceSheet(false); setInvoiceItems([]); }} />
            </div>

            {/* Upload buttons — hidden once items exist */}
            {invoiceItems.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => cameraRef.current?.click()} style={{ width: '100%', height: 56, border: 0, borderRadius: 24, background: PROJ_BG, color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z"/></svg>
                  {tProj2('uploadCamera')}
                </button>
                <button onClick={() => galleryRef.current?.click()} style={{ width: '100%', height: 56, border: 0, borderRadius: 24, background: '#E3E7EE', color: PROJ_BG, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 15h6M9 12h6"/></svg>
                  {tProj2('uploadFile')}
                </button>
                <button onClick={() => setInvoiceItems(prev => [...prev, newInvoiceItem()])} style={{ width: '100%', height: 56, border: 0, borderRadius: 24, background: 'rgba(38,50,72,0.08)', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {tProj2('manualEntry')}
                </button>
              </div>
            )}

            {/* Invoice items */}
            {invoiceItems.map(item => (
              <div key={item.localId} style={{ boxSizing: 'border-box', borderRadius: 24, background: '#fff', boxShadow: CARD_SHADOW, padding: '14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                <button onClick={() => removeInvoiceItem(item.localId)} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, border: 0, borderRadius: 16, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>

                {item.status === 'processing' || item.status === 'pending' ? (
                  <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 10, color: '#5A5F68' }}>
                    <div style={{ width: 24, height: 24, border: `3px solid ${PROJ_BG}`, borderTopColor: 'transparent', borderRadius: 12, animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{tProj2('processingOcr')}</span>
                  </div>
                ) : (
                  <>
                    {item.previewUrl && (
                      <div style={{ height: 72, borderRadius: 14, overflow: 'hidden', background: '#F7F5EF' }}>
                        <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    {item.foreignCurrency && (
                      <div style={{ padding: '8px 12px', borderRadius: 12, background: '#FFF1E0', color: '#8A4200', fontSize: 13, fontWeight: 600 }}>⚠ {tProj2('invoiceForeignCurrencyWarning')}</div>
                    )}
                    <div style={{ position: 'relative' }}>
                      <input type="number" inputMode="numeric" min="1" placeholder="0" value={item.valueHuf} onChange={e => updateInvoiceItem(item.localId, { valueHuf: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 18, background: '#F7F5EF', paddingLeft: 16, paddingRight: 48, fontSize: 20, fontWeight: 700, color: 'var(--m-ink)', outline: 0 }} />
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#5A5F68', fontSize: 13, pointerEvents: 'none' }}>{userCurrency || 'HUF'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CAT_OPTIONS.map(c => {
                        const on = item.category === c.id;
                        return (
                          <button key={c.id} onClick={() => updateInvoiceItem(item.localId, { category: c.id })} aria-pressed={on}
                            style={{ height: 34, padding: '0 12px', border: 0, borderRadius: 17, fontSize: 13, fontWeight: 700, background: on ? c.fg : c.bg, color: on ? '#fff' : c.fg, cursor: 'pointer' }}>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    <input type="text" placeholder={item.descriptionSuggestion || tProj2('invoiceDescription')} value={item.description} onChange={e => updateInvoiceItem(item.localId, { description: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', height: 48, border: 0, borderRadius: 16, background: '#F7F5EF', padding: '0 14px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)', outline: 0 }} />
                    {rooms.length > 0 && (
                      <select value={item.roomId} onChange={e => updateInvoiceItem(item.localId, { roomId: e.target.value })}
                        style={{ width: '100%', height: 48, border: 0, borderRadius: 16, background: '#F7F5EF', padding: '0 14px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)', cursor: 'pointer', outline: 0 }}>
                        <option value="">— {tProj2('invoiceSection')} —</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Save */}
            {invoiceItems.length > 0 && (() => {
              const canSave = !savingInvoices
                && invoiceItems.every(i => i.status !== 'processing' && i.status !== 'pending' && Number(i.valueHuf) > 0);
              return (
                <button onClick={handleInvoiceSubmit} disabled={!canSave}
                  style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {savingInvoices ? '…' : tProj2('saveAll')}
                </button>
              );
            })()}
          </div>
        </>
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
          {!isClosed && canOwnerAct && <SheetRowInline icon="edit" label={t('editProject')} onClick={() => { setMode(null); openEditSheet(); }} />}
          {!isClosed && canOwnerAct && !linkedQuote && <SheetRowInline icon="target" label={t('setCostTarget')} onClick={() => { setCostTargetInput(project.cost_target != null ? String(project.cost_target) : ''); setMode('costTarget'); }} />}
          {!isClosed && canOwnerAct && project.status !== 'paused' && <SheetRowInline icon="pause" label={t('setPaused')} onClick={() => setMode('pause')} />}
          {canOwnerAct && project.status === 'paused' && <SheetRowInline icon="play" label={t('setActive')} onClick={() => setMode('continue')} />}
          {!isClosed && canOwnerAct && <SheetRowInline icon="close" label={t('setClosed')} onClick={() => setMode('close')} />}
          {isClosed && canOwnerAct && <SheetRowInline icon="play" label={t('reopen')} onClick={() => setMode('reopen')} />}
          <SheetRowInline icon="hist" label={t('historyTitle')} onClick={() => {
            setMode('hist');
            if (projHistory !== null) return;
            setHistLoading(true);
            fetch(`/api/projects/${projectId}/history?limit=20&offset=0`)
              .then(r => r.ok ? r.json() : { history: [] })
              .then(d => setProjHistory(d.history || []))
              .catch(() => setProjHistory([]))
              .finally(() => setHistLoading(false));
          }} />
          {canOwnerAct && <SheetRowInline icon="trash" label={t('deleteProject')} onClick={() => setMode('delete')} danger />}
        </div>
      )}

      {/* Edit sheet */}
      {mode === 'edit' && (
        <>
          <div onClick={() => setMode(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setMode(null)} />
          <div role="dialog" aria-label={t('editProject')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('editProject')}</span>
              <CloseBtnDark onClick={() => setMode(null)} />
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{tProj('nameLabel')} *</span>
              <input
                type="text" autoFocus
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder={tProj('namePlaceholder')}
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{tProj('clientLabel')}</span>
              <select
                value={editForm.clientId}
                onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— {tProj('clientLabel')} —</option>
                {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{tProj('startLabel')}</span>
                <input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{tProj('endLabel')}</span>
                <input type="date" value={editForm.endDate} min={editForm.startDate || undefined} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={savingEdit || !editForm.name.trim()}
              style={{ height: 60, border: 0, borderRadius: 30, background: editForm.name.trim() && !savingEdit ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
            >
              {savingEdit ? '…' : t('costTargetSave')}
            </button>
          </div>
        </>
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

      {/* Cost target sheet */}
      {mode === 'costTarget' && (
        <>
          <div onClick={() => setMode(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setMode(null)} />
          <div role="dialog" aria-label={t('setCostTarget')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('setCostTarget')}</span>
              <CloseBtnDark onClick={() => setMode(null)} />
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={costTargetInput}
                onChange={e => setCostTargetInput(e.target.value)}
                placeholder={t('costTargetPlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', height: 64, border: 0, borderRadius: 20, background: '#fff', padding: '0 72px 0 16px', fontSize: 22, fontWeight: 700, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
              />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: '#5A5F68', pointerEvents: 'none' }}>{userCurrency || 'HUF'}</span>
            </div>
            <button onClick={handleSaveCostTarget} disabled={!costTargetInput || Number(costTargetInput) <= 0} style={{ height: 60, border: 0, borderRadius: 30, background: costTargetInput && Number(costTargetInput) > 0 ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('costTargetSave')}
            </button>
          </div>
        </>
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

      {/* Payment item sheet */}
      {paymentSheet && (
        <>
          <div onClick={closePaymentSheet} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && closePaymentSheet()} />
          <div role="dialog" aria-label={t('addPaymentItem')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('addPaymentItem')}</span>
              <CloseBtnDark onClick={closePaymentSheet} />
            </div>

            {/* File picker — leads the form */}
            <button type="button" onClick={() => paymentFileRef.current?.click()} style={{ width: '100%', height: 64, border: `2px dashed ${paymentFile ? '#14532D' : '#D5D2C8'}`, borderRadius: 20, background: paymentFile ? '#E7F4EC' : '#fff', color: paymentFile ? '#14532D' : '#5A5F68', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
              {paymentFile ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{paymentFile.name}</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {t('attachFile')}
                </>
              )}
            </button>
            <input ref={paymentFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPaymentFile(f); }} />

            {/* Label */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('paymentLabelField')} *</span>
              <input type="text" value={paymentForm.label} onChange={e => setPaymentForm(f => ({ ...f, label: e.target.value }))} placeholder={t('paymentLabelPlaceholder')} style={inputStyle} />
            </label>

            {/* Amount + Due date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('paymentAmountField')} *</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" inputMode="numeric" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={{ ...inputStyle, paddingRight: 44 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#8A8F97', pointerEvents: 'none' }}>{userCurrency}</span>
                </div>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('paymentDueField')}</span>
                <input type="date" value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
            </div>

            {/* Note */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('paymentNoteField')}</span>
              <textarea value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} placeholder={t('paymentNotePlaceholder')} rows={2} style={{ width: '100%', boxSizing: 'border-box', height: 72, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)', outline: 0 }} />
            </label>

            {(() => {
              const canSave = !savingPayment && paymentForm.label.trim() && Number(paymentForm.amount) > 0;
              return (
                <button onClick={() => handleAddPayment(false)} disabled={!canSave} style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {savingPayment ? '…' : t('addPaymentItem')}
                </button>
              );
            })()}
          </div>
        </>
      )}

      {/* Invoice context menu */}
      <BottomSheet
        isOpen={!!contextMenuItem}
        onClose={() => setContextMenuItem(null)}
        title={contextMenuItem?.label || ''}
        subtitle={contextMenuItem ? formatMoney(Number(contextMenuItem.amount_huf || 0), userCurrency) : ''}
        actions={contextMenuItem ? [
          ...(contextMenuItem.files?.length > 0 ? [{
            icon: FileText,
            label: t('filesViewTitle'),
            onClick: () => window.open(contextMenuItem.files[0].file_url, '_blank'),
          }] : []),
          {
            icon: MessageSquare,
            label: t('notesMenuLabel'),
            onClick: () => { setNoteText(contextMenuItem.note || ''); setNoteItem(contextMenuItem); },
          },
          ...((contextMenuItem.files?.length > 0 && contextMenuItem.status !== 'paid') ? [{
            icon: Send,
            label: t('sendInvoice'),
            onClick: () => { setInvoiceSendEmail(client?.email || ''); setSendConfirmItem(contextMenuItem); },
          }] : []),
          {
            icon: Trash2,
            label: t('deletePaymentItem'),
            danger: true,
            dividerBefore: true,
            onClick: () => setDeleteConfirmItem(contextMenuItem),
          },
        ] : []}
      />

      {/* Delete confirmation sheet */}
      {deleteConfirmItem && (
        <>
          <div onClick={() => setDeleteConfirmItem(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setDeleteConfirmItem(null)} />
          <div role="dialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('deletePaymentItem')}</span>
              <CloseBtnDark onClick={() => setDeleteConfirmItem(null)} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.5 }}>{t('deleteInvoiceConfirmBody')}</span>
            <button onClick={() => { handleDeletePaymentItem(deleteConfirmItem.id); setDeleteConfirmItem(null); }} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('deletePaymentItem')}
            </button>
            <button onClick={() => setDeleteConfirmItem(null)} style={{ height: 52, border: 0, borderRadius: 26, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tProj('cancel')}</button>
          </div>
        </>
      )}

      {/* Send invoice sheet */}
      {sendConfirmItem && (
        <>
          <div onClick={() => setSendConfirmItem(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setSendConfirmItem(null)} />
          <div role="dialog" aria-label={t('sendInvoice')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('sendInvoice')}</span>
              <CloseBtnDark onClick={() => setSendConfirmItem(null)} />
            </div>

            {/* Invoice summary */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F2B' }}>{sendConfirmItem.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#263248' }}>{formatMoney(Number(sendConfirmItem.amount_huf || 0), userCurrency)}</span>
            </div>

            {/* Client name */}
            {client && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '0 2px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                {client.name}
              </span>
            )}

            {/* Email input */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('invoiceSendEmailLabel')}</span>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={invoiceSendEmail}
                onChange={e => setInvoiceSendEmail(e.target.value)}
                placeholder="pl. ugyfel@email.hu"
                style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
              />
            </label>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 2px' }}>
              {client?.email ? t('invoiceSendEmailPrefilled') : t('invoiceSendNoEmailHint')}
            </span>

            {/* Send button */}
            {(() => {
              const isSending = sendingItemId === sendConfirmItem.id;
              const canSend = !isSending && invoiceSendEmail.trim().includes('@');
              return (
                <button
                  disabled={!canSend}
                  onClick={async () => {
                    await handleSendInvoice(sendConfirmItem.id, invoiceSendEmail.trim());
                    setSendConfirmItem(null);
                  }}
                  style={{ height: 60, border: 0, borderRadius: 30, background: canSend ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSend ? 'pointer' : 'default' }}
                >
                  {isSending ? '…' : t('sendInvoice')}
                </button>
              );
            })()}
            <button onClick={() => setSendConfirmItem(null)} style={{ height: 52, border: 0, borderRadius: 26, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tProj('cancel')}</button>
          </div>
        </>
      )}

      {/* Notes sheet */}
      {noteItem && (
        <>
          <div onClick={() => setNoteItem(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setNoteItem(null)} />
          <div role="dialog" aria-label={t('notesSheetTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('notesSheetTitle')}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', marginTop: 2 }}>{noteItem.label}</div>
              </div>
              <CloseBtnDark onClick={() => setNoteItem(null)} />
            </div>
            <textarea
              autoFocus
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 120, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)', outline: 0, lineHeight: 1.5 }}
            />
            <button onClick={handleSaveNote} disabled={savingNote} style={{ height: 60, border: 0, borderRadius: 30, background: PROJ_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', opacity: savingNote ? 0.6 : 1 }}>
              {savingNote ? '…' : t('notesSave')}
            </button>
            <button onClick={() => setNoteItem(null)} style={{ height: 52, border: 0, borderRadius: 26, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tProj('cancel')}</button>
          </div>
        </>
      )}

      {/* Diary add sheet */}
      {diarySheet && (
        <>
          <div onClick={() => setDiarySheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={tProj('cancel')} onKeyDown={e => e.key === 'Enter' && setDiarySheet(false)} />
          <div role="dialog" aria-label={tDiary('addEntry')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{tDiary('addEntry')}</span>
              <CloseBtnDark onClick={() => setDiarySheet(false)} />
            </div>

            {/* Title */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{tDiary('entryTitle')} *</span>
              <input autoFocus type="text" value={diaryForm.title} onChange={e => setDiaryForm(f => ({ ...f, title: e.target.value }))} placeholder={tDiary('entryTitlePlaceholder')} style={inputStyle} />
            </label>

            {/* Date + Work type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{tDiary('entryDate')}</span>
                <input type="date" value={diaryForm.date || new Date().toISOString().slice(0, 10)} onChange={e => setDiaryForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{tDiary('entryWorkType')}</span>
                <input type="text" value={diaryForm.workType} onChange={e => setDiaryForm(f => ({ ...f, workType: e.target.value }))} placeholder={tDiary('entryWorkTypePlaceholder')} style={inputStyle} />
              </label>
            </div>


            {/* Public body */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6"/></svg>
                {tDiary('clientMessage')}
              </span>
              <textarea value={diaryForm.body} onChange={e => setDiaryForm(f => ({ ...f, body: e.target.value }))} placeholder={tDiary('entryBodyPlaceholder')} rows={3} style={{ width: '100%', boxSizing: 'border-box', height: 88, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)', outline: 0 }} />
            </label>

            {/* Is public toggle */}
            <button type="button" onClick={() => setDiaryForm(f => ({ ...f, isPublic: !f.isPublic }))}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 0, borderRadius: 20, background: diaryForm.isPublic ? '#E8F4EC' : '#F7F5EF', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flexShrink: 0, width: 36, height: 20, borderRadius: 10, background: diaryForm.isPublic ? '#14532D' : '#B0ADA6', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, left: diaryForm.isPublic ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <b style={{ fontSize: 14, color: diaryForm.isPublic ? '#14532D' : 'var(--m-ink)' }}>{diaryForm.isPublic ? tDiary('entryPublicOn') : tDiary('entryPublicOff')}</b>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68' }}>{tDiary('entryPublicHint')}</span>
              </span>
            </button>

            {/* Private note */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
                {tDiary('entryInternalNote')}
                <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: '#dc2626', borderRadius: 4, padding: '1px 6px' }}>PRIVÁT</span>
              </span>
              <textarea value={diaryForm.internalNote} onChange={e => setDiaryForm(f => ({ ...f, internalNote: e.target.value }))} placeholder={tDiary('entryInternalNotePlaceholder')} rows={2} style={{ width: '100%', boxSizing: 'border-box', height: 72, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)', outline: 0 }} />
            </label>

            {/* Photo picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{tDiary('uploadPhotos')} ({diaryFiles.length}/{MAX_DIARY_PHOTOS})</span>
              {diaryPreviews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {diaryPreviews.map((p, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #E5E3DC', background: '#F4F2EC', flexShrink: 0 }}>
                      {p.isVideo ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PROJ_BG} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 10l4.553-2.069A1 1 0 0121 8.879V15.12a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                          <span style={{ fontSize: 9, fontWeight: 700, color: PROJ_BG, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4, paddingRight: 4 }}>{p.name}</span>
                        </div>
                      ) : p.url ? (
                        <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                      <button type="button" onClick={() => {
                        setDiaryFiles(prev => prev.filter((_, j) => j !== i));
                        setDiaryPreviews(prev => { const r = prev[i]; if (r?.url) URL.revokeObjectURL(r.url); return prev.filter((_, j) => j !== i); });
                      }} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, border: 0, borderRadius: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {diaryFiles.length < MAX_DIARY_PHOTOS && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => diaryCameraRef.current?.click()} style={{ flex: 1, height: 44, border: `1.5px dashed #B0ADA6`, borderRadius: 22, background: 'transparent', color: '#5A5F68', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {tDiary('entryCamera')}
                  </button>
                  <button type="button" onClick={() => diaryGalleryRef.current?.click()} style={{ flex: 1, height: 44, border: `1.5px dashed #B0ADA6`, borderRadius: 22, background: 'transparent', color: '#5A5F68', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 19V5H3v14l5-5 4 4 3-3z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
                    {tDiary('entryGallery')}
                  </button>
                </div>
              )}
              <input ref={diaryCameraRef} type="file" accept="image/*,video/*" capture="environment" style={{ display: 'none' }} onChange={async e => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (!files.length) return;
                const remaining = MAX_DIARY_PHOTOS - diaryFiles.length;
                const toAdd = files.slice(0, remaining);
                const processed = await Promise.all(toAdd.map(processMediaFile));
                setDiaryFiles(prev => [...prev, ...processed]);
                setDiaryPreviews(prev => [...prev, ...processed.map(f => ({ isVideo: f.type?.startsWith('video/'), url: f.type?.startsWith('video/') ? null : URL.createObjectURL(f), name: f.name }))]);
              }} />
              <input ref={diaryGalleryRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={async e => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (!files.length) return;
                const remaining = MAX_DIARY_PHOTOS - diaryFiles.length;
                const toAdd = files.slice(0, remaining);
                const processed = await Promise.all(toAdd.map(processMediaFile));
                setDiaryFiles(prev => [...prev, ...processed]);
                setDiaryPreviews(prev => [...prev, ...processed.map(f => ({ isVideo: f.type?.startsWith('video/'), url: f.type?.startsWith('video/') ? null : URL.createObjectURL(f), name: f.name }))]);
              }} />
            </div>

            {/* Save */}
            {(() => {
              const canSave = !savingDiary && diaryForm.title.trim();
              return (
                <button onClick={handleAddDiary} disabled={!canSave} style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {savingDiary ? '…' : tDiary('addEntry')}
                </button>
              );
            })()}
          </div>
        </>
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
            {/* Work type */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourType')}</span>
              <input type="text" autoFocus placeholder={t('labourType')} value={labourForm.work_type} onChange={e => setLabourForm(f => ({ ...f, work_type: e.target.value }))} style={inputStyle} />
            </label>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourDate')}</span>
                <input type="date" value={labourForm.date} onChange={e => setLabourForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourDateEnd')}</span>
                <input type="date" value={labourForm.end_date} onChange={e => setLabourForm(f => ({ ...f, end_date: e.target.value }))} style={{ ...inputStyle, padding: '0 10px' }} />
              </label>
            </div>

            {/* Quantity stepper + unit chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourQty')}</span>
              <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button type="button" onClick={() => setLabourForm(f => ({ ...f, quantity: Number(f.quantity) + 1 }))} aria-label="+1"
                    style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: PROJ_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <input
                    type="text" inputMode="decimal"
                    value={labourForm.quantity || 0}
                    onChange={e => { const v = parseFloat(e.target.value.replace(/,/g, '.')); setLabourForm(f => ({ ...f, quantity: isNaN(v) ? 0 : v })); }}
                    onFocus={e => e.target.select()}
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, width: 72, textAlign: 'center', border: 0, background: 'transparent', outline: 'none', color: 'var(--m-ink)', padding: '10px 0' }}
                  />
                  <button type="button" onClick={() => setLabourForm(f => ({ ...f, quantity: Math.max(0, Number(f.quantity) - 1) }))} aria-label="-1"
                    style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F0EEE8', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {LABOUR_UNITS.map(u => (
                    <button key={u} type="button" onClick={() => setLabourForm(f => ({ ...f, unit: u }))}
                      style={{ height: 44, padding: '0 14px', border: `1.5px solid ${labourForm.unit === u ? PROJ_BG : '#D5D2C8'}`, borderRadius: 22, background: labourForm.unit === u ? '#E3E7EE' : '#fff', color: labourForm.unit === u ? PROJ_BG : '#4A4F57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {UNIT_I18N[u] ? tSD(UNIT_I18N[u]) : u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Unit price + Total — 50/50 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourUnitPrice')}</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" inputMode="numeric" min="0" placeholder="0" value={labourForm.unit_price}
                    onChange={e => setLabourForm(f => ({ ...f, unit_price: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 42 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#8A8F97', pointerEvents: 'none' }}>{userCurrency}</span>
                </div>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourTotal')}</span>
                {(() => {
                  const total = Math.round((labourForm.quantity || 0) * (parseFloat(labourForm.unit_price) || 0));
                  return (
                    <div style={{ position: 'relative', height: 56, borderRadius: 18, background: total > 0 ? '#E3E7EE' : '#F7F5EF', display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 42, boxSizing: 'border-box' }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: total > 0 ? 18 : 15, fontWeight: 700, letterSpacing: '-0.02em', color: total > 0 ? PROJ_BG : '#B0ADA6', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {total > 0 ? total.toLocaleString('hu-HU') : '0'}
                      </span>
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: total > 0 ? PROJ_BG : '#B0ADA6', pointerEvents: 'none' }}>{userCurrency}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Notes */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('labourNotes')}</span>
              <textarea placeholder={t('labourNotes')} value={labourForm.notes} onChange={e => setLabourForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box', height: 72, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.08)', outline: 0 }} />
            </label>

            {/* Eigenleistung toggle */}
            <button
              type="button"
              onClick={() => setLabourForm(f => ({ ...f, counts_as_expense: !f.counts_as_expense }))}
              aria-pressed={labourForm.counts_as_expense}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: 0, borderRadius: 20, background: labourForm.counts_as_expense ? '#E8F4EC' : '#FFF1E0', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, border: `2px solid ${labourForm.counts_as_expense ? '#14532D' : '#B0ADA6'}`, background: labourForm.counts_as_expense ? '#14532D' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {labourForm.counts_as_expense && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <b style={{ fontSize: 14, color: labourForm.counts_as_expense ? '#14532D' : '#8A4200' }}>{t('labourCountsAsExpense')}</b>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68' }}>{labourForm.counts_as_expense ? t('labourCountsAsExpenseOn') : t('labourCountsAsExpenseOff')}</span>
              </span>
            </button>

            {/* Save */}
            {(() => {
              const canSave = !savingLabour && labourForm.work_type.trim() && labourForm.quantity > 0 && labourForm.unit_price;
              return (
                <button onClick={handleAddLabour} disabled={!canSave} style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? PROJ_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {savingLabour ? '…' : t('saveLabour')}
                </button>
              );
            })()}
          </div>
        </>
      )}

      {mode === 'hist' && (
        <HistorySheet
          title={t('historyTitle')}
          history={projHistory}
          loading={histLoading}
          emptyText={t('noHistory')}
          onClose={() => setMode(null)}
          accentColor={PROJ_BG}
          userCurrency={userCurrency}
          actionLabels={{
            'project.created':        t('histActionProjectCreated'),
            'project.edited':         t('histActionProjectEdited'),
            'project.deleted':        t('histActionProjectDeleted'),
            'project.status_changed': t('histActionProjectStatusChanged'),
            'project.members_updated':t('histActionProjectMembersUpdated'),
            'invoice.added':          t('histActionInvoiceAdded'),
            'invoice.edited':         t('histActionInvoiceEdited'),
            'invoice.deleted':        t('histActionInvoiceDeleted'),
            'labour.added':           t('histActionLabourAdded'),
            'labour.edited':          t('histActionLabourEdited'),
            'labour.deleted':         t('histActionLabourDeleted'),
            'diary.created':          t('histActionDiaryCreated'),
            'payment.created':        t('histActionPaymentCreated'),
            'invoice.created':        t('histActionClientInvoiceCreated'),
            'invoice.sent':           t('histActionClientInvoiceSent'),
          }}
          getDetailRows={(details) => [
            details.value_huf   && { label: t('histActionInvoiceAdded'), value: formatMoney(details.value_huf, userCurrency) },
            details.labour_type && { label: t('labourType'),              value: details.labour_type },
            details.hours != null && details.unit && { label: t('labourQty'), value: `${details.hours} ${details.unit}` },
            details.recipient   && { label: t('histDetailRecipient'),       value: details.recipient },
            details.reason      && { label: t('historyReason'),           value: details.reason },
            details.error       && { label: 'Error',                      value: details.error },
          ].filter(Boolean)}
        />
      )}

      {lightboxInv && (
        <Lightbox
          media={[{ url: lightboxInv.image_url, alt: lightboxInv.description || '' }]}
          startIndex={0}
          onClose={() => setLightboxInv(null)}
        />
      )}

      {lightboxDiary && (
        <Lightbox
          media={lightboxDiary.photos.map(p => ({ url: p.drive_view_url, thumbnail_url: p.thumbnail_url, mime_type: p.mime_type }))}
          startIndex={lightboxDiary.startIndex}
          onClose={() => setLightboxDiary(null)}
        />
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
