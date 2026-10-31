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
import useMobile from '@/hooks/useMobile';
import {
  ArrowLeft, Plus, Receipt, Coins, Users, TrendingUp, TrendingDown,
  CheckCircle2, Camera, ArrowRight, Hammer, Clock, Trash2, Wallet, BookOpen,
  Edit3, UserCheck, CalendarDays, BookUser, BarChart3, ShieldCheck,
  Phone, Mail, MapPin, ChevronUp, Link2, Copy, Check, AlertCircle, Lock,
  FileText, Ruler, Home, Calendar, User,
  Sparkles, Loader2, Settings, ChevronDown, Download, PencilLine, Paperclip, EyeOff, Eye,
} from 'lucide-react';
import Lightbox from '@/components/Lightbox';
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


export default function ProjectDetailClient({
  project,
  initialUsers,
  initialInvoices,
  initialLabourEntries,
  client,
  clients,
  currentUser,
  isAdmin,
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
    closeProject: ctxCloseProject,
    reopenProject: ctxReopenProject,
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
    updateProject,
    createClient,
    clients: ctxClients,
    collectives,
    isDemoMode,
    refreshSupabaseData,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

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
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [memberArchiveModal, setMemberArchiveModal] = useState(false);
  const [lockedModalOpen, setLockedModalOpen] = useState(() => !!project?.locked_reason);
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
  const [editingDiaryEntry, setEditingDiaryEntry] = useState(null);
  const [editingLabour, setEditingLabour] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);
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
    if (isAdmin && activeTab === 'naplo' && project && shareTokens.length === 0 && !shareLoading) {
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
  const fin = React.useMemo(
    () => calculateProjectFinancials(project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser?.id),
    [project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser]
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

  const isClosed = !!project.closed_at;

  const handleCloseProject = () => {
    setConfirmModal({
      message: `Lezárja a(z) „${project.name}" projektet? A lezárt projekt újra megnyitható.`,
      onConfirm: async () => {
        try { await ctxCloseProject(project.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a lezáráskor' }); }
      }
    });
  };

  const handleReopenProject = async () => {
    try { await ctxReopenProject(project.id); }
    catch (err) { setAlertModal({ message: err.message || 'Hiba a megnyitáskor' }); }
  };

  const isOwner = project.owner_id === currentUser?.id || project.created_by === currentUser?.id;

  const handleArchiveToggle = () => {
    if (!isOwner && !isKollektivOwner) { setMemberArchiveModal(true); return; }
    setArchiveConfirm(true);
  };

  const doArchiveToggle = async () => {
    const val = project.archived_at ? null : new Date().toISOString();
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_at: val }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Hiba');
      router.refresh();
    } catch (err) {
      setAlertModal({ message: err.message });
    }
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
        try { await ctxDeleteLabourEntry(entryId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleSaveInvoice = async (invoiceId, fields) => {
    await ctxUpdateInvoice(invoiceId, fields);
    setDetailInvoice(null);
    router.refresh();
    setSuccessMsg('Számla frissítve.');
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
        try { await deleteProjectRoom(project.id, room.id); } catch (err) { setAlertModal({ message: err.message }); }
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
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                <ShieldCheck size={15} /> Adminisztrátori nézet
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{project.name}</h1>
              {isClosed && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                  Lezárt
                </span>
              )}
            </div>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
              <Camera size={15} /> <span>Bejegyzés</span>
            </Link>

            {canManageProject && (
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
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 6px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '170px', padding: '0.3rem', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); setEditProjectOpen(true); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Edit3 size={14} color="var(--text-muted)" /> Szerkesztés
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); isClosed ? handleReopenProject() : handleCloseProject(); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Lock size={14} color="var(--text-muted)" /> {isClosed ? 'Megnyitás' : 'Lezárás'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); handleArchiveToggle(); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      {project.archived_at
                        ? <Eye size={14} color="var(--text-muted)" />
                        : <EyeOff size={14} color="var(--text-muted)" />}
                      {project.archived_at ? 'Visszaállítás aktívra' : 'Inaktiválás'}
                    </button>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.3rem' }} />

                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); handleDeleteProject(); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--danger-text)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
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

      {/* Chart row: bar chart (40%) + burndown (60%) */}
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
                const actual = roomCost(room.id);
                const quoted = room.quoted_amount_net;
                const invCount = (invoicesByRoom[room.id] || []).length;
                const labCount = (labourByRoom[room.id] || []).length;
                return (
                  <div key={room.id} className="card" style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{room.name}</div>
                        {room.size_m2 != null && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            <Ruler size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{room.size_m2} m²
                          </div>
                        )}
                      </div>
                      {actual > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatHUF(actual)}</div>
                          {quoted != null && (
                            <div style={{ fontSize: '0.68rem', color: actual > quoted ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 600 }}>
                              {actual > quoted ? '↑' : '↓'} terv: {formatHUF(quoted)}
                            </div>
                          )}
                        </div>
                      )}
                      {actual === 0 && quoted != null && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>terv: {formatHUF(quoted)}</div>
                        </div>
                      )}
                    </div>
                    {room.work_types && room.work_types.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.35rem' }}>
                        {room.work_types.map(t => (
                          <span key={t} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {(invCount > 0 || labCount > 0) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                        {invCount > 0 && <span>{invCount} számla</span>}
                        {labCount > 0 && <span>{labCount} munka</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }} onClick={() => { setEditingRoom(room); setRoomModalOpen(true); }}>
                        <Edit3 size={11} /> Szerkesztés
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }} onClick={() => handleDeleteRoom(room)}>
                        <Trash2 size={11} /> Törlés
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* General (unassigned) costs */}
              {(invoicesByRoom['general']?.length > 0 || labourByRoom['general']?.length > 0) && (
                <div className="card" style={{ padding: '0.85rem 1rem', borderStyle: 'dashed' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Általános (szekció nélkül)</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem' }}>{formatHUF(roomCost('general'))}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                    {(invoicesByRoom['general']?.length || 0) > 0 && <span>{invoicesByRoom['general'].length} számla</span>}
                    {(labourByRoom['general']?.length || 0) > 0 && <span>{labourByRoom['general'].length} munka</span>}
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
            <select value={uploaderFilter} onChange={e => setUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
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
                <InvoiceCard key={inv.id} invoice={inv} room={projectRooms.find(r => r.id === inv.room_id) || null} onClick={() => setDetailInvoice(inv)} />
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
            <select value={labourUploaderFilter} onChange={e => setLabourUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
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
                const uploader = initialUsers.find(u => u.id === entry.uploaded_by);
                const canManageEntry = canManageProject || entry.uploaded_by === currentUser?.id;
                const entryRoom = projectRooms.find(r => r.id === entry.room_id) || null;
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                    <div>
                      {/* Top row: type badge + amount — mirrors InvoiceCard */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                          <Hammer size={11} /> Munkadíj
                        </span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success-text)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                          +{formatHUF(entry.value_huf)}
                        </span>
                      </div>

                      {/* Labour type — mirrors InvoiceCard description h4 */}
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                        {entry.labour_type}
                      </h4>

                      {/* Metadata row — same structure as InvoiceCard */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} color="var(--accent)" />
                          <strong style={{ color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} />
                          {formatDate(entry.date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} />
                          {entry.hours} {entry.unit || 'h'} × {formatHUF(entry.hourly_rate)}
                        </span>
                        {entryRoom ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>
                            <Home size={10} />{entryRoom.name}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>
                            <Home size={10} />Általános
                          </span>
                        )}
                      </div>

                      {entry.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{entry.description}</div>
                      )}

                      {/* Last-edit audit */}
                      {entry.updated_at && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <PencilLine size={10} />
                          {entry.updated_by_name ? `${entry.updated_by_name} · ` : ''}{formatDate(entry.updated_at)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', gap: '0.35rem' }}>
                      {canManageEntry && (
                        <button type="button" onClick={() => setEditingLabour(entry)} className="btn btn-secondary btn-sm" title="Szerkesztés">
                          <Edit3 size={13} />
                        </button>
                      )}
                      {canManageEntry && (
                        <button type="button" onClick={() => handleDeleteLabour(entry.id)} className="btn btn-danger btn-sm" title="Törlés">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
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
              {isAdmin && (
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
                {isAdmin && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}>
                    <Plus size={15} /> Első tétel hozzáadása
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {paymentPlan.map((item, idx) => {
                  const isOverdue = item.status === 'pending' && item.due_date && item.due_date < today;
                  const statusKey = isOverdue ? 'overdue' : item.status;
                  const statusDisplay = isOverdue
                    ? { label: 'Lejárt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
                    : (STATUS_DISPLAY[item.status] || STATUS_DISPLAY.pending);
                  const triggerDisplay = TRIGGER_DISPLAY[item.trigger_type] || TRIGGER_DISPLAY.milestone;

                  return (
                    <div key={item.id} className="card" style={{ padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {/* Left: label + trigger + milestone */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.label}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)', background: statusDisplay.bg, color: statusDisplay.color, border: `1px solid ${statusDisplay.border}` }}>
                              {statusDisplay.label}
                            </span>
                          </div>

                          {/* Trigger info */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', background: triggerDisplay.bg, color: triggerDisplay.color, border: `1px solid ${triggerDisplay.border}` }}>
                              {triggerDisplay.label}
                            </span>
                            {item.trigger_type === 'milestone' && item.milestone_name && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                → {item.milestone_name}
                              </span>
                            )}
                            {item.trigger_type === 'date' && item.due_date && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Calendar size={12} />
                                {new Date(item.due_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {item.note && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{item.note}</p>
                          )}
                          {item.status === 'paid' && item.paid_at && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--success-text)', margin: '0.25rem 0 0', fontWeight: 600 }}>
                              Fizetve: {new Date(item.paid_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          )}

                          {/* Files */}
                          {((item.files || []).length > 0 || isAdmin) && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                              {(item.files || []).length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: isAdmin ? '0.55rem' : 0 }}>
                                  {(item.files || []).map(f => {
                                    const isImg = f.mime_type?.startsWith('image/');
                                    const isPdf = f.mime_type === 'application/pdf' || f.file_name?.toLowerCase().endsWith('.pdf');
                                    const ext = f.file_name?.split('.').pop()?.toUpperCase() || '?';
                                    const docColors = {
                                      PDF: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                                      DOC: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                                      DOCX: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                                      XLS: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                                      XLSX: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                                    };
                                    const dc = docColors[ext] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border-subtle)' };
                                    return (
                                      <div key={f.id} style={{ position: 'relative' }}>
                                        <a
                                          href={f.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid ${isImg ? 'var(--border-subtle)' : dc.border}`, background: isImg ? 'var(--bg-subtle)' : dc.bg, aspectRatio: '1', textDecoration: 'none', cursor: 'pointer' }}
                                        >
                                          {isImg ? (
                                            <img src={f.file_url} alt={f.file_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            <>
                                              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{isPdf ? '📄' : '📎'}</span>
                                              <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: dc.color, padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>{ext}</span>
                                            </>
                                          )}
                                        </a>
                                        <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: '100%' }} title={f.file_name}>
                                          {f.file_name || 'fájl'}
                                        </div>
                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleFileDelete(item.id, f.id)}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                                            title="Törlés"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {isAdmin && (
                                <>
                                  <input
                                    type="file"
                                    id={`file-upload-${item.id}`}
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => { handleFileUpload(item.id, e.target.files); e.target.value = ''; }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                                    disabled={uploadingItemIds.has(item.id)}
                                    onClick={() => document.getElementById(`file-upload-${item.id}`).click()}
                                  >
                                    {uploadingItemIds.has(item.id) ? <><Loader2 size={11} className="animate-spin" /> Feltöltés...</> : <><Plus size={11} /> Melléklet</>}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: amount + actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {Number(item.amount_huf).toLocaleString('hu-HU')} Ft
                          </div>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {item.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.75rem' }}
                                  onClick={() => handleMarkPaid(item)}
                                  title="Fizetve jelöl"
                                >
                                  <CheckCircle2 size={13} /> Fizetve
                                </button>
                              )}
                              <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditingPayment(item); setShowPaymentModal(true); }} title="Szerkesztés">
                                <Edit3 size={13} />
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeletePayment(item)} title="Törlés">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                ? (fields) => handleUpdatePayment(editingPayment.id, fields).then(() => { setShowPaymentModal(false); setEditingPayment(null); setToast('Tétel frissítve.'); setTimeout(() => setToast(''), 2500); })
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
            <Link href={`${navPrefix}/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Új bejegyzés</Link>
          </div>
          {diaryLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>Betöltés...</div>
          ) : !diaryEntriesByProject[project.id] || diaryEntriesByProject[project.id].length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Még nincs bejegyzés ebben a naplóban</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Az első fotós bejegyzéssel kezd el dokumentálni a munkát.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Első bejegyzés</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.85rem' }}>
              {(diaryEntriesByProject[project.id] || []).map(entry => {
                const entryDateStr = entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
                const author = initialUsers.find(u => u.id === entry.created_by);
                const canDelete = entry.created_by === currentUser?.id || canManageProject;
                return (
                  <div key={entry.id} className="card" style={{ padding: '1rem' }}>
                    {/* Header row: badges + actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {entryDateStr && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>{entryDateStr}</span>}
                        {entry.work_type && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)' }}>{entry.work_type}</span>}
                        {(() => { const r = projectRooms.find(r => r.id === entry.room_id); return r ? <span style={{ fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}><Home size={10} />{r.name}</span> : null; })()}
                        {/* Public/private pill */}
                        {canManageProject || entry.created_by === currentUser?.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try { await ctxUpdateDiaryEntry(entry.id, { title: entry.title, body: entry.body, work_type: entry.work_type, internal_note: entry.internal_note, client_note: entry.client_note, entry_date: entry.entry_date, is_public: !entry.is_public }); }
                              catch (err) { setAlertModal({ message: err.message }); }
                            }}
                            style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        {(canManageProject || entry.created_by === currentUser?.id) && (
                          <Link href={`${navPrefix}/projektek/${project.id}/naplo/${entry.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                            <Edit3 size={13} />
                          </Link>
                        )}
                        {canDelete && (
                          <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setConfirmModal({ message: 'Biztosan törölni kívánja ezt a naplóbejegyzést?', onConfirm: async () => { try { await ctxDeleteDiaryEntry(entry.id, project.id); } catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); } } })}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title + author */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{entry.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                        {(author?.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{author?.display_name || 'Ismeretlen'}</span>
                    </div>

                    {entry.body && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 0.65rem', whiteSpace: 'pre-wrap' }}>{entry.body}</p>}

                    {/* Internal note — team only */}
                    {entry.internal_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <Lock size={11} /> Belső megjegyzés
                        </div>
                        {entry.internal_note}
                      </div>
                    )}

                    {/* Client note */}
                    {entry.client_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                          <Eye size={11} /> Ügyfélnek szóló üzenet
                        </div>
                        {entry.client_note}
                      </div>
                    )}

                    <EntryMediaGrid photos={entry.photos} />
                  </div>
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
          onClose={() => setEditingLabour(null)}
          onSave={async (fields) => {
            await ctxUpdateLabourEntry(editingLabour.id, fields);
            router.refresh();
            setEditingLabour(null);
            setSuccessMsg('Munkabejegyzés frissítve.');
          }}
        />
      )}

      <ProjectEditModal
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        clients={ctxClients}
        collectives={collectives}
        activeCollectiveId={activeCollectiveId}
        onSave={async (fields) => { await updateProject(project.id, fields); router.refresh(); }}
        onCreateClient={async (fields) => createClient(fields)}
        onMove={async (collectiveId) => { await updateProject(project.id, { collective_id: collectiveId }); router.refresh(); }}
      />
      <RoomModal isOpen={roomModalOpen} onClose={() => setRoomModalOpen(false)} room={editingRoom} onSave={handleSaveRoom} />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <ConfirmModal
        isOpen={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        onConfirm={() => { setArchiveConfirm(false); doArchiveToggle(); }}
        title={project.archived_at ? 'Visszaállítás aktívra' : 'Inaktiválás'}
        message={project.archived_at
          ? 'Biztosan visszaállítod aktív állapotba? A projekt ismét elérhető és szerkeszthető lesz.'
          : 'Biztosan inaktiválod ezt a projektet? Az állapotot később bármikor visszaállíthatod, ha meggondolod magad.'}
        confirmLabel={project.archived_at ? 'Visszaállítás' : 'Inaktiválás'}
      />
      <AlertModal
        isOpen={memberArchiveModal}
        onClose={() => setMemberArchiveModal(false)}
        variant="warning"
        title="Csak a tulajdonos módosíthatja"
        message="A dokumentum inaktiválását és visszaállítását csak a kollektíva tulajdonosa végezheti el, mivel az inaktív dokumentumok később visszaállíthatók, ha az ügyfél meggondolja magát."
      />
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
        onSave={async (id, fields, newFiles) => {
          let addPhotoIds = [];
          if (newFiles && newFiles.length > 0) {
            const uploaded = await uploadDiaryPhotos(project.id, newFiles);
            addPhotoIds = uploaded.map(p => p.id);
          }
          await ctxUpdateDiaryEntry(id, { ...fields, add_photo_ids: addPhotoIds });
          setSuccessMsg('Bejegyzés frissítve.');
        }}
        onDeletePhoto={async (photoId) => {
          await ctxDeleteDiaryPhoto(photoId, project.id);
        }}
      />

      {/* Invoice detail drawer */}
      {detailInvoice && (
        <InvoiceDetailDrawer
          invoice={detailInvoice}
          isAdmin={isAdmin || canManageProject || detailInvoice?.uploaded_by === currentUser?.id}
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

      {/* Mobile floating action button — opens QuickCostSheet */}
      <button
        type="button"
        className="show-mobile"
        onClick={() => setShowQuickCostSheet(true)}
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
    </div>
  );
}
