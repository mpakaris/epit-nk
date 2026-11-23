'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatMoney, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import CollectiveBanner from '@/components/CollectiveBanner';
import StatCard from '@/components/StatCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import QuickCostSheet from '@/components/mobile/QuickCostSheet';
import QuickDiarySheet from '@/components/mobile/QuickDiarySheet';
import useMobile from '@/hooks/useMobile';
import {
  ArrowLeft, Plus, Receipt, Coins, Users, TrendingUp, TrendingDown,
  CheckCircle2, Camera, ArrowRight, Hammer, Clock, Trash2, Wallet, BookOpen,
  Edit3, UserCheck, CalendarDays, BookUser, BarChart3, ShieldCheck,
  Phone, Mail, MapPin, ChevronUp, Link2, Copy, Check, AlertCircle, Lock,
  FileText, Ruler, Home, Calendar, User,
  Sparkles, Loader2, Settings, ChevronDown, Download, PencilLine, Paperclip, EyeOff, Eye,
  MoreHorizontal, CircleDot, History,
} from 'lucide-react';
import Lightbox from '@/components/Lightbox';
import { podColor } from '@/lib/podColor';
import BurndownCard from './components/BurndownCard';
import CostBreakdownCard from './components/CostBreakdownCard';
import CombinedStatsCard from './components/CombinedStatsCard';
import EntryMediaGrid from './components/EntryMediaGrid';
import EditDiaryEntryModal from './components/EditDiaryEntryModal';
import LabourEditModal from './components/LabourEditModal';
import InvoiceDetailDrawer from './components/InvoiceDetailDrawer';
import PaymentPlanModal, { TRIGGER_DISPLAY, STATUS_DISPLAY } from './components/PaymentPlanModal';
import WorkTypeSelector, { WORK_TYPES } from './components/WorkTypeSelector';
import RoomModal from './components/RoomModal';
import ProjectEditModal from './components/ProjectEditModal';
import NewExpenseModal from './components/NewExpenseModal';
import PortalShareSection from './components/PortalShareSection';
import CollectiveChatSection from '@/components/CollectiveChatSection';
import ProjectDetailMobile from '../mobile/ProjectDetailMobile';


export default function ProjectDetailClient({
  project,
  initialUsers,
  initialInvoices,
  initialLabourEntries,
  client,
  clients,
  currentUser,
  initialDiaryCount = 0,
  initialRooms = [],
  initialPaymentPlan = [],
  initialInvoiceSplits = [],
}) {
  const router = useRouter();
  const {
    deleteInvoice: ctxDeleteInvoice,
    deleteLabourEntry: ctxDeleteLabourEntry,
    deleteProject: ctxDeleteProject,
    setProjectStatus: ctxSetProjectStatus,
    updateInvoice: ctxUpdateInvoice,
    updateLabourEntry: ctxUpdateLabourEntry,
    quotes,
    quoteEntries,
    surveys,
    diaryEntriesByProject,
    fetchDiaryEntries,
    updateDiaryEntry: ctxUpdateDiaryEntry,
    deleteDiaryEntry: ctxDeleteDiaryEntry,
    deleteDiaryPhoto: ctxDeleteDiaryPhoto,
    uploadDiaryPhotos,
    projectRooms: ctxProjectRooms,
    syncRoomsFromQuote,
    createProjectRoom,
    updateProjectRoom,
    deleteProjectRoom,
    quoteSections,
    activeCollectiveId,
    contextSwitching,
    loading: ctxLoading,
    labourEntries: ctxLabourEntries,
    invoices: ctxInvoices,
    updateProject,
    uploadInvoiceImage,
    createClient,
    clients: ctxClients,
    collectives,
    isDemoMode,
    refreshSupabaseData,
    projects: ctxProjects,
    userCurrency,
  } = useApp();

  const fmtMoney = (n) => formatMoney(n, userCurrency);
  const t  = useTranslations('projectDetail');
  const tP = useTranslations('projects');

  const CAT_LABEL_KEYS = {
    material:  'catMaterial',
    labour:    'catLabour',
    equipment: 'catTools',
    delivery:  'catDelivery',
    parking:   'catParking',
    other:     'catOther',
  };
  const catLabel = (id) => CAT_LABEL_KEYS[id] ? tP(CAT_LABEL_KEYS[id]) : id;
  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const isMobile = useMobile();

  const projectRooms = React.useMemo(() => {
    const sort = arr => [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at || '').localeCompare(b.created_at || ''));
    const ctx = (ctxProjectRooms || []).filter(r => r.project_id === project.id);
    // Once context has loaded, use it as the sole source of truth so deletions are reflected immediately.
    // Before context loads, merge with initialRooms (server-side prop) to avoid flash of empty content.
    if (!ctxLoading) return sort(ctx);
    const ctxById = Object.fromEntries(ctx.map(r => [r.id, r]));
    const serverById = Object.fromEntries(initialRooms.map(r => [r.id, r]));
    const allIds = new Set([...Object.keys(serverById), ...Object.keys(ctxById)]);
    return sort(Array.from(allIds).map(id => ctxById[id] || serverById[id]));
  }, [ctxProjectRooms, initialRooms, project.id, ctxLoading]);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [newExpenseOpen,  setNewExpenseOpen]  = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [tabSearch, setTabSearch] = useState('');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [activeExpenseTab, setActiveExpenseTab] = useState('invoices');

  const handleExpenseTabChange = (key) => { setActiveExpenseTab(key); setTabSearch(''); };
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [lockedModalOpen, setLockedModalOpen] = useState(() => !!project?.locked_reason);

  // History
  const [showHistoryModal,   setShowHistoryModal]   = useState(false);
  const [history,            setHistory]            = useState(null);
  const [historyTotal,       setHistoryTotal]       = useState(0);
  const [historyLoading,     setHistoryLoading]     = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [transferAttemptCount, setTransferAttemptCount] = useState(0);

  useEffect(() => {
    if (!project?.locked_reason) return;
    setLockedModalOpen(true);
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => {
        const count = (d.requests || []).filter(t => t.document_id === project.id && (t.status === 'rejected' || t.status === 'transfer_expired')).length;
        setTransferAttemptCount(count);
      }).catch(() => {});
  }, [project?.id, project?.locked_reason]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState('');
  const [showQuickCostSheet, setShowQuickCostSheet] = useState(false);
  const [showQuickDiarySheet, setShowQuickDiarySheet] = useState(false);
  const [editingDiaryEntry, setEditingDiaryEntry] = useState(null);
  const [editingLabour,    setEditingLabour]    = useState(null);
  const [detailInvoice,    setDetailInvoice]    = useState(null);
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [syncing, setSyncing] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [invoiceSplits, setInvoiceSplits] = useState(initialInvoiceSplits);
  const [invoiceMediaByInvoice, setInvoiceMediaByInvoice] = useState({});
  const [paymentPlan, setPaymentPlan] = useState(
    initialPaymentPlan.map(item => ({ ...item, files: item.payment_item_files || [] }))
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [uploadingItemIds, setUploadingItemIds] = useState(new Set());
  const [shareTokens, setShareTokens] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  // Pre-fetch invoice media for all invoices in this project
  React.useEffect(() => {
    fetch(`/api/projects/${project.id}/invoice-media`)
      .then(r => r.ok ? r.json() : { media: [] })
      .then(d => {
        const byInvoice = {};
        for (const m of d.media || []) {
          if (!byInvoice[m.invoice_id]) byInvoice[m.invoice_id] = [];
          byInvoice[m.invoice_id].push(m);
        }
        setInvoiceMediaByInvoice(byInvoice);
      })
      .catch(() => {});
  }, [project.id]);

  const handleMediaAdded = (invoiceId, media) =>
    setInvoiceMediaByInvoice(prev => ({ ...prev, [invoiceId]: [...(prev[invoiceId] || []), media] }));
  const handleMediaDeleted = (invoiceId, mediaId) =>
    setInvoiceMediaByInvoice(prev => ({ ...prev, [invoiceId]: (prev[invoiceId] || []).filter(m => m.id !== mediaId) }));

  // Pre-fetch diary entries on mount so the napló tab is instant, same as invoices/labour.
  React.useEffect(() => {
    if (!project?.id || diaryEntriesByProject[project.id]) return;
    setDiaryLoading(true);
    fetchDiaryEntries(project.id).catch(() => {}).finally(() => setDiaryLoading(false));
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load share tokens on mount (sections are always visible now).
  React.useEffect(() => {
    if (canManageProject && project && shareTokens.length === 0 && !shareLoading) {
      setShareLoading(true);
      fetch(`/api/diary/share?project_id=${project.id}`)
        .then(r => r.json())
        .then(d => { if (d.tokens) setShareTokens(d.tokens); })
        .catch(() => {})
        .finally(() => setShareLoading(false));
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectMemberUsers = React.useMemo(() => {
    // Collective projects: all active collective members are participants regardless of project_members rows
    if (project.collective_id) return initialUsers;
    // Personal projects: only those explicitly in project_members
    return initialUsers.filter(u => (project.members || []).includes(u.id));
  }, [initialUsers, project]);
  // Prefer live context data (updated immediately on create/edit/delete) over server-side props
  const liveLabour   = React.useMemo(() => ctxLabourEntries?.filter(e => e.project_id === project.id) ?? initialLabourEntries, [ctxLabourEntries, project.id, initialLabourEntries]);
  const liveInvoices = React.useMemo(() => ctxInvoices?.filter(i => i.project_id === project.id)     ?? initialInvoices,      [ctxInvoices,      project.id, initialInvoices]);

  const fin = React.useMemo(
    () => calculateProjectFinancials(project, liveInvoices, liveLabour, projectMemberUsers, currentUser?.id),
    [project, liveInvoices, liveLabour, projectMemberUsers, currentUser]
  );

  const filteredInvoices = fin.projectInvoices.filter(inv => {
    if (inv.category === 'labour') return false; // shown in Labour tab only
    if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
    if (uploaderFilter !== 'ALL' && inv.uploaded_by !== uploaderFilter) return false;
    if (roomFilter !== 'ALL') {
      if (roomFilter === 'GENERAL') {
        const hasSplits = invoiceSplits.some(s => s.invoice_id === inv.id);
        if (hasSplits || inv.room_id) return false;
      } else {
        const hasSplit = invoiceSplits.some(s => s.invoice_id === inv.id && s.room_id === roomFilter);
        if (!hasSplit && inv.room_id !== roomFilter) return false;
      }
    }
    if (tabSearch.trim()) {
      const q            = tabSearch.trim().toLowerCase();
      const cLabel       = catLabel(inv.category);
      const uploaderName = initialUsers.find(u => u.id === inv.uploaded_by)?.display_name || '';
      if (!(inv.description?.toLowerCase().includes(q) || cLabel.toLowerCase().includes(q) || uploaderName.toLowerCase().includes(q))) return false;
    }
    return true;
  });


  const isDocLocked      = !!project.locked_reason;
  const isKollektivOwner = collectives?.some(c => c.collective_id === project.collective_id && (c.role === 'owner' || c.role === 'admin'));
  const canManageProject = !isDocLocked && (isKollektivOwner || project.created_by === currentUser?.id || project.owner_id === currentUser?.id);

  const [statusReasonModal, setStatusReasonModal] = useState({ open: false, status: null, title: '', prompt: '', reason: '' });
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsRef = React.useRef(null);
  React.useEffect(() => {
    if (!showOptionsMenu) return;
    const handler = (e) => { if (optionsRef.current && !optionsRef.current.contains(e.target)) setShowOptionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOptionsMenu]);

  const handleDeleteProject = () => {
    setConfirmModal({
      message: t('deleteConfirm', { name: project.name }),
      onConfirm: async () => {
        try {
          await ctxDeleteProject(project.id);
          router.push(`${navPrefix}/projektek`);
        } catch (err) {
          setAlertModal({ message: err.message || t('deleteError') });
        }
      }
    });
  };

  const projectStatus = (ctxProjects?.find(p => p.id === project.id)?.status) || project.status || 'active';
  const isClosed      = projectStatus === 'closed';
  const isOwner       = project.owner_id === currentUser?.id || project.created_by === currentUser?.id;

  const STATUS_LABELS = { active: t('statusActive'), paused: t('statusPausedFull'), closed: t('statusClosed') };
  const STATUS_NEXT = [
    { key: 'active', label: t('statusSetActive'), show: projectStatus !== 'active' },
    { key: 'paused', label: t('statusSetPaused'),  show: projectStatus !== 'paused' },
    { key: 'closed', label: t('statusSetClosed'),  show: projectStatus !== 'closed' },
  ];

  const STATUS_REASON_META = {
    paused: { title: t('statusPausedTitle'), prompt: t('statusPausedPrompt'), btnColor: '#ea580c' },
    closed: { title: t('statusClosedTitle'), prompt: t('statusClosedPrompt'), btnColor: '#475569' },
    active: {
      title:    projectStatus === 'closed' ? t('statusReopenTitle')   : t('statusContinueTitle'),
      prompt:   projectStatus === 'closed' ? t('statusReopenPrompt') : t('statusContinuePrompt'),
      btnColor: '#16a34a',
    },
  };

  const handleSetStatus = (newStatus) => {
    const meta = STATUS_REASON_META[newStatus];
    setStatusReasonModal({ open: true, status: newStatus, title: meta.title, prompt: meta.prompt, reason: '' });
  };

  const handleStatusReasonSubmit = async () => {
    const { status: newStatus, reason } = statusReasonModal;
    if (!reason.trim()) return;
    const extra = newStatus === 'closed' ? { closed_at: new Date().toISOString() } : newStatus === 'active' ? { closed_at: null } : {};
    try {
      await updateProject(project.id, { status: newStatus, status_reason: reason.trim() || null, ...extra });
      setStatusReasonModal({ open: false, status: null, title: '', prompt: '', reason: '' });
      setToast(t('statusChanged', { label: STATUS_LABELS[newStatus] }));
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message || t('saveError') });
    }
  };

  const openHistory = async () => {
    setShowHistoryModal(true);
    if (history !== null) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/history?limit=15&offset=0`);
      if (!res.ok) { setHistory([]); return; }
      const data = await res.json();
      setHistory(data.history || []);
      setHistoryTotal(data.total || 0);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  const loadMoreHistory = async () => {
    if (!history || historyLoadingMore) return;
    setHistoryLoadingMore(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/history?limit=15&offset=${history.length}`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(prev => [...(prev || []), ...(data.history || [])]);
      setHistoryTotal(data.total || 0);
    } catch {} finally { setHistoryLoadingMore(false); }
  };

  const handleDeleteInvoice = (invId) => {
    setConfirmModal({
      message: t('deleteInvoiceConfirm'),
      onConfirm: async () => {
        try { await ctxDeleteInvoice(invId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || t('deleteError') }); }
      }
    });
  };

  const handleDeleteLabour = (entryId) => {
    setConfirmModal({
      message: t('deleteLabourConfirm'),
      onConfirm: async () => {
        try {
          await ctxDeleteLabourEntry(entryId);
          setToast(t('labourDeleted'));
          setTimeout(() => setToast(''), 2500);
        }
        catch (err) { setAlertModal({ message: err.message || t('deleteError') }); }
      }
    });
  };

  const handleSaveInvoice = async (invoiceId, fields) => {
    await ctxUpdateInvoice(invoiceId, fields);
  };

  const handleSaveSplits = async (invoiceId, splits) => {
    const res = await fetch('/api/invoice-splits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: invoiceId, splits }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('splitError'));
    setInvoiceSplits(prev => [
      ...prev.filter(s => s.invoice_id !== invoiceId),
      ...(data.splits || []),
    ]);
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setTokenSaving(true);
    try {
      const res = await fetch('/api/diary/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: project.id, label: newTokenLabel.trim() || null, expires_at: newTokenExpiry || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('saveError'));
      setShareTokens(prev => [data.token, ...prev]);
      setNewTokenLabel(''); setNewTokenExpiry('');
      setShowNewTokenModal(false);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setTokenSaving(false);
    }
  };

  const handleDeleteToken = (token) => {
    setConfirmModal({
      message: t('deleteShareLinkConfirm', { label: token.label || t('unnamedLink') }),
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/diary/share/${token.id}`, { method: 'DELETE' });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Hiba'); }
          setShareTokens(prev => prev.filter(t => t.id !== token.id));
        } catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/p/${token.token}`;
    navigator.clipboard.writeText(url).then(() => { setCopiedTokenId(token.id); setTimeout(() => setCopiedTokenId(null), 2000); });
  };


  // One-time room import on first load for projects with a linked quote but no rooms yet
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (syncedRef.current || projectRooms.length > 0) return;
    const linkedQuote = (quotes || []).find(q => q.project_id === project.id);
    if (!linkedQuote) return;
    syncedRef.current = true;
    syncRoomsFromQuote(project.id).catch(() => {});
  }, [project.id, projectRooms.length, quotes]);

  // Mobile pods early return — all hooks above
  if (isMobile) return <ProjectDetailMobile projectId={project.id} />;

  // Desktop-only computed values
  const wsStyle = activeCollectiveId
    ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
    : {};
  const quoteTotal = projectRooms.reduce((s, r) => s + Number(r.quoted_amount_net || 0), 0);
  const totalSpend = fin.totalCost + fin.totalLabourValue;
  const remaining  = quoteTotal - totalSpend;
  const progress   = quoteTotal > 0 ? Math.round((totalSpend / quoteTotal) * 100) : null;

  // Room management
  const linkedQuoteForRooms = (quotes || []).find(q => q.project_id === project.id);
  const unimportedSections = linkedQuoteForRooms
    ? (quoteSections || []).filter(s => s.quote_id === linkedQuoteForRooms.id && !projectRooms.some(r => r.source_section_id === s.id))
    : [];

  const handleSaveRoom = async (fields) => {
    if (editingRoom) {
      await updateProjectRoom(project.id, editingRoom.id, fields);
    } else {
      await createProjectRoom(project.id, { ...fields, sort_order: projectRooms.length });
    }
  };

  const handleDeleteRoom = (room) => {
    const invoiceCount = liveInvoices.filter(inv => inv.room_id === room.id).length
      + liveLabour.filter(le => le.room_id === room.id).length;
    const message = invoiceCount > 0
      ? t('deleteRoomWithItemsConfirm', { name: room.name, count: invoiceCount })
      : t('deleteRoomConfirm', { name: room.name });
    setConfirmModal({
      message,
      onConfirm: async () => {
        try {
          await deleteProjectRoom(project.id, room.id);
          setToast(t('roomDeleted'));
          setTimeout(() => setToast(''), 2500);
        } catch (err) { setAlertModal({ message: err.message }); }
        setConfirmModal(null);
      },
    });
  };

  const handleSyncRooms = async () => {
    setSyncing(true);
    try { await syncRoomsFromQuote(project.id); } catch (err) { setAlertModal({ message: err.message }); } finally { setSyncing(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  const [openSections, setOpenSections] = useState({ expenses: true, diary: false, payment: false, portal: false });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleCreatePayment = async (fields) => {
    const res = await fetch('/api/payment-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: project.id, ...fields }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('saveError'));
    setPaymentPlan(prev => [...prev, { ...data.item, files: [] }]);
    setToast(t('paymentItemAdded'));
    setTimeout(() => setToast(''), 2500);
  };

  const handleUpdatePayment = async (itemId, fields) => {
    const res = await fetch(`/api/payment-plan/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('saveError'));
    setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...data.item, files: i.files || [] } : i));
  };

  const handleDeletePayment = (item) => {
    setConfirmModal({
      message: t('deletePaymentConfirm', { name: item.label }),
      onConfirm: async () => {
        const res = await fetch(`/api/payment-plan/${item.id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); setAlertModal({ message: d.error }); return; }
        setPaymentPlan(prev => prev.filter(i => i.id !== item.id));
        setToast(t('paymentItemDeleted'));
        setTimeout(() => setToast(''), 2500);
      },
    });
  };

  return (
    <div className="dk-page dk-mod-projects" style={wsStyle}>
      {/* ── Module header ─────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        {/* Back button — left of title, same pattern as /ajanlatok/[id] */}
        <AppLink
          href={currentUser?.role === 'superadmin' ? '/superadmin/projektek' : `${navPrefix}/projektek`}
          className="dk-btn dk-btn-g"
          aria-label={t('back')}
          style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </AppLink>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">
            {t('detailKicker')}{client ? ` · ${client.name}` : ''}
          </span>
          <h1 className="dk-h1">{project.name}</h1>
        </div>
        {/* "..." context menu trigger */}
        <button
          type="button"
          className="dk-btn dk-btn-w"
          style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}
          onClick={() => setShowOptionsMenu(true)}
          aria-label={t('optionsAria')}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="dk-body">
        {contextSwitching ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="dk-ws-spinner" />
          </div>
        ) : (
          <>
            <CollectiveBanner documentCollectiveId={project.collective_id ?? null} />
            {isDocLocked && !lockedModalOpen && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)', fontWeight: 600, flex: 1 }}>{t('readOnly')}</span>
                <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                  {t('myOptions')}
                </button>
              </div>
            )}
            {successMsg && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CheckCircle2 size={16} aria-hidden="true" /><span>{successMsg}</span>
              </div>
            )}

            {/* Two-panel layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* ── Main panel ─────────────────────────────────────────────── */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* 4-stat strip */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div className="dk-card" style={{ flex: 1, padding: '14px 18px' }}>
                    <span className="dk-m">{t('statQuote')}</span><br />
                    <span className="dk-n" style={{ fontSize: 26, color: 'var(--color-text, #0E1116)' }}>
                      {quoteTotal > 0 ? fmtMoney(quoteTotal) : '—'}
                    </span>
                  </div>
                  <div className="dk-card" style={{ flex: 1, padding: '14px 18px' }}>
                    <span className="dk-m">{t('statSpent')}</span><br />
                    <span className="dk-n" style={{ fontSize: 26, color: 'var(--color-text, #0E1116)' }}>{fmtMoney(totalSpend)}</span>
                  </div>
                  <div className="dk-card" style={{ flex: 1, padding: '14px 18px' }}>
                    <span className="dk-m">{t('statRemaining')}</span><br />
                    <span className="dk-n" style={{ fontSize: 26, color: 'var(--color-text, #0E1116)' }}>
                      {quoteTotal > 0 ? fmtMoney(remaining) : '—'}
                    </span>
                  </div>
                  <div className="dk-card" style={{ flex: 1, padding: '14px 18px' }}>
                    <span className="dk-m">{t('statProgress')}</span><br />
                    <span className="dk-n" style={{ fontSize: 26, color: progress !== null && progress > 95 ? '#B71C1C' : '#263248' }}>
                      {progress !== null ? `${progress}%` : '—'}
                    </span>
                  </div>
                </div>

      {/* Info row: client + members */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 12 }}>
        {/* Megrendelő */}
        <div className="dk-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <BookUser size={12} /> {t('clientCardTitle')}
          </span>
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116' }}>{client.name}</div>
              {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#5A5F68' }}><Phone size={12} />{client.phone}</div>}
              {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#5A5F68' }}><Mail size={12} />{client.email}</div>}
              {client.address && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#5A5F68' }}><MapPin size={12} />{client.address}</div>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#5A5F68', fontStyle: 'italic' }}>{t('noClient')}</div>
          )}
        </div>

        {/* Résztvevők */}
        {(activeCollectiveId || projectMemberUsers.length > 0) && (
          <div className="dk-card" style={{ padding: '14px 18px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <Users size={12} /> {t('membersCardTitle')}
            </span>
            {projectMemberUsers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projectMemberUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#263248', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {u.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: u.id === currentUser?.id ? '#263248' : '#0E1116' }}>
                      {u.display_name}{u.id === currentUser?.id ? ` ${t('youSuffix')}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#5A5F68', fontStyle: 'italic' }}>{t('noMembers')}</div>
            )}
          </div>
        )}
      </div>

      {/* Chart row: bar chart (40%) + burndown (60%) — hidden on mobile until there is cost */}
      {(!isMobile || fin.totalCost > 0 || fin.totalLabourValue > 0) && (
      <>
        <h2 style={{ margin: '8px 0 10px', fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
          {t('headlineCostOverview')}
        </h2>
      <div className="grid-chart" style={{ marginBottom: 0 }}>
        <CostBreakdownCard
          invoices={fin.projectInvoices}
          labourTotal={fin.totalLabourValue}
        />
        <BurndownCard
          invoices={fin.projectInvoices}
          labourEntries={fin.projectLabour}
          projectRooms={projectRooms}
          startDate={project.start_date}
          endDate={project.end_date}
        />
      </div>
      </>
      )}

      {/* Sections */}
      {(() => {
        // Invoices that have splits — their cost is tracked via splits, not room_id
        const invoicesWithSplits = new Set(invoiceSplits.map(s => s.invoice_id));
        // Split totals per room
        const splitTotalByRoom = {};
        for (const s of invoiceSplits) {
          splitTotalByRoom[s.room_id] = (splitTotalByRoom[s.room_id] || 0) + Number(s.amount_huf);
        }
        const invoicesByRoom = {};
        const labourByRoom = {};
        for (const inv of fin.projectInvoices) {
          if (invoicesWithSplits.has(inv.id)) continue; // handled via splits
          const key = inv.room_id || 'general';
          invoicesByRoom[key] = (invoicesByRoom[key] || []);
          invoicesByRoom[key].push(inv);
        }
        for (const lab of fin.projectLabour) {
          const key = lab.room_id || 'general';
          labourByRoom[key] = (labourByRoom[key] || []);
          labourByRoom[key].push(lab);
        }
        const roomCost = (roomId) => {
          const invTotal = (invoicesByRoom[roomId] || []).reduce((s, i) => s + Number(i.value_huf || 0), 0);
          const splitTotal = splitTotalByRoom[roomId] || 0;
          const labTotal = (labourByRoom[roomId] || []).reduce((s, l) => s + Number(l.value_huf || 0), 0);
          return invTotal + splitTotal + labTotal;
        };
        return (
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('headlineSections')}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0 }}>{projectRooms.length + 1}</span>
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {unimportedSections.length > 0 && (
                  <button type="button" className="dk-btn dk-btn-g" style={{ height: 34, fontSize: 13, padding: '0 12px' }} onClick={handleSyncRooms} disabled={syncing}>
                    {syncing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                    {t('importBtn', { count: unimportedSections.length })}
                  </button>
                )}
                <button type="button" onClick={() => { setEditingRoom(null); setRoomModalOpen(true); }} className="dk-btn dk-btn-w" style={{ height: 34, fontSize: 13, padding: '0 12px' }} aria-label={t('newSectionAria')}>
                  <Plus size={14} /> {t('newSectionAria')}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
              {/* General section — always visible */}
              {(() => {
                const genInv = invoicesByRoom['general']?.length || 0;
                const genLab = labourByRoom['general']?.length || 0;
                return (
                  <div className="dk-card" style={{ padding: '14px 16px' }}>
                    <span className="dk-m">{t('general')}</span>
                    <div className="dk-n" style={{ fontSize: 20, marginTop: 2 }}>
                      {roomCost('general') > 0 ? fmtMoney(roomCost('general')) : '—'}
                    </div>
                    {(genInv > 0 || genLab > 0) && (
                      <div style={{ fontSize: 12, color: '#5A5F68', marginTop: 4, display: 'flex', gap: 6 }}>
                        {genInv > 0 && <span>{t('invoiceCount', { count: genInv })}</span>}
                        {genLab > 0 && <span>{t('labourCount', { count: genLab })}</span>}
                      </div>
                    )}
                  </div>
                );
              })()}
              {projectRooms.map(room => {
                const actual    = roomCost(room.id);
                const quoted    = room.quoted_amount_net;
                const invCount  = (invoicesByRoom[room.id] || []).length;
                const labCount  = (labourByRoom[room.id] || []).length;
                const overBudget = quoted != null && actual > quoted;
                return (
                  <button key={room.id} type="button" onClick={() => { setEditingRoom(room); setRoomModalOpen(true); }}
                    className="dk-card"
                    style={{ padding: '14px 16px', textAlign: 'left', border: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', width: '100%' }}
                  >
                    <span className="dk-m">{room.name}{room.size_m2 != null ? ` · ${room.size_m2} m²` : ''}</span>
                    <div className="dk-n" style={{ fontSize: 20, marginTop: 2 }}>
                      {actual > 0 ? fmtMoney(actual) : '—'}
                    </div>
                    {quoted != null && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: overBudget ? '#ef4444' : '#16a34a', marginTop: 2 }}>
                        {actual > 0 ? (overBudget ? '↑ ' : '↓ ') : ''}{t('planned')} {fmtMoney(quoted)}
                      </div>
                    )}
                    {(invCount > 0 || labCount > 0) && (
                      <div style={{ fontSize: 12, color: '#5A5F68', marginTop: 4, display: 'flex', gap: 6 }}>
                        {invCount > 0 && <span>{t('invoiceCount', { count: invCount })}</span>}
                        {labCount > 0 && <span>{t('labourCount', { count: labCount })}</span>}
                      </div>
                    )}
                    {room.work_types && room.work_types.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                        {room.work_types.map(wt => (
                          <span key={wt} style={{ fontSize: 11, fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999, background: '#F0F0F2', color: '#5A5F68' }}>{wt}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Linked survey */}
      {project.survey_id && (() => {
        const linkedSurvey = (surveys || []).find(s => s.id === project.survey_id);
        if (!linkedSurvey) return null;
        return (
          <div className="dk-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ruler size={15} color="var(--accent)" />
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('linkedSurveyLabel')}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{linkedSurvey.title}</div>
              </div>
            </div>
            <AppLink href={`${navPrefix}/felmeres/${linkedSurvey.id}`} className="btn btn-secondary btn-sm"><Ruler size={13} /> {t('viewBtn')}</AppLink>
          </div>
        );
      })()}

      {/* Linked quote */}
      {(() => {
        const linkedQuote = (quotes || []).find(q => q.project_id === project.id);
        if (!linkedQuote) return null;
        const entries = (quoteEntries || []).filter(e => e.quote_id === linkedQuote.id);
        const netTotal = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
        const taxRate = Number(linkedQuote.tax_percent ?? 27);
        const grossTotal = netTotal + Math.round(netTotal * taxRate / 100);
        const sc = { draft: 'var(--text-muted)', sent: 'var(--warning-text)', accepted: 'var(--success-text)', rejected: 'var(--danger-text)' };
        const QUOTE_STATUS_LABELS = { draft: t('quoteDraft'), sent: t('quoteSent'), accepted: t('quoteAccepted'), rejected: t('quoteRejected') };
        return (
          <div className="dk-card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{t('linkedQuoteLabel')}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {linkedQuote.title}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: sc[linkedQuote.status] || 'var(--text-muted)' }}>
                      {QUOTE_STATUS_LABELS[linkedQuote.status] || linkedQuote.status}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {t('grossLabel')} <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtMoney(grossTotal)}</span>
                  </div>
                </div>
              </div>
              <AppLink href={`${navPrefix}/ajanlatok/${linkedQuote.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                <FileText size={13} /> {t('viewBtn')}
              </AppLink>
            </div>
          </div>
        );
      })()}

      {/* Per-member contribution cards — collective or multi-member project */}
      {(project.collective_id || activeCollectiveId) && fin.memberBreakdown.length > 0 && (
        <div className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{t('memberContributionsTitle')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.75rem' }}>
            {fin.memberBreakdown.map(member => {
              const memberInvoices = fin.projectInvoices.filter(inv => inv.uploaded_by === member.userId);
              const memberLabour   = fin.projectLabour.filter(e => e.uploaded_by === member.userId);
              const total = member.paid + member.labourValue;
              const isSelf         = member.userId === currentUser?.id;
              const memberUser     = projectMemberUsers.find(u => u.id === member.userId);
              const isCollectiveOwner = memberUser?.collective_role === 'owner';

              const memberAccent = isCollectiveOwner ? '#7c3aed' : isSelf ? '#2563eb' : '#0f766e';
              const memberShadowRgb = isCollectiveOwner ? '124,58,237' : isSelf ? '37,99,235' : '15,118,110';

              return (
                <div key={member.userId} className="dk-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{member.displayName}</span>
                      {isCollectiveOwner && <span style={{ fontSize: '0.65rem', color: '#7c3aed', background: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>{t('ownerBadge')}</span>}
                      {isSelf && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>{t('youBadge')}</span>}
                      {member.deletedAt && <span style={{ fontSize: '0.65rem', color: '#fff', background: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>{t('leftBadge')}</span>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{fmtMoney(total)}</span>
                  </div>

                  {/* Invoices */}
                  {memberInvoices.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Receipt size={11} /> {t('invoiceCountData')}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>{fmtMoney(member.paid)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberInvoices.map(inv => (
                          <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{inv.description || inv.category}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem' }}>{fmtMoney(inv.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Labour */}
                  {memberLabour.length > 0 && (
                    <div style={{ borderTop: memberInvoices.length > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: memberInvoices.length > 0 ? '0.65rem' : 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Hammer size={11} /> {t('labourFeeLabel')}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success-text)', fontWeight: 700 }}>+{fmtMoney(member.labourValue)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberLabour.map(e => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {e.labour_type}{e.hours ? ` · ${e.hours} ${e.unit || 'h'}` : ''}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem', color: 'var(--success-text)' }}>+{fmtMoney(e.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {memberInvoices.length === 0 && memberLabour.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{t('noMemberItems')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pod sections — gap: 20 between pods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ══════════════════════════════════════════════
          KIADÁSOK POD — single unified card
          ══════════════════════════════════════════════ */}
      <div className="dk-card" style={{ overflow: 'hidden' }}>
        {/* Header row — full row is the toggle */}
        <div
          style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, cursor: 'pointer', userSelect: 'none' }}
          role="button" tabIndex={0}
          onClick={() => toggleSection('expenses')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection('expenses'); }}
        >
          <ChevronDown size={18} color="#5A5F68" aria-hidden="true" style={{ flexShrink: 0, transform: openSections.expenses ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
          <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E1116' }}>{t('headlineExpenses')}</span>
          <span className="dk-badge">{fin.projectInvoices.filter(i => i.category !== 'labour').length + fin.projectLabour.length + fin.projectInvoices.filter(i => i.category === 'labour').length}</span>
          <span style={{ flex: 1 }} />
          {canManageProject && openSections.expenses && (
            <button type="button" className="dk-btn" style={{ height: 36, fontSize: 13, padding: '0 12px', flexShrink: 0, background: '#263248', color: '#fff' }} onClick={e => { e.stopPropagation(); setNewExpenseOpen(true); }}>
              <Plus size={14} /> {t('newExpenseBtn')}
            </button>
          )}
        </div>

        {openSections.expenses && (
          <>
            {/* Inner type tabs + filter row */}
            <div style={{ padding: '10px 18px', borderTop: '1px solid #EDEBE5', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#FAFAFA' }}>
              {/* 2-pill switcher */}
              <div style={{ display: 'flex', gap: 3, background: '#EDEBE5', padding: 3, borderRadius: 24, flexShrink: 0 }}>
                {[
                  { key: 'invoices', label: t('tabExpenses', { count: fin.projectInvoices.filter(i => i.category !== 'labour').length }) },
                  { key: 'labour',   label: t('tabLabour',   { count: fin.projectLabour.length + fin.projectInvoices.filter(i => i.category === 'labour').length }) },
                ].map(tab => {
                  const isActive = activeExpenseTab === tab.key;
                  return (
                    <button key={tab.key} type="button" onClick={() => handleExpenseTabChange(tab.key)} style={{
                      height: 34, padding: '0 16px', border: 0, borderRadius: 20,
                      background: isActive ? '#0E1116' : 'transparent',
                      color: isActive ? '#fff' : '#5A5F68',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {/* filters — only for invoices tab */}
              {activeExpenseTab === 'invoices' && (
                <>
                  <input type="text" className="dk-input" placeholder={t('searchExpenses')} value={tabSearch} onChange={e => setTabSearch(e.target.value)} style={{ flex: 1, minWidth: 140, height: 36 }} />
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="dk-input" style={{ width: 150, height: 36 }}>
                    <option value="ALL">{t('allCategories')}</option>
                    {INVOICE_CATEGORIES.filter(c => c.id !== 'labour').map(c => <option key={c.id} value={c.id}>{catLabel(c.id)}</option>)}
                  </select>
                  {projectRooms.length > 0 && (
                    <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="dk-input" style={{ width: 140, height: 36 }}>
                      <option value="ALL">{t('allSections')}</option>
                      <option value="GENERAL">{t('general')}</option>
                      {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                  {projectMemberUsers.length > 1 && (
                    <select value={uploaderFilter} onChange={e => setUploaderFilter(e.target.value)} className="dk-input" style={{ width: 140, height: 36 }}>
                      <option value="ALL">{t('allUploaders')}</option>
                      {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                    </select>
                  )}
                </>
              )}
              {activeExpenseTab === 'labour' && (
                <input type="text" className="dk-input" placeholder={t('searchExpenses')} value={tabSearch} onChange={e => setTabSearch(e.target.value)} style={{ flex: 1, minWidth: 200, height: 36 }} />
              )}
            </div>

            {/* Invoice table */}
            {activeExpenseTab === 'invoices' && (filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#5A5F68' }}>
                <Receipt size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', marginBottom: 4 }}>{t('noExpensesTitle')}</div>
                <div style={{ fontSize: 13 }}>{t('noExpensesText')}</div>
              </div>
            ) : (
              <>
                <div className="dk-th" style={{ gridTemplateColumns: activeCollectiveId ? '100px 1fr 110px 90px 100px 90px' : '100px 1fr 110px 90px 90px', borderTop: '1px solid #EDEBE5' }}>
                  <span>{t('thCategory')}</span>
                  <span>{t('thDesc')}</span>
                  <span>{t('thSection')}</span>
                  <span>{t('thType')}</span>
                  {activeCollectiveId && <span>{t('thUploader')}</span>}
                  <span>{t('thAmount')}</span>
                </div>
                {filteredInvoices.map(inv => {
                  const cLabel = catLabel(inv.category);
                  const room   = projectRooms.find(r => r.id === inv.room_id);
                  const uploader  = initialUsers.find(u => u.id === inv.uploaded_by);
                  const uploaderLabel = inv.uploaded_by === currentUser?.id ? t('youSuffix') : (uploader?.display_name || '—');
                  const hasReceipt = !!(inv.image_url || inv.has_media);
                  return (
                    <button key={inv.id} type="button" className="dk-tr dk-sr" style={{ display: 'grid', gridTemplateColumns: activeCollectiveId ? '100px 1fr 110px 90px 100px 90px' : '100px 1fr 110px 90px 90px', cursor: 'pointer' }} onClick={() => setDetailInvoice(inv)}>
                      <span style={{ minWidth: 0 }}><span className="dk-badge">{cLabel}</span></span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>{inv.description || cLabel}</b></span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room?.name || t('general')}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="dk-badge" style={hasReceipt ? { background: '#E7F4EC', color: '#14532D' } : { background: '#F0F0F2', color: '#5A5F68' }}>
                          {hasReceipt ? t('typeInvoice') : t('typeManual')}
                        </span>
                      </span>
                      {activeCollectiveId && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploaderLabel}</span>}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: 'var(--dk-c, #263248)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {fmtMoney(Number(inv.value_huf || 0))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            ))}

            {/* Labour table */}
            {activeExpenseTab === 'labour' && (() => {
              const q = tabSearch.trim().toLowerCase();
              const labourInvoices = fin.projectInvoices.filter(inv => inv.category === 'labour' && (!q || inv.description?.toLowerCase().includes(q)));
              const labourEntries  = fin.projectLabour.filter(le => !q || (le.labour_type || le.description || '').toLowerCase().includes(q));
              const hasAny = labourEntries.length > 0 || labourInvoices.length > 0;
              const cols = activeCollectiveId ? '90px 1fr 110px 90px 100px 90px' : '90px 1fr 110px 90px 90px';
              return !hasAny ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#5A5F68' }}>
                  <Hammer size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} aria-hidden="true" />
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', marginBottom: 4 }}>{t('noExpensesTitle')}</div>
                </div>
              ) : (
                <>
                  <div className="dk-th" style={{ gridTemplateColumns: cols, borderTop: '1px solid #EDEBE5' }}>
                    <span>{t('thCategory')}</span><span>{t('thDesc')}</span><span>{t('thSection')}</span><span>{t('thType')}</span>
                    {activeCollectiveId && <span>{t('thUploader')}</span>}
                    <span>{t('thAmount')}</span>
                  </div>
                  {labourEntries.map(le => {
                    const hours = Number(le.hours || 0);
                    const rate  = Number(le.unit_price || le.hourly_rate || 0);
                    const qty   = `${hours} ${le.unit || 'h'}${rate ? ` × ${fmtMoney(rate)}` : ''}`;
                    const uploaderLabel = le.uploaded_by === currentUser?.id ? t('youSuffix') : (initialUsers.find(u => u.id === le.uploaded_by)?.display_name || '—');
                    const room = projectRooms.find(r => r.id === le.room_id);
                    return (
                      <div key={le.id} className="dk-tr" style={{ display: 'grid', gridTemplateColumns: cols }}>
                        <span style={{ minWidth: 0 }}><span className="dk-badge">{catLabel('labour')}</span></span>
                        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                            <b>{le.labour_type || le.description || '—'}</b>
                            {qty ? <span style={{ color: '#5A5F68', fontWeight: 400, marginLeft: 6 }}>{qty}</span> : null}
                          </span>
                        </span>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#5A5F68' }}>{room?.name || t('general')}</span>
                        <span style={{ minWidth: 0 }}><span className="dk-badge">{t('typeManual')}</span></span>
                        {activeCollectiveId && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{uploaderLabel}</span>}
                        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ flexShrink: 0, height: 24, padding: '0 10px', borderRadius: 12, background: 'var(--dk-c, #263248)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            {fmtMoney(Number(le.value_huf || 0))}
                          </span>
                          {(canManageProject || le.uploaded_by === currentUser?.id) && (
                            <button type="button" onClick={() => setEditingLabour(le)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8F98', padding: 2, display: 'flex', flexShrink: 0 }}>
                              <PencilLine size={15} aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {labourInvoices.map(inv => {
                    const uploaderLabel = inv.uploaded_by === currentUser?.id ? t('youSuffix') : (initialUsers.find(u => u.id === inv.uploaded_by)?.display_name || '—');
                    const room = projectRooms.find(r => r.id === inv.room_id);
                    return (
                      <button key={inv.id} type="button" className="dk-tr dk-sr" style={{ display: 'grid', gridTemplateColumns: cols, cursor: 'pointer' }} onClick={() => setDetailInvoice(inv)}>
                        <span style={{ minWidth: 0 }}><span className="dk-badge">{catLabel('labour')}</span></span>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>{inv.description || '—'}</b></span>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#5A5F68' }}>{room?.name || t('general')}</span>
                        <span style={{ minWidth: 0 }}><span className="dk-badge" style={{ background: '#E7F4EC', color: '#14532D' }}>{t('typeInvoice')}</span></span>
                        {activeCollectiveId && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{uploaderLabel}</span>}
                        <span style={{ minWidth: 0 }}>
                          <span style={{ flexShrink: 0, height: 24, padding: '0 10px', borderRadius: 12, background: 'var(--dk-c, #263248)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            {fmtMoney(Number(inv.value_huf || 0))}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          NAPLÓ POD — single unified card
          ══════════════════════════════════════════════ */}
      <div className="dk-card" style={{ overflow: 'hidden' }}>
        {/* Header row — full row is the toggle */}
        <div
          style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, cursor: 'pointer', userSelect: 'none' }}
          role="button" tabIndex={0}
          onClick={() => toggleSection('diary')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection('diary'); }}
        >
          <ChevronDown size={18} color="#5A5F68" aria-hidden="true" style={{ flexShrink: 0, transform: openSections.diary ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
          <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E1116' }}>{t('headlineDiary')}</span>
          <span className="dk-badge">{diaryEntriesByProject[project.id]?.length ?? initialDiaryCount}</span>
          <span style={{ flex: 1 }} />
          {openSections.diary && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button" className="dk-btn dk-btn-l" style={{ height: 36, fontSize: 13, padding: '0 12px' }}
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/naplo/${project.id}`).then(() => { setToast(t('clientLinkCopied')); setTimeout(() => setToast(''), 2500); }); }}
              >
                <Copy size={13} /> {t('clientLinkBtn')}
              </button>
              <button type="button" className="dk-btn" style={{ height: 36, fontSize: 13, padding: '0 12px', background: '#263248', color: '#fff' }} onClick={e => { e.stopPropagation(); setShowQuickDiarySheet(true); }}>
                <Plus size={14} /> {t('addNewEntryBtn')}
              </button>
            </div>
          )}
        </div>

        {openSections.diary && (diaryLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#5A5F68', borderTop: '1px solid #EDEBE5' }}>{t('loadingText')}</div>
        ) : !diaryEntriesByProject[project.id] || diaryEntriesByProject[project.id].length === 0 ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderTop: '1px solid #EDEBE5' }}>
            <BookOpen size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', marginBottom: 4 }}>{t('noDiaryTitle')}</div>
            <div style={{ fontSize: 13, color: '#5A5F68', marginBottom: 16 }}>{t('noDiaryText')}</div>
            <button type="button" onClick={() => setShowQuickDiarySheet(true)} className="dk-btn dk-btn-dark" style={{ height: 40, fontSize: 13, margin: '0 auto' }}>
              <Plus size={15} /> {t('firstEntryBtn')}
            </button>
          </div>
        ) : (() => {
          const diaryEntries = diaryEntriesByProject[project.id] || [];
          const diaryCols = activeCollectiveId ? '56px 1fr 130px 120px 100px 90px' : '56px 1fr 130px 120px 90px';
          return (
            <>
              <div className="dk-th" style={{ gridTemplateColumns: diaryCols, borderTop: '1px solid #EDEBE5' }}>
                <span /><span>{t('thTitle')}</span><span>{t('thDate')}</span><span>{t('thSection')}</span>
                {activeCollectiveId && <span>{t('thAuthor')}</span>}
                <span>{t('thStatus')}</span>
              </div>
              {diaryEntries.map(entry => {
                const entryDateStr = entry.entry_date
                  ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—';
                const author    = initialUsers.find(u => u.id === entry.created_by);
                const entryRoom = projectRooms.find(r => r.id === entry.room_id);
                return (
                  <button key={entry.id} type="button" onClick={() => setEditingDiaryEntry(entry)}
                    className="dk-tr dk-sr" style={{ display: 'grid', gridTemplateColumns: diaryCols, cursor: 'pointer', padding: '0 16px', minHeight: 60, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#C9CFDB,#9AA3B5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {entry.photos?.length > 0 ? <Camera size={16} color="#fff" /> : <BookOpen size={16} color="#fff" />}
                      </span>
                    </span>
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                      <b style={{ fontSize: 14, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</b>
                      {entry.body && <span style={{ fontSize: 12, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.body}</span>}
                    </span>
                    <span style={{ minWidth: 0, fontSize: 13, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entryDateStr}</span>
                    <span style={{ minWidth: 0, fontSize: 13, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entryRoom?.name || t('general')}</span>
                    {activeCollectiveId && <span style={{ minWidth: 0, fontSize: 13, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author?.display_name || '—'}</span>}
                    <span style={{ minWidth: 0 }}>
                      <span className="dk-badge" style={entry.is_public ? { background: '#E7F4EC', color: '#14532D' } : { background: '#F0F0F2', color: '#2B3038' }}>
                        {entry.is_public ? <><Eye size={11} /> {t('publicBadge')}</> : <><Lock size={11} /> {t('privateBadge')}</>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          );
        })())}
      </div>

      {/* ══════════════════════════════════════════════
          FIZETÉSI TERV POD — single unified card
          ══════════════════════════════════════════════ */}
      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const totalExpected = paymentPlan.reduce((s, i) => s + Number(i.amount_huf || 0), 0);
        const totalPaid     = paymentPlan.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_huf || 0), 0);
        return (
          <div className="dk-card" style={{ overflow: 'hidden' }}>
            {/* Header row — full row is the toggle */}
            <div
              style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, cursor: 'pointer', userSelect: 'none' }}
              role="button" tabIndex={0}
              onClick={() => toggleSection('payment')}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection('payment'); }}
            >
              <ChevronDown size={18} color="#5A5F68" aria-hidden="true" style={{ flexShrink: 0, transform: openSections.payment ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
              <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E1116' }}>{t('headlinePaymentPlan')}</span>
              <span className="dk-badge">{paymentPlan.length}</span>
              {paymentPlan.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68', display: 'flex', gap: 10 }}>
                  <span>{t('expectedLabel')} <strong style={{ fontFamily: 'var(--font-mono)', color: '#0E1116' }}>{totalExpected.toLocaleString('hu-HU')} Ft</strong></span>
                  {totalPaid > 0 && <span style={{ color: '#16a34a' }}>{t('paidSummaryLabel')} <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalPaid.toLocaleString('hu-HU')} Ft</strong></span>}
                </span>
              )}
              <span style={{ flex: 1 }} />
              {canManageProject && openSections.payment && (
                <button type="button" className="dk-btn" style={{ height: 36, fontSize: 13, padding: '0 12px', flexShrink: 0, background: '#263248', color: '#fff' }} onClick={e => { e.stopPropagation(); setEditingPayment(null); setShowPaymentModal(true); }}>
                  <Plus size={14} /> {t('newItemBtn')}
                </button>
              )}
            </div>

            {openSections.payment && (paymentPlan.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderTop: '1px solid #EDEBE5' }}>
                <Wallet size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', marginBottom: 4 }}>{t('noPaymentPlanTitle')}</div>
                <div style={{ fontSize: 13, color: '#5A5F68', marginBottom: 16 }}>{t('noPaymentPlanText')}</div>
                {canManageProject && (
                  <button type="button" className="dk-btn dk-btn-dark" style={{ height: 40, fontSize: 13, margin: '0 auto' }} onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}>
                    <Plus size={15} /> {t('addFirstItemBtn')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="dk-th" style={{ gridTemplateColumns: '1fr 160px 130px 110px', borderTop: '1px solid #EDEBE5' }}>
                  <span>{t('thDesc')}</span><span>{t('thSection')}</span><span>{t('thAmount')}</span><span>{t('asideStatusLabel')}</span>
                </div>
                {paymentPlan.map((item, idx) => {
                  const isOverdue = item.status === 'pending' && item.due_date && item.due_date < today;
                  const statusDisplay = isOverdue ? { labelKey: 'statusOverdue', bg: '#fef2f2', color: '#b91c1c' } : (STATUS_DISPLAY[item.status] || STATUS_DISPLAY.pending);
                  const triggerDisplay = TRIGGER_DISPLAY[item.trigger_type] || TRIGGER_DISPLAY.milestone;
                  const triggerText = item.trigger_type === 'milestone' && item.milestone_name ? item.milestone_name
                    : item.trigger_type === 'date' && item.due_date ? new Date(item.due_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
                    : t(triggerDisplay.labelKey);
                  return (
                    <button key={item.id} type="button"
                      className="dk-tr dk-sr" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 130px 110px', cursor: canManageProject ? 'pointer' : 'default' }}
                      onClick={() => { if (canManageProject) { setEditingPayment(item); setShowPaymentModal(true); } }}
                    >
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>#{idx + 1} {item.label}</b></span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5A5F68', fontSize: 13 }}>{triggerText}</span>
                      <span style={{ minWidth: 0 }}><b>{Number(item.amount_huf).toLocaleString('hu-HU')} Ft</b></span>
                      <span style={{ minWidth: 0 }}>
                        <span className="dk-badge" style={{ background: statusDisplay.bg || '#F0F0F2', color: statusDisplay.color || '#2B3038' }}>
                          {t(statusDisplay.labelKey)}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <div style={{ padding: '12px 18px', borderTop: '1px solid #EDEBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>{t('totalLabel')}</span>
                  <b style={{ fontSize: 15, color: '#0E1116' }}>{totalExpected.toLocaleString('hu-HU')} Ft</b>
                </div>
              </>
            ))}

            <PaymentPlanModal
              isOpen={showPaymentModal}
              onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
              onSave={editingPayment ? (fields) => handleUpdatePayment(editingPayment.id, fields) : handleCreatePayment}
              editItem={editingPayment}
              itemCount={paymentPlan.length}
            />
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════
          PORTÁL POD — single unified card
          ══════════════════════════════════════════════ */}
      <div className="dk-card" style={{ overflow: 'hidden' }}>
        {/* Header row — full row is the toggle (no actions for portal) */}
        <div
          style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, cursor: 'pointer', userSelect: 'none' }}
          role="button" tabIndex={0}
          onClick={() => toggleSection('portal')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleSection('portal'); }}
        >
          <ChevronDown size={18} color="#5A5F68" aria-hidden="true" style={{ flexShrink: 0, transform: openSections.portal ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
          <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0E1116' }}>{t('headlinePortal')}</span>
        </div>
        {openSections.portal && (
          <div style={{ borderTop: '1px solid #EDEBE5' }}>
            <PortalShareSection
              project={project}
              invoices={liveInvoices}
              labourEntries={liveLabour}
              diaryEntries={diaryEntriesByProject[project.id] || []}
              canManage={canManageProject}
            />
          </div>
        )}
      </div>

      {/* Collective team discussion */}
      {project.collective_id && !isDemoMode && (
        <CollectiveChatSection collectiveId={project.collective_id} projectId={project.id} />
      )}

      </div>{/* end pods container */}

              </div>

              {/* ── Right aside ───────────────────────────────────────────── */}
              <aside style={{ flexShrink: 0, width: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Státusz card */}
                <section className="dk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('asideStatusLabel')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['active', 'paused', 'closed'].map(s => (
                      <button
                        key={s}
                        type="button"
                        className="dk-chip"
                        disabled={!canManageProject}
                        onClick={() => canManageProject && handleSetStatus(s)}
                        style={{
                          flex: 1, justifyContent: 'center',
                          background: projectStatus === s ? '#263248' : '#EFEDE6',
                          color: projectStatus === s ? '#fff' : '#0E1116',
                          cursor: canManageProject ? 'pointer' : 'default',
                          opacity: !canManageProject ? 0.65 : 1,
                        }}
                      >
                        {s === 'active' ? t('statusActive') : s === 'paused' ? t('statusPaused') : t('statusClosed')}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                    {project.collective_id ? t('statusNote') : t('statusNotePersonal')}
                  </span>
                </section>

                {/* Ügyfél card */}
                {client && (
                  <section className="dk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('asideClientLabel')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#B8456B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                        {(client.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                        <b style={{ fontSize: 15, color: '#0E1116' }}>{client.name}</b>
                        {client.address && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client.address}</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="dk-btn dk-btn-l"
                      style={{ justifyContent: 'center' }}
                      onClick={() => {
                        const url = `${window.location.origin}/clients/${client.id}`;
                        navigator.clipboard.writeText(url).then(() => {
                          setToast(t('copyPortalLinkDone'));
                          setTimeout(() => setToast(''), 2500);
                        });
                      }}
                    >
                      <Link2 size={18} aria-hidden="true" />
                      {t('copyPortalLinkBtn')}
                    </button>
                  </section>
                )}

              </aside>

            </div>
          </>
        )}
      </div>

      {editingLabour && (
        <LabourEditModal
          entry={editingLabour}
          rooms={projectRooms}
          canEdit={canManageProject || editingLabour.uploaded_by === currentUser?.id}
          onClose={() => setEditingLabour(null)}
          onSave={async (fields) => { await ctxUpdateLabourEntry(editingLabour.id, fields); }}
          onDelete={canManageProject || editingLabour.uploaded_by === currentUser?.id
            ? () => { setEditingLabour(null); handleDeleteLabour(editingLabour.id); }
            : undefined}
        />
      )}

      <NewExpenseModal
        isOpen={newExpenseOpen}
        onClose={() => setNewExpenseOpen(false)}
        projectId={project.id}
        rooms={projectRooms}
        onSuccess={() => {
          refreshSupabaseData();
          setToast(t('entrySaved'));
          setTimeout(() => setToast(''), 2500);
        }}
      />

      {/* Header context menu modal */}
      <Modal isOpen={showOptionsMenu} onClose={() => setShowOptionsMenu(false)} title={project.name}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '0 -6px' }}>
          <button
            type="button"
            onClick={() => { setShowOptionsMenu(false); setEditProjectOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#0E1116', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F4F5F8'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Edit3 size={17} color="#5A5F68" />
            </span>
            {t('editLabel')}
          </button>
        </div>
      </Modal>

      <ProjectEditModal
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        clients={ctxClients}
        onSave={async (fields) => { await updateProject(project.id, fields); router.refresh(); }}
        onCreateClient={async (fields) => createClient(fields)}
      />
      <RoomModal isOpen={roomModalOpen} onClose={() => setRoomModalOpen(false)} room={editingRoom} onSave={handleSaveRoom} canEdit={canManageProject} onDelete={editingRoom && canManageProject ? () => { setRoomModalOpen(false); handleDeleteRoom(editingRoom); } : undefined} />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={t('confirmTitle')} message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      {/* Status reason modal */}
      <Modal isOpen={statusReasonModal.open} onClose={() => setStatusReasonModal({ open: false, status: null, title: '', prompt: '', reason: '' })} title={statusReasonModal.title}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
          {statusReasonModal.prompt}
        </p>
        <textarea
          className="form-control"
          placeholder={t('statusReasonPlaceholder')}
          rows={3}
          value={statusReasonModal.reason}
          onChange={e => setStatusReasonModal(prev => ({ ...prev, reason: e.target.value }))}
          style={{ width: '100%', resize: 'vertical', borderColor: statusReasonModal.reason.trim() ? undefined : 'var(--danger-border)' }}
          autoFocus
        />
        {!statusReasonModal.reason.trim() && (
          <p style={{ fontSize: '0.775rem', color: 'var(--danger-text)', marginTop: '0.35rem', fontWeight: 600 }}>
            {t('statusReasonRequired')}
          </p>
        )}
        {project.collective_id && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} color="var(--warning-text)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--warning-text)', fontWeight: 600, lineHeight: 1.4 }}>
              {t('statusNotifyCollective')}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStatusReasonSubmit}
            disabled={!statusReasonModal.reason.trim()}
            style={{ background: STATUS_REASON_META[statusReasonModal.status]?.btnColor, borderColor: STATUS_REASON_META[statusReasonModal.status]?.btnColor, opacity: statusReasonModal.reason.trim() ? 1 : 0.45, cursor: statusReasonModal.reason.trim() ? 'pointer' : 'not-allowed' }}
          >
            {statusReasonModal.title}
          </button>
        </div>
      </Modal>

      {/* History modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={t('historyTitle')}>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Loader2 size={22} className="animate-spin" color="var(--text-muted)" /></div>
        ) : !history || history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('noHistory')}</div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {history.map((entry, idx) => {
              const a  = entry.action || '';
              const d  = entry.details || {};

              const ACTION_LABELS = {
                'project.created':         t('histActionProjectCreated'),
                'project.edited':          t('histActionProjectEdited'),
                'project.deleted':         t('histActionProjectDeleted'),
                'project.status_changed':  t('histActionProjectStatusChanged'),
                'project.members_updated': t('histActionProjectMembersUpdated'),
                'invoice.added':           t('histActionInvoiceAdded'),
                'invoice.edited':          t('histActionInvoiceEdited'),
                'invoice.deleted':         t('histActionInvoiceDeleted'),
                'invoice.portal_shown':    t('histActionInvoicePortalShown'),
                'invoice.portal_hidden':   t('histActionInvoicePortalHidden'),
                'labour.added':            t('histActionLabourAdded'),
                'labour.edited':           t('histActionLabourEdited'),
                'labour.deleted':          t('histActionLabourDeleted'),
                'diary_entry.created':     t('histActionDiaryCreated'),
                'room.created':            t('histActionRoomCreated'),
                'room.edited':             t('histActionRoomEdited'),
                'room.deleted':            t('histActionRoomDeleted'),
              };
              const actionLabel = ACTION_LABELS[a] || a;

              const isInvoiceAdd    = a === 'invoice.added';
              const isInvoiceEdit   = a === 'invoice.edited';
              const isInvoiceDel    = a === 'invoice.deleted';
              const isLabourAdd     = a === 'labour.added';
              const isLabourEdit    = a === 'labour.edited';
              const isLabourDel     = a === 'labour.deleted';
              const isProjectCreate = a === 'project.created';
              const isStatusChange  = a === 'project.status_changed';
              const isDeleted       = a.endsWith('.deleted');
              const isLabour        = isLabourAdd || isLabourEdit || isLabourDel;
              const isInvoice       = isInvoiceAdd || isInvoiceEdit || isInvoiceDel;

              const iconColor = isProjectCreate ? '#16a34a' : isLabourAdd ? '#16a34a' : isInvoiceAdd ? '#2563eb'
                              : isDeleted ? '#ef4444' : isStatusChange ? '#7c3aed' : '#d97706';
              const iconBg    = isProjectCreate ? '#f0fdf4' : isLabourAdd ? '#f0fdf4' : isInvoiceAdd ? '#eff6ff'
                              : isDeleted ? '#fff1f2' : isStatusChange ? '#f5f3ff' : '#fffbeb';
              const Icon = isProjectCreate ? Plus
                         : isLabour ? Hammer
                         : isInvoice ? Receipt
                         : isStatusChange ? CircleDot
                         : isDeleted ? Trash2
                         : Edit3;

              const sub = [];
              if (entry.user_name) sub.push(entry.user_name);
              if (d.value_huf)     sub.push(fmtMoney(d.value_huf));
              if (d.category)      sub.push(d.category);
              if (d.labour_type)   sub.push(d.labour_type);
              if (d.hours != null && d.unit) sub.push(`${d.hours} ${d.unit}`);
              if (d.description)   sub.push(d.description);
              if (d.changed_fields?.length) sub.push(d.changed_fields.join(', '));
              if (d.status_reason)          sub.push(`${t('historyReason')} ${d.status_reason}`);

              return (
                <div key={entry.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem 0', borderBottom: idx < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon size={15} color={iconColor} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{actionLabel}</div>
                    {sub.length > 0 && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{sub.join(' · ')}</div>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right', marginTop: 2 }}>
                    {formatDate(entry.created_at)}<br />
                    <span style={{ fontSize: '0.68rem' }}>{new Date(entry.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
            {history.length < historyTotal && (
              <div style={{ paddingTop: '0.75rem', textAlign: 'center' }}>
                <button type="button" onClick={loadMoreHistory} disabled={historyLoadingMore} className="btn btn-secondary btn-sm">
                  {historyLoadingMore ? <><Loader2 size={13} className="animate-spin" />{t('loadingMore')}</> : t('loadMoreEvents', { count: historyTotal - history.length })}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
      <LockedDocumentModal
        isOpen={lockedModalOpen}
        documentType="project"
        documentId={project.id}
        lockedReason={project.locked_reason}
        transferAttempts={transferAttemptCount}
        onDelete={async () => { await ctxDeleteProject(project.id); router.push(`${navPrefix}/projektek`); }}
        onUnlocked={() => setLockedModalOpen(false)}
        onKeepReadOnly={() => setLockedModalOpen(false)}
      />

      <EditDiaryEntryModal
        isOpen={!!editingDiaryEntry}
        onClose={() => setEditingDiaryEntry(null)}
        rooms={projectRooms}
        canEdit={!!(editingDiaryEntry && (canManageProject || editingDiaryEntry.created_by === currentUser?.id))}
        entry={editingDiaryEntry
          ? (diaryEntriesByProject[project.id]?.find(e => e.id === editingDiaryEntry.id) ?? editingDiaryEntry)
          : null
        }
        onSave={async (id, fields) => { await ctxUpdateDiaryEntry(id, fields); }}
        onAddPhotos={async (files) => {
          const uploaded = await uploadDiaryPhotos(project.id, files);
          await ctxUpdateDiaryEntry(editingDiaryEntry.id, { add_photo_ids: uploaded.map(p => p.id) });
        }}
        onDeletePhoto={async (photoId) => { await ctxDeleteDiaryPhoto(photoId, project.id); }}
        onDelete={editingDiaryEntry && (canManageProject || editingDiaryEntry.created_by === currentUser?.id)
          ? () => setConfirmModal({ message: t('deleteDiaryConfirm'), onConfirm: async () => { try { await ctxDeleteDiaryEntry(editingDiaryEntry.id, project.id); setEditingDiaryEntry(null); } catch (err) { setAlertModal({ message: err.message || t('deleteError') }); } } })
          : undefined
        }
      />

      {/* Invoice detail drawer */}
      {detailInvoice && (
        <InvoiceDetailDrawer
          invoice={detailInvoice}
          isAdmin={canManageProject || detailInvoice?.uploaded_by === currentUser?.id}
          rooms={projectRooms}
          splits={invoiceSplits.filter(s => s.invoice_id === detailInvoice.id)}
          onClose={() => setDetailInvoice(null)}
          onDelete={handleDeleteInvoice}
          onSave={handleSaveInvoice}
          onSaveSplits={handleSaveSplits}
          onUploadImage={uploadInvoiceImage}
          invoiceMedia={invoiceMediaByInvoice[detailInvoice?.id] || []}
          onMediaAdded={media => handleMediaAdded(detailInvoice.id, media)}
          onMediaDeleted={mediaId => handleMediaDeleted(detailInvoice.id, mediaId)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 'var(--radius-pill)',
          padding: '0.65rem 1.15rem', fontSize: '0.875rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 500,
          whiteSpace: 'nowrap', animation: 'fadeInUp 0.2s ease',
        }}>
          <CheckCircle2 size={16} color="#4ade80" /> {toast}
        </div>
      )}

      {/* Mobile floating options button */}
      {canManageProject && isMobile && (
        <button
          type="button"
          onClick={() => setShowActionsSheet(true)}
          aria-label={t('optionsAria')}
          style={{
            position: 'fixed',
            bottom: 'calc(162px + env(safe-area-inset-bottom))',
            right: 20,
            width: 52, height: 52,
            borderRadius: '50%',
            background: '#0f172a',
            border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(15,23,42,0.35)',
            cursor: 'pointer', zIndex: 50,
          }}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
        </button>
      )}

      {/* Mobile options BottomSheet */}
      {showActionsSheet && (
        <>
          <div
            onClick={() => setShowActionsSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200 }}
            aria-hidden="true"
          />
          <div role="dialog" aria-modal="true" aria-label={t('actionsMenuLabel')} className="bs-panel" style={{ padding: '0 0 calc(8px + env(safe-area-inset-bottom))' }}>
            <div className="bs-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '0 20px 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              {t('actionsMenuLabel')}
            </div>

            <button
              type="button"
              onClick={() => { setShowActionsSheet(false); setEditProjectOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Edit3 size={20} strokeWidth={1.75} color="#475569" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{t('editLabel')}</span>
            </button>

            {/* Status options */}
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 20px' }} />
            {STATUS_NEXT.filter(s => s.show).map(s => (
              <button key={s.key} type="button" onClick={() => { setShowActionsSheet(false); handleSetStatus(s.key); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CircleDot size={20} strokeWidth={1.75} color="#475569" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{s.label}</span>
              </button>
            ))}

            {/* History */}
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 20px' }} />
            <button type="button" onClick={() => { setShowActionsSheet(false); openHistory(); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <History size={20} strokeWidth={1.75} color="#475569" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{t('historyLabel')}</span>
            </button>

            {/* Delete */}
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 20px' }} />
            <button type="button" onClick={() => { setShowActionsSheet(false); handleDeleteProject(); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} strokeWidth={1.75} color="#b91c1c" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#b91c1c' }}>{t('deleteLabel')}</span>
            </button>
          </div>
        </>
      )}

      {/* Mobile floating action button — opens QuickDiarySheet on napló tab, QuickCostSheet otherwise */}
      <button
        type="button"
        className="show-mobile"
        onClick={() => setShowQuickCostSheet(true)}
        aria-label={t('addEntryAria')}
        style={{
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom))',
          right: 20,
          width: 52, height: 52,
          borderRadius: '50%',
          background: '#2563eb',
          border: 'none', color: '#fff',
          boxShadow: '0 4px 16px rgba(37,99,235,.45)',
          cursor: 'pointer', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
      </button>

      <QuickCostSheet
        isOpen={showQuickCostSheet}
        onClose={() => setShowQuickCostSheet(false)}
        projectId={project.id}
        onSuccess={() => {
          refreshSupabaseData();
          setToast(t('entrySaved'));
          setTimeout(() => setToast(''), 2500);
        }}
      />

      <QuickDiarySheet
        isOpen={showQuickDiarySheet}
        onClose={() => setShowQuickDiarySheet(false)}
        projectId={project.id}
        onSuccess={() => {
          fetchDiaryEntries(project.id);
          setToast(t('diaryEntrySaved'));
          setTimeout(() => setToast(''), 2500);
        }}
      />
    </div>
  );
}
