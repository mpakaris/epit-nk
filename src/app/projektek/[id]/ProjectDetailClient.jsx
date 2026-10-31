'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
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
import BurndownCard from './components/BurndownCard';
import CostBreakdownCard from './components/CostBreakdownCard';
import CombinedStatsCard from './components/CombinedStatsCard';
import EntryMediaGrid from './components/EntryMediaGrid';
import EditDiaryEntryModal from './components/EditDiaryEntryModal';
import DiaryDetailSheet from './components/DiaryDetailSheet';
import LabourEditModal from './components/LabourEditModal';
import InvoiceDetailDrawer from './components/InvoiceDetailDrawer';
import PaymentPlanModal, { TRIGGER_DISPLAY, STATUS_DISPLAY } from './components/PaymentPlanModal';
import WorkTypeSelector, { WORK_TYPES } from './components/WorkTypeSelector';
import RoomModal from './components/RoomModal';
import ProjectEditModal from './components/ProjectEditModal';


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
    loading: ctxLoading,
    labourEntries: ctxLabourEntries,
    invoices: ctxInvoices,
    updateProject,
    createClient,
    clients: ctxClients,
    collectives,
    isDemoMode,
    refreshSupabaseData,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [labourUploaderFilter, setLabourUploaderFilter] = useState('ALL');
  const [labourTypeFilter, setLabourTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
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
  const [diaryDetailEntry, setDiaryDetailEntry] = useState(null);
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [syncing, setSyncing] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [invoiceSplits, setInvoiceSplits] = useState(initialInvoiceSplits);
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

  React.useEffect(() => {
    if (activeTab === 'naplo' && project && !diaryEntriesByProject[project.id]) {
      setDiaryLoading(true);
      fetchDiaryEntries(project.id).catch(() => {}).finally(() => setDiaryLoading(false));
    }
    if (canManageProject && activeTab === 'naplo' && project && shareTokens.length === 0 && !shareLoading) {
      setShareLoading(true);
      fetch(`/api/diary/share?project_id=${project.id}`)
        .then(r => r.json())
        .then(d => { if (d.tokens) setShareTokens(d.tokens); })
        .catch(() => {})
        .finally(() => setShareLoading(false));
    }
  }, [activeTab, project?.id]);

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
    if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
    if (uploaderFilter !== 'ALL' && inv.uploaded_by !== uploaderFilter) return false;
    if (roomFilter !== 'ALL') {
      if (roomFilter === 'GENERAL') {
        // Show invoices with no room and no splits
        const hasSplits = invoiceSplits.some(s => s.invoice_id === inv.id);
        if (hasSplits || inv.room_id) return false;
      } else {
        const hasSplit = invoiceSplits.some(s => s.invoice_id === inv.id && s.room_id === roomFilter);
        if (!hasSplit && inv.room_id !== roomFilter) return false;
      }
    }
    return true;
  });

  const filteredLabour = fin.projectLabour.filter(entry => {
    if (roomFilter !== 'ALL' && entry.room_id !== (roomFilter === 'GENERAL' ? null : roomFilter)) return false;
    if (labourUploaderFilter !== 'ALL' && entry.uploaded_by !== labourUploaderFilter) return false;
    if (labourTypeFilter.trim() && !entry.labour_type?.toLowerCase().includes(labourTypeFilter.toLowerCase())) return false;
    return true;
  });

  const isDocLocked      = !!project.locked_reason;
  const isKollektivOwner = collectives?.some(c => c.collective_id === project.collective_id && (c.role === 'owner' || c.role === 'admin'));
  const canManageProject = !isDocLocked && (isKollektivOwner || project.created_by === currentUser?.id || project.owner_id === currentUser?.id);

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
      message: `Biztosan törölni kívánja a(z) „${project.name}" projektet? Az összes számla, munkabejegyzés és napló is törlődik.`,
      onConfirm: async () => {
        try {
          await ctxDeleteProject(project.id);
          router.push(`${navPrefix}/projektek`);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  const projectStatus = project.status || 'active';
  const isClosed      = projectStatus === 'closed';
  const isOwner       = project.owner_id === currentUser?.id || project.created_by === currentUser?.id;

  const STATUS_LABELS = { active: 'Aktív', paused: 'Szüneteltetett', closed: 'Lezárt' };
  const STATUS_NEXT = [
    { key: 'active', label: 'Aktívra állítás',  show: projectStatus !== 'active' },
    { key: 'paused', label: 'Szüneteltetés',     show: projectStatus !== 'paused' },
    { key: 'closed', label: 'Lezárás',           show: projectStatus !== 'closed' },
  ];

  const handleSetStatus = (newStatus) => {
    const label = STATUS_LABELS[newStatus];
    setConfirmModal({
      message: `„${project.name}" állapota: ${label}. Biztosan módosítod?`,
      onConfirm: async () => {
        try { await ctxSetProjectStatus(project.id, newStatus); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba az állapot mentésekor' }); }
      }
    });
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
      message: 'Biztosan törölni szeretné ezt a számlát?',
      onConfirm: async () => {
        try { await ctxDeleteInvoice(invId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleDeleteLabour = (entryId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a munkabejegyzést?',
      onConfirm: async () => {
        try {
          await ctxDeleteLabourEntry(entryId);
          setToast('Munkabejegyzés törölve.');
          setTimeout(() => setToast(''), 2500);
        }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
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
    if (!res.ok) throw new Error(data.error || 'Hiba a szekció felosztás mentésekor');
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
      if (!res.ok) throw new Error(data.error || 'Hiba');
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
      message: `Biztosan törölni kívánja a(z) "${token.label || 'Névtelen link'}" megosztási linket?`,
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
    const invCount = (fin.projectInvoices || []).filter(i => i.room_id === room.id).length;
    const labCount = (fin.projectLabour || []).filter(l => l.room_id === room.id).length;
    const hasEntries = invCount > 0 || labCount > 0;
    const entryNote = hasEntries
      ? ` (${[invCount > 0 ? `${invCount} számla` : '', labCount > 0 ? `${labCount} munkabejegyzés` : ''].filter(Boolean).join(', ')} szekció nélkülivé válik)`
      : '';
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) "${room.name}" szekciót?${entryNote}`,
      onConfirm: async () => {
        try {
          await deleteProjectRoom(project.id, room.id);
          setToast('Szekció törölve.');
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

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={currentUser?.role === 'superadmin' ? '/superadmin/projektek' : `${navPrefix}/projektek`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <CollectiveBanner documentCollectiveId={project.collective_id ?? null} />
      {isDocLocked && !lockedModalOpen && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)', fontWeight: 600, flex: 1 }}>
              🔒 Ez a projekt csak olvasható.
            </span>
            {!isMobile && (
              <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                Lehetőségeim →
              </button>
            )}
          </div>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Lehetőségeim →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            {currentUser?.role === 'superadmin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                <ShieldCheck size={15} /> Adminisztrátori nézet
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{project.name}</h1>
              {projectStatus === 'closed' && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>Lezárt</span>
              )}
              {projectStatus === 'paused' && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>Szünetel</span>
              )}
            </div>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {!isMobile && (
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
                <Camera size={15} /> <span>Bejegyzés</span>
              </Link>
            )}

            {canManageProject && !isMobile && (
              <div ref={optionsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOptionsMenu(v => !v)}
                  title="Beállítások"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Settings size={14} />
                  <ChevronDown size={12} style={{ opacity: 0.7 }} />
                </button>

                {showOptionsMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 6px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '190px', padding: '0.3rem', overflow: 'hidden' }}>
                    {/* Edit */}
                    {[{ icon: Edit3, label: 'Szerkesztés', onClick: () => setEditProjectOpen(true) }].map(item => (
                      <button key={item.label} type="button" onClick={() => { setShowOptionsMenu(false); item.onClick(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <item.icon size={14} color="var(--text-muted)" /> {item.label}
                      </button>
                    ))}

                    {/* Status options */}
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.3rem' }} />
                    {STATUS_NEXT.filter(s => s.show).map(s => (
                      <button key={s.key} type="button" onClick={() => { setShowOptionsMenu(false); handleSetStatus(s.key); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <CircleDot size={14} color="var(--text-muted)" /> {s.label}
                      </button>
                    ))}

                    {/* History */}
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.3rem' }} />
                    <button type="button" onClick={() => { setShowOptionsMenu(false); openHistory(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <History size={14} color="var(--text-muted)" /> Előzmények
                    </button>

                    {/* Delete */}
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.3rem' }} />
                    <button type="button" onClick={() => { setShowOptionsMenu(false); handleDeleteProject(); }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--danger-text)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <Trash2 size={14} /> Törlés
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Info row: client, members, dates — always rendered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <BookUser size={13} /> Megrendelő
          </div>
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.name}</div>
              {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Phone size={13} />{client.phone}</div>}
              {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Mail size={13} />{client.email}</div>}
              {client.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><MapPin size={13} />{client.address}</div>}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs megrendelő hozzárendelve</div>
          )}
        </div>

        {(activeCollectiveId || projectMemberUsers.length > 0) && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <Users size={13} /> Résztvevők
          </div>
          {projectMemberUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {projectMemberUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                    {u.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: u.id === currentUser?.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {u.display_name}{u.id === currentUser?.id ? ' (Ön)' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincsenek hozzárendelt tagok</div>
          )}
        </div>
        )}

        <CombinedStatsCard
          totalCost={fin.totalCost}
          invoiceCount={fin.projectInvoices.length}
          totalLabour={fin.totalLabourValue}
          labourCount={fin.projectLabour.length}
          collective={!!activeCollectiveId}
          ownPaid={fin.ownPaid}
          balance={fin.balance}
        />

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <CalendarDays size={13} /> Adatok
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kezdés</span>
              <span style={{ fontWeight: 700, color: project.start_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.start_date) || '–'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Befejezés</span>
              <span style={{ fontWeight: 700, color: project.end_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.end_date) || '–'}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Számlák</span>
              <span style={{ fontWeight: 700 }}>{fin.projectInvoices.length} db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart row: bar chart (40%) + burndown (60%) — hidden on mobile until there is cost */}
      {(!isMobile || fin.totalCost > 0 || fin.totalLabourValue > 0) && (
      <div className="grid-chart" style={{ marginBottom: '1.5rem' }}>
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
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                <Ruler size={13} /> Szekciók ({projectRooms.length})
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {unimportedSections.length > 0 && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSyncRooms} disabled={syncing} style={{ fontSize: '0.75rem' }}>
                    {syncing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                    Import ({unimportedSections.length})
                  </button>
                )}
                <button type="button" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => { setEditingRoom(null); setRoomModalOpen(true); }} aria-label="Új szekció">
                  <Plus size={13} />
                </button>
              </div>
            </div>
            {projectRooms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
                <Home size={24} style={{ margin: '0 auto 0.35rem', display: 'block', opacity: 0.4 }} />
                Még nincsenek szekciók. Adj hozzá egyet, vagy importáld az ajánlatból.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.65rem' }}>
              {projectRooms.map(room => {
                const actual    = roomCost(room.id);
                const quoted    = room.quoted_amount_net;
                const invCount  = (invoicesByRoom[room.id] || []).length;
                const labCount  = (labourByRoom[room.id] || []).length;
                const overBudget = quoted != null && actual > quoted;
                return (
                  <button key={room.id} type="button" onClick={() => { setEditingRoom(room); setRoomModalOpen(true); }} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px solid #cbd5e1', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }}>
                    {/* Dark header */}
                    <div style={{ background: '#1e3a5f', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.2 }}>{room.name}</div>
                          {room.size_m2 != null && (
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Ruler size={10} />{room.size_m2} m²
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {actual > 0 && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>{formatHUF(actual)}</div>
                          )}
                          {quoted != null && (
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: overBudget ? '#fca5a5' : '#86efac', marginTop: '0.1rem' }}>
                              {actual > 0 ? (overBudget ? '↑' : '↓') + ' ' : ''}terv: {formatHUF(quoted)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Light body */}
                    <div style={{ background: '#f0f4f8', padding: '0.65rem 1rem' }}>
                      {room.work_types && room.work_types.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.45rem' }}>
                          {room.work_types.map(t => (
                            <span key={t} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999, background: '#e2e8f0', border: '1px solid #cbd5e1', color: '#475569' }}>{t}</span>
                          ))}
                        </div>
                      )}
                      {(invCount > 0 || labCount > 0) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem' }}>
                          {invCount > 0 && <span>{invCount} számla</span>}
                          {labCount > 0 && <span>{labCount} munka</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {/* General (unassigned) costs */}
              {(invoicesByRoom['general']?.length > 0 || labourByRoom['general']?.length > 0) && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px dashed #cbd5e1' }}>
                  <div style={{ background: '#475569', padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>Általános</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.1rem', color: '#fff', marginTop: '0.15rem' }}>{formatHUF(roomCost('general'))}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem' }}>
                      {(invoicesByRoom['general']?.length || 0) > 0 && <span>{invoicesByRoom['general'].length} számla</span>}
                      {(labourByRoom['general']?.length || 0) > 0 && <span>{labourByRoom['general'].length} munka</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Linked survey */}
      {project.survey_id && (() => {
        const linkedSurvey = (surveys || []).find(s => s.id === project.survey_id);
        if (!linkedSurvey) return null;
        return (
          <div className="card mb-4" style={{ borderLeft: '3px solid var(--accent)', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ruler size={15} color="var(--accent)" />
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Felmérés</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{linkedSurvey.title}</div>
              </div>
            </div>
            <Link href={`${navPrefix}/felmeres/${linkedSurvey.id}`} className="btn btn-secondary btn-sm"><Ruler size={13} /> Megtekint</Link>
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
        const STATUS_LABELS = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };
        return (
          <div className="card mb-6" style={{ borderLeft: '3px solid var(--accent)', padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Kapcsolt ajánlat</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {linkedQuote.title}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: sc[linkedQuote.status] || 'var(--text-muted)' }}>
                      {STATUS_LABELS[linkedQuote.status] || linkedQuote.status}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Bruttó: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{formatHUF(grossTotal)}</span>
                  </div>
                </div>
              </div>
              <Link href={`${navPrefix}/ajanlatok/${linkedQuote.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                <FileText size={13} /> Megtekint
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Per-member contribution cards — collective or multi-member project */}
      {(project.collective_id || activeCollectiveId) && fin.memberBreakdown.length > 0 && (
        <div className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Résztvevők hozzájárulása</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.75rem' }}>
            {fin.memberBreakdown.map(member => {
              const memberInvoices = fin.projectInvoices.filter(inv => inv.uploaded_by === member.userId);
              const memberLabour   = fin.projectLabour.filter(e => e.uploaded_by === member.userId);
              const total = member.paid + member.labourValue;
              const isSelf         = member.userId === currentUser?.id;
              const memberUser     = projectMemberUsers.find(u => u.id === member.userId);
              const isCollectiveOwner = memberUser?.collective_role === 'owner';

              const cardBorder = isCollectiveOwner
                ? '2px solid #7c3aed'
                : isSelf
                  ? '2px solid var(--accent-border)'
                  : undefined;

              return (
                <div key={member.userId} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: cardBorder }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{member.displayName}</span>
                      {isCollectiveOwner && <span style={{ fontSize: '0.65rem', color: '#7c3aed', background: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Tulajdonos</span>}
                      {isSelf && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
                      {member.deletedAt && <span style={{ fontSize: '0.65rem', color: '#fff', background: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Kilépett</span>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatHUF(total)}</span>
                  </div>

                  {/* Invoices */}
                  {memberInvoices.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Receipt size={11} /> Számlák</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>{formatHUF(member.paid)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberInvoices.map(inv => (
                          <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{inv.description || inv.category}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem' }}>{formatHUF(inv.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Labour */}
                  {memberLabour.length > 0 && (
                    <div style={{ borderTop: memberInvoices.length > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: memberInvoices.length > 0 ? '0.65rem' : 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Hammer size={11} /> Munkadíj</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success-text)', fontWeight: 700 }}>+{formatHUF(member.labourValue)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberLabour.map(e => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {e.labour_type}{e.hours ? ` · ${e.hours} ${e.unit || 'h'}` : ''}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem', color: 'var(--success-text)' }}>+{formatHUF(e.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {memberInvoices.length === 0 && memberLabour.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Még nincs rögzített tétel.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[
          { key: 'invoices', label: `Számlák (${fin.projectInvoices.length})`, icon: Receipt },
          { key: 'labour', label: `Munka (${fin.projectLabour.length})`, icon: Hammer },
          { key: 'naplo', label: `Napló (${diaryEntriesByProject[project.id]?.length ?? initialDiaryCount})`, icon: BookOpen },
          { key: 'payment', label: `Fizetési terv (${paymentPlan.length})`, icon: Wallet },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-2px', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab.key ? 800 : 600, color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.875rem', transition: 'all 0.15s ease', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <tab.icon size={15} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          <div className="invoice-filters">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden kategória</option>
              {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {projectMemberUsers.length > 1 && (
              <select value={uploaderFilter} onChange={e => setUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden feltöltő</option>
                {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </select>
            )}
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {!isMobile && (
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
            )}
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs megjeleníthető számla</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Ehhez a szűréshez még nem rögzítettek számlát.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Számla hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredInvoices.map(inv => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  room={projectRooms.find(r => r.id === inv.room_id) || null}
                  onClick={() => setDetailInvoice(inv)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'labour' && (
        <>
          <div className="invoice-filters">
            <input
              type="text"
              className="form-control"
              placeholder="Szűrés típus szerint…"
              value={labourTypeFilter}
              onChange={e => setLabourTypeFilter(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}
            />
            {projectMemberUsers.length > 1 && (
              <select value={labourUploaderFilter} onChange={e => setLabourUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden feltöltő</option>
                {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </select>
            )}
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {!isMobile && (
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
            )}
          </div>

          {filteredLabour.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Hammer size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs rögzített munka</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>A saját elvégzett munkák itt jelennek meg.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Munkabejegyzés hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredLabour.map((entry) => {
                const uploader   = initialUsers.find(u => u.id === entry.uploaded_by);
                const entryRoom  = projectRooms.find(r => r.id === entry.room_id) || null;
                return (
                  <button key={entry.id} type="button" onClick={() => setEditingLabour(entry)}
                    style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px solid #cbd5e1', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }}>
                    {/* Dark header */}
                    <div style={{ background: '#1e3a5f', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Hammer size={11} /> Munkadíj
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.35rem', color: '#fff', lineHeight: 1.1 }}>
                            +{formatHUF(entry.value_huf)}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', flexShrink: 0 }}>
                          {entry.hours} {entry.unit || 'h'}
                        </div>
                      </div>
                    </div>
                    {/* Light body */}
                    <div style={{ background: '#f0f4f8', padding: '0.65rem 1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                        {entry.labour_type}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} color="var(--accent)" />
                          <strong style={{ color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />{formatDate(entry.date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />{entry.hours} {entry.unit || 'h'} × {formatHUF(entry.hourly_rate)}
                        </span>
                        {entryRoom ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.68rem' }}>
                            <Home size={10} />{entryRoom.name}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                            <Home size={10} />Általános
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{entry.description}</div>
                      )}
                      {entry.updated_at && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <PencilLine size={9} />
                          {entry.updated_by_name ? `${entry.updated_by_name} · ` : ''}{formatDate(entry.updated_at)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'payment' && (() => {
        const today = new Date().toISOString().slice(0, 10);
        const totalExpected = paymentPlan.reduce((s, i) => s + Number(i.amount_huf || 0), 0);
        const totalPaid = paymentPlan.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_huf || 0), 0);

        const handleCreatePayment = async (fields) => {
          const res = await fetch('/api/payment-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: project.id, ...fields }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Hiba');
          setPaymentPlan(prev => [...prev, { ...data.item, files: [] }]);
          setToast('Fizetési tétel hozzáadva.');
          setTimeout(() => setToast(''), 2500);
        };

        const handleUpdatePayment = async (itemId, fields) => {
          const res = await fetch(`/api/payment-plan/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Hiba');
          setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...data.item, files: i.files || [] } : i));
        };

        const handleFileUpload = async (itemId, files) => {
          if (!files || files.length === 0) return;
          setUploadingItemIds(prev => new Set(prev).add(itemId));
          try {
            for (const file of Array.from(files)) {
              const fd = new FormData();
              fd.append('file', file);
              const res = await fetch(`/api/payment-plan/${itemId}/files`, { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok) { setAlertModal({ message: data.error || 'Feltöltési hiba' }); continue; }
              setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, files: [...(i.files || []), data.file] } : i));
            }
            setToast('Fájl feltöltve.');
            setTimeout(() => setToast(''), 2500);
          } finally {
            setUploadingItemIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
          }
        };

        const handleFileDelete = (itemId, fileId) => {
          setConfirmModal({
            message: 'Biztosan törölni kívánja ezt a mellékletet?',
            onConfirm: async () => {
              const res = await fetch(`/api/payment-plan/${itemId}/files/${fileId}`, { method: 'DELETE' });
              if (!res.ok) { const d = await res.json(); setAlertModal({ message: d.error }); return; }
              setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, files: (i.files || []).filter(f => f.id !== fileId) } : i));
            },
          });
        };

        const handleDeletePayment = (item) => {
          setConfirmModal({
            message: `Biztosan törölni kívánja a(z) „${item.label}" fizetési tételt?`,
            onConfirm: async () => {
              const res = await fetch(`/api/payment-plan/${item.id}`, { method: 'DELETE' });
              if (!res.ok) { const d = await res.json(); setAlertModal({ message: d.error }); return; }
              setPaymentPlan(prev => prev.filter(i => i.id !== item.id));
              setToast('Fizetési tétel törölve.');
              setTimeout(() => setToast(''), 2500);
            },
          });
        };

        const handleMarkPaid = async (item) => {
          try {
            await handleUpdatePayment(item.id, { status: 'paid' });
            setToast('Fizetve jelölve!');
            setTimeout(() => setToast(''), 2500);
          } catch (err) {
            setAlertModal({ message: err.message });
          }
        };

        return (
          <>
            {/* Summary + add button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              {paymentPlan.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Várható: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{totalExpected.toLocaleString('hu-HU')} Ft</strong>
                  </div>
                  {totalPaid > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--success-text)' }}>
                      Fizetve: <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalPaid.toLocaleString('hu-HU')} Ft</strong>
                    </div>
                  )}
                </div>
              )}
              {canManageProject && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
                >
                  <Plus size={15} /> Új tétel
                </button>
              )}
            </div>

            {paymentPlan.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                <Wallet size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs fizetési terv</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                  Add meg a projekt részletfizetéseit — az ügyfél a portálján látni fogja ezeket.
                </p>
                {canManageProject && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}>
                    <Plus size={15} /> Első tétel hozzáadása
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {paymentPlan.map((item, idx) => {
                  const isOverdue = item.status === 'pending' && item.due_date && item.due_date < today;
                  const statusDisplay = isOverdue
                    ? { label: 'Lejárt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
                    : (STATUS_DISPLAY[item.status] || STATUS_DISPLAY.pending);
                  const triggerDisplay = TRIGGER_DISPLAY[item.trigger_type] || TRIGGER_DISPLAY.milestone;
                  const TRIGGER_HEADER_BG = { start: '#1d4ed8', end: '#15803d', milestone: '#92400e', date: '#6d28d9' };
                  const headerBg = TRIGGER_HEADER_BG[item.trigger_type] || TRIGGER_HEADER_BG.milestone;
                  const PILL = { fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff' };

                  return (
                    <button key={item.id} type="button"
                      onClick={() => { if (canManageProject) { setEditingPayment(item); setShowPaymentModal(true); } }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 'var(--radius-md)', border: `1.5px solid ${triggerDisplay.border}`, overflow: 'hidden', cursor: canManageProject ? 'pointer' : 'default' }}>

                      {/* Coloured header */}
                      <div style={{ background: headerBg, padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                              #{idx + 1} · {triggerDisplay.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.35rem', color: '#fff', lineHeight: 1.1 }}>
                              {Number(item.amount_huf).toLocaleString('hu-HU')} Ft
                            </div>
                          </div>
                          <span style={PILL}>{statusDisplay.label}</span>
                        </div>
                      </div>

                      {/* Light body */}
                      <div style={{ background: triggerDisplay.bg, padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{item.label}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {item.trigger_type === 'milestone' && item.milestone_name && (
                            <span style={{ fontWeight: 600 }}>→ {item.milestone_name}</span>
                          )}
                          {item.trigger_type === 'date' && item.due_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                              <Calendar size={12} />{new Date(item.due_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          )}
                          {item.status === 'paid' && item.paid_at && (
                            <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                              Fizetve: {new Date(item.paid_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          )}
                          {(item.files || []).length > 0 && (
                            <span style={{ color: 'var(--text-muted)' }}>{item.files.length} melléklet</span>
                          )}
                        </div>
                        {item.note && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.3rem 0 0', fontStyle: 'italic' }}>{item.note}</p>}
                      </div>
                    </button>
                  );
                })}

                {/* Total bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Összesen</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{totalExpected.toLocaleString('hu-HU')} Ft</span>
                </div>
              </div>
            )}

            <PaymentPlanModal
              isOpen={showPaymentModal}
              onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
              onSave={editingPayment
                ? (fields) => handleUpdatePayment(editingPayment.id, fields)
                : handleCreatePayment
              }
              editItem={editingPayment}
              itemCount={paymentPlan.length}
            />
          </>
        );
      })()}

      {activeTab === 'naplo' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const url = `${window.location.origin}/naplo/${project.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  setToast('Ügyfél link másolva!');
                  setTimeout(() => setToast(''), 2500);
                });
              }}
            >
              <Copy size={14} /> Ügyfél link
            </button>
            <button type="button" onClick={() => setShowQuickDiarySheet(true)} className="btn btn-primary btn-sm"><Plus size={15} /> Új bejegyzés</button>
          </div>
          {diaryLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>Betöltés...</div>
          ) : !diaryEntriesByProject[project.id] || diaryEntriesByProject[project.id].length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Még nincs bejegyzés ebben a naplóban</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Az első fotós bejegyzéssel kezd el dokumentálni a munkát.</p>
              <button type="button" onClick={() => setShowQuickDiarySheet(true)} className="btn btn-primary btn-sm"><Plus size={15} /> Első bejegyzés</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.85rem' }}>
              {(diaryEntriesByProject[project.id] || []).map(entry => {
                const entryDateStr = entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
                const author   = initialUsers.find(u => u.id === entry.created_by);
                const entryRoom = projectRooms.find(r => r.id === entry.room_id);
                return (
                  <button key={entry.id} type="button" onClick={() => setDiaryDetailEntry(entry)}
                    style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px solid #cbd5e1', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }}>
                    {/* Dark header */}
                    <div style={{ background: '#334155', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                        {entryDateStr && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={10} />{entryDateStr}
                          </span>
                        )}
                        {entry.work_type && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>
                            {entry.work_type}
                          </span>
                        )}
                        {entryRoom && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Home size={10} />{entryRoom.name}
                          </span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 999, border: entry.is_public ? '1px solid #86efac' : '1px solid rgba(255,255,255,0.25)', background: entry.is_public ? 'rgba(134,239,172,0.2)' : 'rgba(255,255,255,0.1)', color: entry.is_public ? '#86efac' : 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.25 }}>{entry.title}</div>
                    </div>
                    {/* Light body — preview only */}
                    <div style={{ background: '#f8fafc', padding: '0.65rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: entry.body ? '0.45rem' : 0 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                          {(author?.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{author?.display_name || 'Ismeretlen'}</span>
                      </div>
                      {entry.body && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {entry.body}
                        </p>
                      )}
                      {entry.photos?.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontWeight: 600 }}>
                          {entry.photos.length} fotó
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </>
      )}

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

      <ProjectEditModal
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        clients={ctxClients}
        onSave={async (fields) => { await updateProject(project.id, fields); router.refresh(); }}
        onCreateClient={async (fields) => createClient(fields)}
      />
      <RoomModal isOpen={roomModalOpen} onClose={() => setRoomModalOpen(false)} room={editingRoom} onSave={handleSaveRoom} canEdit={canManageProject} onDelete={editingRoom && canManageProject ? () => { setRoomModalOpen(false); handleDeleteRoom(editingRoom); } : undefined} />
      {diaryDetailEntry && (
        <DiaryDetailSheet
          entry={diaryEntriesByProject[project.id]?.find(e => e.id === diaryDetailEntry.id) ?? diaryDetailEntry}
          author={initialUsers.find(u => u.id === diaryDetailEntry.created_by)}
          room={projectRooms.find(r => r.id === diaryDetailEntry.room_id)}
          canManage={canManageProject || diaryDetailEntry.created_by === currentUser?.id}
          onClose={() => setDiaryDetailEntry(null)}
          onDelete={() => setConfirmModal({ message: 'Biztosan törölni kívánja ezt a naplóbejegyzést?', onConfirm: async () => { try { await ctxDeleteDiaryEntry(diaryDetailEntry.id, project.id); setDiaryDetailEntry(null); } catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); } } })}
          onTogglePublic={async () => {
            try { await ctxUpdateDiaryEntry(diaryDetailEntry.id, { title: diaryDetailEntry.title, body: diaryDetailEntry.body, work_type: diaryDetailEntry.work_type, internal_note: diaryDetailEntry.internal_note, client_note: diaryDetailEntry.client_note, entry_date: diaryDetailEntry.entry_date, is_public: !diaryDetailEntry.is_public }); }
            catch (err) { setAlertModal({ message: err.message }); }
          }}
          editHref={`${navPrefix}/projektek/${project.id}/naplo/${diaryDetailEntry.id}`}
        />
      )}
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      {/* History modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Projekt előzményei">
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Loader2 size={22} className="animate-spin" color="var(--text-muted)" /></div>
        ) : !history || history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Még nincs rögzített esemény.</div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {history.map((entry, idx) => {
              const a  = entry.action || '';
              const d  = entry.details || {};
              const isInvoiceAdd    = a === 'Számla rögzítve';
              const isInvoiceEdit   = a === 'Számla módosítva';
              const isInvoiceDel    = a === 'Számla törölve';
              const isLabourAdd     = a === 'Munkabejegyzés rögzítve';
              const isLabourEdit    = a === 'Munkabejegyzés módosítva';
              const isLabourDel     = a === 'Munkabejegyzés törölve';
              const isProjectCreate = a.includes('létrehozva');
              const isProjectEdit   = a === 'Projekt módosítva';
              const isStatusChange  = a.includes('Státusz módosítva');
              const isDeleted       = a.includes('törölve');
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
              if (d.value_huf)     sub.push(formatHUF(d.value_huf));
              if (d.category)      sub.push(d.category);
              if (d.labour_type)   sub.push(d.labour_type);
              if (d.hours != null && d.unit) sub.push(`${d.hours} ${d.unit}`);
              if (d.description)   sub.push(d.description);
              if (d.changed_fields?.length) sub.push(d.changed_fields.join(', '));

              return (
                <div key={entry.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem 0', borderBottom: idx < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon size={15} color={iconColor} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{entry.action}</div>
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
                  {historyLoadingMore ? <><Loader2 size={13} className="animate-spin" />Betöltés…</> : `Még ${historyTotal - history.length} esemény betöltése`}
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
        onDelete={async () => { await ctxDeleteProject(project.id); router.push('/projektek'); }}
        onUnlocked={() => setLockedModalOpen(false)}
        onKeepReadOnly={() => setLockedModalOpen(false)}
      />

      <EditDiaryEntryModal
        isOpen={!!editingDiaryEntry}
        onClose={() => setEditingDiaryEntry(null)}
        rooms={projectRooms}
        entry={editingDiaryEntry
          ? (diaryEntriesByProject[project.id]?.find(e => e.id === editingDiaryEntry.id) ?? editingDiaryEntry)
          : null
        }
        onSave={async (id, fields) => {
          await ctxUpdateDiaryEntry(id, fields);
        }}
        onAddPhotos={async (files) => {
          const uploaded = await uploadDiaryPhotos(project.id, files);
          const addPhotoIds = uploaded.map(p => p.id);
          await ctxUpdateDiaryEntry(editingDiaryEntry.id, { add_photo_ids: addPhotoIds });
        }}
        onDeletePhoto={async (photoId) => {
          await ctxDeleteDiaryPhoto(photoId, project.id);
        }}
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
          aria-label="Műveletek"
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
          <div role="dialog" aria-modal="true" aria-label="Műveletek" className="bs-panel" style={{ padding: '0 0 calc(8px + env(safe-area-inset-bottom))' }}>
            <div className="bs-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '0 20px 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Műveletek
            </div>

            <button
              type="button"
              onClick={() => { setShowActionsSheet(false); setEditProjectOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Edit3 size={20} strokeWidth={1.75} color="#475569" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Szerkesztés</span>
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
              <span style={{ fontSize: 16, fontWeight: 600 }}>Előzmények</span>
            </button>

            {/* Delete */}
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 20px' }} />
            <button type="button" onClick={() => { setShowActionsSheet(false); handleDeleteProject(); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} strokeWidth={1.75} color="#b91c1c" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#b91c1c' }}>Törlés</span>
            </button>
          </div>
        </>
      )}

      {/* Mobile floating action button — opens QuickDiarySheet on napló tab, QuickCostSheet otherwise */}
      <button
        type="button"
        className="show-mobile"
        onClick={() => activeTab === 'naplo' ? setShowQuickDiarySheet(true) : setShowQuickCostSheet(true)}
        aria-label="Bejegyzés hozzáadása"
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
          setToast('Bejegyzés mentve');
          setTimeout(() => setToast(''), 2500);
        }}
      />

      <QuickDiarySheet
        isOpen={showQuickDiarySheet}
        onClose={() => setShowQuickDiarySheet(false)}
        projectId={project.id}
        onSuccess={() => {
          fetchDiaryEntries(project.id);
          setToast('Napló bejegyzés mentve');
          setTimeout(() => setToast(''), 2500);
        }}
      />
    </div>
  );
}
