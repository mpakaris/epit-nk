'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES, QUOTE_ENTRY_TYPES, QUANTITY_UNITS, LABOUR_UNITS } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import StatusBadge from '@/components/StatusBadge';
import CollectiveBanner from '@/components/CollectiveBanner';
import ClientSelect from '@/components/ClientSelect';
import {
  ArrowLeft, MapPin, Calendar, Coins, Plus, Trash2, User, Wrench, Printer,
  CheckCircle2, XCircle, Send, FolderKanban, AlertCircle,
  Edit3, Loader2, Package, Hammer, Truck, MoreHorizontal, Ruler, Home,
  X, Copy, ExternalLink, Check, Camera, ChevronDown, ChevronUp,
  MessageSquare, CheckCheck, RotateCcw, Mic,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import useMobile from '@/hooks/useMobile';
import SectionCard from './components/SectionCard';
import SectionAddForm from './components/SectionAddForm';
import ClientComments from './components/ClientComments';
import { TYPE_ICONS, TYPE_COLORS, QUOTE_ENTRY_LABELS, sortEntries } from './components/constants';

const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '', user_id: '' };
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function NewClientModal({ isOpen, onClose, onCreate }) {
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [email, setEmail]   = useState('');
  const [address, setAddress] = useState('');
  const [gdpr, setGdpr]     = useState(false);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setName(''); setPhone(''); setEmail(''); setAddress(''); setGdpr(false); setError(''); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    if (!name.trim()) { setError('A név megadása kötelező!'); return; }
    if (!gdpr) { setError('Az ügyfél hozzájárulása szükséges.'); return; }
    setSaving(true);
    try { await onCreate({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), gdprConsent: gdpr }); reset(); }
    catch (err) { setError(err.message || 'Hiba'); }
    finally { setSaving(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Új ügyfél">
      {error && <div style={{ marginBottom: '0.85rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.82rem' }}>{error}</div>}
      <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" /></div>
      <div className="grid-2col">
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+36 70 …" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@…" /></div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} placeholder="Irányítószám, Város, utca" /></div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${gdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', margin: '0.75rem 0' }}>
        <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Az ügyfél hozzájárult adatainak tárolásához. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving || !gdpr} onClick={handleSave}>{saving ? <><Loader2 size={13} className="animate-spin" /> Létrehozás…</> : 'Létrehozás'}</button>
      </div>
    </Modal>
  );
}

function calcAmount(t, qty, up, flat) {
  if ((t === 'material' || t === 'labour') && qty && up) return Math.round(parseFloat(qty) * parseInt(up, 10));
  return parseInt(flat, 10) || 0;
}
// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    currentUser, isAdmin, loading, dataReady, activeCollectiveId, collectives,
    quotes, quoteEntries, quoteSections, clients, users, projects, surveys,
    cacheQuote,
    updateQuote, updateQuoteStatus, deleteQuote, convertQuoteToProject,
    createQuote, createClient,
    createQuoteSection, updateQuoteSection, deleteQuoteSection,
    createQuoteEntry, updateQuoteEntry, deleteQuoteEntry,
    fetchSurveyMedia, surveyEntriesBySurvey,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const isMobile  = useMobile();

  // Inline meta state
  const [metaTitle, setMetaTitle]           = useState('');
  const [metaLocation, setMetaLocation]     = useState('');
  const [metaWorkType, setMetaWorkType]     = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaStartDate, setMetaStartDate]   = useState('');
  const [metaEndDate, setMetaEndDate]       = useState('');
  const [metaClientId, setMetaClientId]     = useState('');
  const [metaTaxPercent, setMetaTaxPercent] = useState('27');
  const [metaOfferNumber,       setMetaOfferNumber]       = useState('');
  const [metaValidUntil,        setMetaValidUntil]        = useState('');
  const [metaOfferTerms,        setMetaOfferTerms]        = useState('');
  const [metaPaymentDays,       setMetaPaymentDays]       = useState('8');
  const [metaPaymentMethod,     setMetaPaymentMethod]     = useState('banki átutalás');
  const [metaDepositPercent,    setMetaDepositPercent]    = useState('0');
  const [metaWarrantyMonths,    setMetaWarrantyMonths]    = useState('0');
  const [metaInitialized, setMetaInitialized] = useState(false);
  const [savingMeta, setSavingMeta]         = useState(false);
  const [linkedSurveyData, setLinkedSurveyData] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Ref holds latest meta values so save-on-blur reads current state even if called
  // synchronously before a React re-render flushes (e.g. tax/client onClick)
  const metaRef = useRef({});
  metaRef.current = {
    title: metaTitle, location: metaLocation, workType: metaWorkType,
    description: metaDescription, startDate: metaStartDate, endDate: metaEndDate,
    clientId: metaClientId, taxPercent: metaTaxPercent,
    offerNumber: metaOfferNumber, validUntil: metaValidUntil, offerTerms: metaOfferTerms,
    paymentDays: metaPaymentDays, paymentMethod: metaPaymentMethod,
    depositPercent: metaDepositPercent, warrantyMonths: metaWarrantyMonths,
  };

  // Section management
  const [showAddSection, setShowAddSection] = useState(false);

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [editingEntryId, setEditingEntryId]   = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [pendingEntries, setPendingEntries] = useState([]);
  const [savingEntry, setSavingEntry] = useState(false);

  // Convert to project modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMembers, setConvertMembers]     = useState([]);
  const [isConverting, setIsConverting]         = useState(false);

  const [showSendConfirm, setShowSendConfirm]       = useState(false);

  // Actions bottom sheet
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showMemberRestriction, setShowMemberRestriction] = useState(null); // 'preview' | 'send'
  // Collapsable meta card (starts collapsed on mobile)
  const [metaCollapsed, setMetaCollapsed]       = useState(true);
  // Duplicate modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle,        setDuplicateTitle]        = useState('');
  const [duplicateWithClient,   setDuplicateWithClient]   = useState(true);
  const [duplicateWithSections, setDuplicateWithSections] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [attachTerms, setAttachTerms]               = useState(true);
  const [termsPdfName, setTermsPdfName]             = useState(null);
  const [profileIncomplete, setProfileIncomplete]   = useState(false);

  const openSendConfirm = async () => {
    if (!client?.email) { setAlertModal({ message: 'Az ügyfélnek nincs megadva email cím.' }); return; }
    try {
      const res  = await fetch('/api/auth/profile');
      const data = await res.json();
      const p    = data.profile || {};
      setTermsPdfName(p.terms_pdf_name || null);
      setAttachTerms(!!p.terms_pdf_url);
      // Warn if key contractor fields are missing (used on the PDF)
      const missing = !((p.company_name || p.display_name) && p.city && p.tax_number);
      setProfileIncomplete(missing);
    } catch { setTermsPdfName(null); setAttachTerms(false); setProfileIncomplete(false); }
    setShowSendConfirm(true);
  };
  const [sendProgress, setSendProgress] = useState(null); // null | { step, done, error }

  const SEND_STEPS = [
    { key: 'pdf',        label: 'PDF összeállítása…',      ms: 0    },
    { key: 'message',    label: 'E-mail szöveg elkészítése…', ms: 18000 },
    { key: 'recipients', label: 'Címzett hozzáadása…',     ms: 22000 },
    { key: 'sending',    label: 'Küldés…',                 ms: 25000 },
  ];

  const handleSendEmail = async () => {
    setShowSendConfirm(false);
    setSendProgress({ step: 0, done: false, error: null });

    if (isDemoMode) {
      // Simulate the send steps without hitting SMTP
      const delays = [0, 600, 1100, 1600];
      delays.forEach((ms, i) => {
        setTimeout(() => setSendProgress(p => p && !p.done ? { ...p, step: i } : p), ms);
      });
      setTimeout(() => {
        setSendProgress({ step: SEND_STEPS.length - 1, done: true, error: null, sentTo: client?.email || 'demo@okosszaki.hu' });
      }, 2000);
      return;
    }

    // Advance steps on a timer while API runs
    const timers = [];
    SEND_STEPS.forEach((s, i) => {
      if (i === 0) return; // step 0 starts immediately
      timers.push(setTimeout(() => setSendProgress(p => p && !p.done && !p.error ? { ...p, step: i } : p), s.ms));
    });

    try {
      const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachTerms }) });
      const data = await res.json();
      timers.forEach(clearTimeout);
      if (!res.ok) throw new Error(data.error || 'Ismeretlen hiba');
      await updateQuoteStatus(id, 'sent');
      setSendProgress({ step: SEND_STEPS.length - 1, done: true, error: null, sentTo: data.sentTo });
    } catch (err) {
      timers.forEach(clearTimeout);
      setSendProgress(p => ({ ...p, done: false, error: err.message }));
    }
  };

  const [confirmModal,       setConfirmModal]       = useState(null);
  const [alertModal,         setAlertModal]         = useState(null);
  const [copied,             setCopied]             = useState(false);
  const [lockedModalOpen,    setLockedModalOpen]    = useState(false);
  const [outgoingTransfers,  setOutgoingTransfers]  = useState([]);

  // Fallback: if the quote isn't in the current workspace context (e.g. personal
  // context while the quote belongs to a collective, or vice versa) fetch it directly.
  const [fallbackQuote,    setFallbackQuote]    = useState(null);
  const [fallbackEntries,  setFallbackEntries]  = useState(null);
  const [fallbackSections, setFallbackSections] = useState(null);
  const [fallbackFetching, setFallbackFetching] = useState(false);
  const [sectionMediaItemsMap, setSectionMediaItemsMap] = useState({});

  const ctxQuote = quotes.find(q => q.id === id);

  useEffect(() => {
    if (!dataReady || ctxQuote || fallbackFetching || fallbackQuote !== null) return;
    setFallbackFetching(true);
    fetch(`/api/quotes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.quote) {
          setFallbackQuote(d.quote);
          setFallbackEntries(d.entries);
          setFallbackSections(d.sections);
          cacheQuote(d.quote);
        }
        if (d?.mediaItems?.length) {
          const byOwner = {};
          for (const m of d.mediaItems) {
            if (!byOwner[m.owner_id]) byOwner[m.owner_id] = [];
            byOwner[m.owner_id].push(m);
          }
          setSectionMediaItemsMap(byOwner);
        }
      })
      .catch(() => {})
      .finally(() => setFallbackFetching(false));
  }, [dataReady, ctxQuote, id]);

  // For primary path (ctxQuote), load media_items separately
  useEffect(() => {
    if (!ctxQuote || !id || isDemoMode) return;
    fetch(`/api/quotes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.mediaItems?.length) return;
        const byOwner = {};
        for (const m of d.mediaItems) {
          if (!byOwner[m.owner_id]) byOwner[m.owner_id] = [];
          byOwner[m.owner_id].push(m);
        }
        setSectionMediaItemsMap(byOwner);
      })
      .catch(() => {});
  }, [id, !!ctxQuote]);

  const quote          = ctxQuote || fallbackQuote;
  const resolvedEntries  = ctxQuote ? quoteEntries.filter(e => e.quote_id === id) : (fallbackEntries  || []);
  const resolvedSections = ctxQuote ? quoteSections.filter(s => s.quote_id === id) : (fallbackSections || []);

  useEffect(() => {
    if (quote?.survey_id) fetchSurveyMedia(quote.survey_id).catch(() => {});
  }, [quote?.survey_id]);

  // Linked survey — look up in context first, fetch by ID if not found (cross-workspace)
  useEffect(() => {
    if (!quote?.survey_id) { setLinkedSurveyData(null); return; }
    const inCtx = surveys.find(s => s.id === quote.survey_id);
    if (inCtx) { setLinkedSurveyData(inCtx); return; }
    if (!isDemoMode) {
      fetch(`/api/surveys/${quote.survey_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.survey && setLinkedSurveyData(d.survey))
        .catch(() => {});
    }
  }, [quote?.survey_id, surveys, isDemoMode]);

  // Fetch outgoing transfers so we know pending/rejected state
  useEffect(() => {
    if (!dataReady || isDemoMode) return;
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOutgoingTransfers(d.requests || []))
      .catch(() => {});
  }, [dataReady, isDemoMode]);

  // Auto-open locked modal when document has a locked_reason
  useEffect(() => {
    if (quote?.locked_reason) setLockedModalOpen(true);
  }, [quote?.locked_reason]);

  useEffect(() => {
    if (!quote || metaInitialized) return;
    setMetaTitle(quote.title || '');
    setMetaLocation(quote.location || '');
    setMetaWorkType(quote.work_type || '');
    setMetaDescription(quote.description || '');
    setMetaStartDate(quote.start_date || '');
    setMetaEndDate(quote.end_date || '');
    setMetaClientId(quote.client_id || '');
    setMetaTaxPercent(String(quote.tax_percent ?? 27));
    setMetaOfferNumber(quote.offer_number || '');
    setMetaValidUntil(quote.valid_until || '');
    setMetaOfferTerms(quote.offer_terms_text || '');
    setMetaPaymentDays(quote.payment_deadline_days != null ? String(quote.payment_deadline_days) : '8');
    setMetaPaymentMethod(quote.payment_method || 'banki átutalás');
    setMetaDepositPercent(quote.deposit_percent != null ? String(quote.deposit_percent) : '0');
    setMetaWarrantyMonths(quote.warranty_months != null ? String(quote.warranty_months) : '0');
    setMetaInitialized(true);
  }, [quote, metaInitialized]);

  if (loading || !dataReady || fallbackFetching) return <PageSpinner />;
  if (!quote) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>Az ajánlat nem található</h2>
      <Link href={`${navPrefix}/ajanlatok`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client        = clients.find(c => c.id === quote.client_id);
  const creator       = users.find(u => u.id === quote.created_by);
  const entries       = resolvedEntries;
  const netTotal      = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate       = Number(quote.tax_percent ?? 27);
  const taxAmount     = Math.round(netTotal * taxRate / 100);
  const grossTotal    = netTotal + taxAmount;
  const isQuoteOwner     = quote.created_by === currentUser?.id || quote.owner_id === currentUser?.id;
  const isKollektivOwner = collectives?.some(c => c.collective_id === quote.collective_id && (c.role === 'owner' || c.role === 'admin'));
  const isCollMember     = !!(activeCollectiveId && quote.collective_id === activeCollectiveId);
  const isDocLocked   = !!quote.locked_reason;
  const canModify     = !isDocLocked && (isQuoteOwner || isKollektivOwner || (quote.shared_with || []).includes(currentUser?.id) || isCollMember);
  const isLocked      = quote.status === 'accepted' || quote.status === 'rejected';
  const canEdit       = canModify && !isLocked;
  const isPendingOutgoingTransfer = outgoingTransfers.some(t => t.document_id === id && t.status === 'pending');
  const transferAttemptCount = outgoingTransfers.filter(t => t.document_id === id && (t.status === 'rejected' || t.status === 'transfer_expired')).length;
  const linkedProject = quote.project_id ? projects.find(p => p.id === quote.project_id) : null;
  const linkedSurvey  = linkedSurveyData;
  const sections      = resolvedSections.sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));

  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);

  const isMetaDirty = canEdit && metaInitialized && (
    metaTitle       !== (quote.title        || '')                ||
    metaLocation    !== (quote.location     || '')                ||
    metaWorkType    !== (quote.work_type    || '')                ||
    metaDescription !== (quote.description || '')                ||
    metaStartDate   !== (quote.start_date   || '')                ||
    metaEndDate     !== (quote.end_date     || '')                ||
    metaClientId    !== (quote.client_id    || '')                ||
    metaTaxPercent  !== String(quote.tax_percent ?? 27)           ||
    metaOfferNumber    !== (quote.offer_number           || '')                     ||
    metaValidUntil     !== (quote.valid_until             || '')                     ||
    metaOfferTerms     !== (quote.offer_terms_text        || '')                     ||
    metaPaymentDays    !== String(quote.payment_deadline_days ?? 8)                  ||
    metaPaymentMethod  !== (quote.payment_method          || 'banki átutalás')       ||
    metaDepositPercent !== String(quote.deposit_percent   ?? 0)                      ||
    metaWarrantyMonths !== String(quote.warranty_months   ?? 0)
  );

  const STATUS_LABELS_HU = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };

  const doSaveMeta = async (revert) => {
    setSavingMeta(true);
    try {
      await updateQuote(id, {
        title: metaTitle.trim(), location: metaLocation.trim(), work_type: metaWorkType.trim(),
        description: metaDescription.trim(), start_date: metaStartDate || null, end_date: metaEndDate || null,
        client_id: metaClientId || null, tax_percent: Number(metaTaxPercent) || 0,
        offer_number:          metaOfferNumber.trim() || null,
        valid_until:           metaValidUntil || null,
        offer_terms_text:      metaOfferTerms.trim() || null,
        payment_deadline_days: metaPaymentDays !== '' ? Number(metaPaymentDays) : 8,
        payment_method:        metaPaymentMethod.trim() || null,
        deposit_percent:       metaDepositPercent !== '' ? Number(metaDepositPercent) : 0,
        warranty_months:       metaWarrantyMonths !== '' ? Number(metaWarrantyMonths) : 0,
      });
      if (revert) await updateQuoteStatus(id, 'draft');
      setMetaInitialized(false);
    } catch (err) { setAlertModal({ message: err.message }); }
    finally { setSavingMeta(false); }
  };

  const handleSaveMeta = async () => {
    if (!metaTitle.trim()) return;
    if (!quote || quote.status === 'draft') { doSaveMeta(false); return; }
    setConfirmModal({
      message: `Az ajánlat jelenlegi státusza: „${STATUS_LABELS_HU[quote.status] || quote.status}". Visszaállítja „Tervezet" státuszra?`,
      confirmLabel: 'Igen, visszaállítás',
      cancelLabel: 'Nem, maradjon',
      onConfirm: () => doSaveMeta(true),
      onClose:   () => doSaveMeta(false),
    });
  };

  // Auto-save on blur (draft only — non-draft requires explicit confirmation via handleSaveMeta)
  const autoSaveMeta = (overrides = {}) => {
    if (!metaInitialized) return;
    if (!quote || quote.status !== 'draft') return;
    const v = { ...metaRef.current, ...overrides };
    if (!v.title.trim()) return;
    setSavingMeta(true);
    updateQuote(id, {
      title: v.title.trim(), location: v.location.trim(), work_type: v.workType.trim(),
      description: v.description.trim(), start_date: v.startDate || null, end_date: v.endDate || null,
      client_id: v.clientId || null, tax_percent: Number(v.taxPercent) || 0,
      offer_number:          v.offerNumber?.trim()    || null,
      valid_until:           v.validUntil             || null,
      offer_terms_text:      v.offerTerms?.trim()     || null,
      payment_deadline_days: v.paymentDays !== '' ? Number(v.paymentDays) : 8,
      payment_method:        v.paymentMethod?.trim()  || null,
      deposit_percent:       v.depositPercent !== '' ? Number(v.depositPercent) : 0,
      warranty_months:       v.warrantyMonths !== '' ? Number(v.warrantyMonths) : 0,
    }).catch(err => setAlertModal({ message: err.message })).finally(() => setSavingMeta(false));
  };

  // ── Status handlers ───────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') { setConvertMembers(currentUser ? [currentUser.id] : []); setShowConvertModal(true); return; }
    try { await updateQuoteStatus(id, newStatus); }
    catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try { const proj = await convertQuoteToProject(id, convertMembers); setShowConvertModal(false); router.push(`${navPrefix}/projektek/${proj.id}`); }
    catch (err) { setAlertModal({ message: err.message }); }
    finally { setIsConverting(false); }
  };

  const handleDeleteQuote = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${quote.title}" ajánlatot?`,
      onConfirm: async () => {
        try { await deleteQuote(id); router.push(`${navPrefix}/ajanlatok`); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleResetToDraft = async () => {
    try { await updateQuoteStatus(id, 'draft'); }
    catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const newQuote = await createQuote({
        title: duplicateTitle.trim() || `${quote.title} – Másolat`,
        location: quote.location,
        workType: quote.work_type,
        description: quote.description,
        startDate: quote.start_date,
        endDate: quote.end_date,
        clientId: duplicateWithClient ? quote.client_id : null,
        taxPercent: quote.tax_percent,
        surveyId: null,
        collectiveId: quote.collective_id,
      });
      if (duplicateWithSections) {
        for (const section of sections) {
          const newSection = await createQuoteSection(newQuote.id, {
            name: section.name, description: section.description || null,
            width_m: section.width_m ?? null, length_m: section.length_m ?? null,
            height_m: section.height_m ?? null, window_count: section.window_count || 0,
            door_count: section.door_count || 0, sort_order: section.sort_order ?? 0,
          });
          const sectionEntries = entries.filter(e => e.section_id === section.id);
          for (const e of sectionEntries) {
            await createQuoteEntry(newSection.id, e.entry_type, e.work_description, e.quantity, e.unit, e.unit_price, e.amount_huf, e.notes || '', null, currentUser.id);
          }
        }
        // Unsectioned entries
        const general = entries.filter(e => !e.section_id);
        for (const e of general) {
          await createQuoteEntry(null, e.entry_type, e.work_description, e.quantity, e.unit, e.unit_price, e.amount_huf, e.notes || '', null, currentUser.id);
        }
      }
      setShowDuplicateModal(false);
      router.push(`${navPrefix}/ajanlatok/${newQuote.id}`);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setIsDuplicating(false);
    }
  };

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleAddSection = async (fields) => {
    try {
      await createQuoteSection(id, {
        name: fields.name, description: fields.description || null,
        width_m: fields.width_m ?? null, length_m: fields.length_m ?? null,
        height_m: fields.height_m ?? null, window_count: fields.window_count || 0,
        door_count: fields.door_count || 0,
        survey_entry_id: fields._surveyEntryId || null,
        start_date: fields.start_date || null, end_date: fields.end_date || null,
      });
      setShowAddSection(false);
    } catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleDeleteSection = (section) => {
    const entryCount = entries.filter(e => e.section_id === section.id).length;
    setConfirmModal({
      message: `Biztosan törölni kívánja „${section.name}" szekciót?${entryCount ? ` ${entryCount} tétel is törlődik.` : ''}`,
      onConfirm: async () => {
        try { await deleteQuoteSection(id, section.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  // ── Entry modal ───────────────────────────────────────────────────────────
  const openEntryModal = (sectionId, editEntryId = null) => {
    setActiveSectionId(sectionId);
    setPendingEntries([]);
    if (editEntryId) {
      const entry = entries.find(e => e.id === editEntryId);
      if (entry) {
        const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
        setEntryForm({ entry_type: entry.entry_type, work_description: entry.work_description, quantity: entry.quantity != null ? String(entry.quantity) : '', unit: entry.unit || 'db', unit_price: entry.unit_price != null ? String(entry.unit_price) : '', flat_amount: !useQty ? String(entry.amount_huf) : '', notes: entry.notes || '', user_id: entry.user_id || currentUser.id });
        setEditingEntryId(editEntryId);
      }
    } else {
      setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: currentUser.id });
      setEditingEntryId(null);
    }
    setEntryError('');
    setShowEntryModal(true);
  };

  const buildEntry = () => {
    const useQty = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    return {
      entry_type: entryForm.entry_type,
      work_description: entryForm.work_description.trim(),
      quantity: useQty && entryForm.quantity ? parseFloat(entryForm.quantity) : null,
      unit: useQty && entryForm.unit ? entryForm.unit : null,
      unit_price: useQty && entryForm.unit_price ? parseInt(entryForm.unit_price, 10) : null,
      amount_huf: previewAmount,
      notes: entryForm.notes.trim(),
      user_id: entryForm.user_id || currentUser.id,
    };
  };

  const handleAddAnother = () => {
    if (!entryForm.work_description.trim()) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    setPendingEntries(prev => [...prev, { ...buildEntry(), _tmpKey: Date.now() + Math.random() }]);
    setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: entryForm.user_id, entry_type: entryForm.entry_type });
    setEntryError('');
  };

  const doSaveEntry = async (revert) => {
    const hasCurrent = entryForm.work_description.trim();
    setSavingEntry(true);
    try {
      if (editingEntryId) {
        await updateQuoteEntry(editingEntryId, { ...buildEntry(), section_id: activeSectionId });
      } else {
        const allEntries = hasCurrent ? [...pendingEntries, buildEntry()] : pendingEntries;
        for (const e of allEntries) {
          await createQuoteEntry({ quoteId: id, userId: e.user_id, workDescription: e.work_description, amountHuf: e.amount_huf, notes: e.notes, entryType: e.entry_type, quantity: e.quantity, unit: e.unit, unitPrice: e.unit_price, sectionId: activeSectionId });
        }
      }
      if (revert) await updateQuoteStatus(id, 'draft');
      setPendingEntries([]);
      setShowEntryModal(false);
    } catch (err) {
      setEntryError(err.message || 'Hiba a mentésnél');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleSaveEntry = async () => {
    setEntryError('');
    const hasCurrent = entryForm.work_description.trim();
    if (!hasCurrent && pendingEntries.length === 0) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (hasCurrent && previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    if (!quote || quote.status === 'draft') { doSaveEntry(false); return; }
    setConfirmModal({
      message: `Az ajánlat jelenlegi státusza: „${STATUS_LABELS_HU[quote.status] || quote.status}". Visszaállítja „Tervezet" státuszra?`,
      confirmLabel: 'Igen, visszaállítás',
      cancelLabel: 'Nem, maradjon',
      onConfirm: () => doSaveEntry(true),
      onClose:   () => doSaveEntry(false),
    });
  };

  const handleDeleteEntry = (entry) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.work_description}" tételt?`,
      onConfirm: async () => {
        try { await deleteQuoteEntry(entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const renderSectionCard = (section) => {
    const sectionEntries = section ? entries.filter(e => e.section_id === section.id) : entries.filter(e => !e.section_id);
    const sectionTotal   = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    const surveyEntry    = section?.survey_entry_id && quote.survey_id
      ? (surveyEntriesBySurvey[quote.survey_id] || []).find(e => e.id === section.survey_entry_id)
      : null;

    // Named section — felmeres-style SectionCard
    if (section) return (
      <SectionCard
        key={section.id}
        section={section}
        surveyEntry={surveyEntry}
        surveyId={quote.survey_id}
        quoteId={id}
        canEdit={canEdit}
        isQuoteOwner={isQuoteOwner || isAdmin || isKollektivOwner}
        currentUserId={currentUser?.id}
        onDelete={handleDeleteSection}
        onAddEntry={(sId) => openEntryModal(sId)}
        onEditEntry={(sId, eId) => openEntryModal(sId, eId)}
        onDeleteEntry={handleDeleteEntry}
        sectionEntries={sortEntries(sectionEntries)}
        sectionMediaItems={sectionMediaItemsMap[section.id] || []}
        quote={quote}
        onEntriesGenerated={() => {}}
      />
    );

    // General (unsectioned) entries — simple header card
    return (
      <div key="_general" className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: 'var(--bg-subtle)', borderBottom: sectionEntries.length > 0 ? '1px solid var(--border-subtle)' : 'none', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MoreHorizontal size={14} />Általános tételek</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {sectionTotal > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{formatHUF(sectionTotal)}</span>}
            {canEdit && <button type="button" onClick={() => openEntryModal(null)} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem' }} title="Tétel hozzáadása"><Plus size={12} /></button>}
          </div>
        </div>
        {sectionEntries.length === 0 ? (
          <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortEntries(sectionEntries).map((entry, idx) => renderEntryRow(entry, idx, null))}
          </div>
        )}
      </div>
    );
  };

  const renderEntryRow = (entry, idx, sectionId) => {
    const Icon = TYPE_ICONS[entry.entry_type] || MoreHorizontal;
    const tc   = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
    const contributor = users.find(u => u.id === entry.user_id);
    const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
    return (
      <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.65rem 1rem', borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
        <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={14} color={tc.color} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.15rem', fontSize: '0.9rem' }}>{entry.work_description}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_LABELS[entry.entry_type]}</span>
            {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit || 'db'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>}
            {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} />{contributor.display_name}</span>}
            {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(entry.amount_huf)}</span>
          {canEdit && (
            <>
              <button type="button" onClick={() => openEntryModal(sectionId, entry.id)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><Edit3 size={11} /></button>
              <button type="button" onClick={() => handleDeleteEntry(entry)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
            </>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`${navPrefix}/ajanlatok`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlatokhoz
        </Link>
      </div>

      <CollectiveBanner documentCollectiveId={quote.collective_id ?? null} />
      {isDocLocked && !lockedModalOpen && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)', fontWeight: 600, flex: 1 }}>
              🔒 Ez az ajánlat csak olvasható.
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

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{metaTitle || quote.title}</h1>
          <StatusBadge status={quote.status} size="md" />
          {canEdit && isMetaDirty && quote.status !== 'draft' && (
            <button type="button" onClick={handleSaveMeta} disabled={savingMeta} className="btn btn-primary btn-sm">
              {savingMeta ? <><Loader2 size={13} className="animate-spin" />Mentés</> : <><Check size={13} />Mentés</>}
            </button>
          )}
        </div>
      </div>


      {/* Client portal link */}
      {quote.status !== 'draft' && client && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flexWrap: 'wrap' }}>
          <ExternalLink size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>Az ajánlat látható az ügyfél portálon</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { const url = `${window.location.origin}/clients/${client.id}`; navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                {copied ? <><CheckCircle2 size={13} /> Másolva!</> : <><Copy size={13} /> Link másolása</>}
              </button>
              <Link href={`/clients/${client.id}`} target="_blank" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}><ExternalLink size={13} /> Megnyitás</Link>
            </div>
          </div>
        </div>
      )}

      {/* Meta card — collapsable */}
      <div className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => setMetaCollapsed(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '0.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {client && <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{client.name}</span>}
            {quote.location && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} />{quote.location}</span>}
            {!client && !quote.location && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Általános adatok</span>}
          </div>
          {metaCollapsed ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronUp size={16} color="var(--text-muted)" />}
        </button>

        {/* Collapsable content */}
        {!metaCollapsed && <div style={{ padding: '0 1.25rem 1.1rem', borderTop: '1px solid var(--border-subtle)' }}>
        {canEdit ? (
          <>
            <div className="form-group">
              <label className="form-label">Ajánlat neve *</label>
              <input type="text" className="form-control" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} onBlur={autoSaveMeta} placeholder="pl. Fürdőszoba felújítás" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Helyszín</label>
                <input type="text" className="form-control" value={metaLocation} onChange={e => setMetaLocation(e.target.value)} onBlur={autoSaveMeta} placeholder="pl. Budapest, Fő u. 12." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Munka típusa</label>
                <input type="text" className="form-control" value={metaWorkType} onChange={e => setMetaWorkType(e.target.value)} onBlur={autoSaveMeta} placeholder="pl. Teljes felújítás" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Leírás</label>
              <textarea rows={2} className="form-control" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} onBlur={autoSaveMeta} placeholder="Részletes munkaleírás…" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                <label className="form-label">Tervezett kezdés</label>
                <input type="date" className="form-control" value={metaStartDate} onChange={e => { const v = e.target.value; setMetaStartDate(v); if (v && (!metaEndDate || metaEndDate <= v)) setMetaEndDate(nextDay(v)); }} onBlur={autoSaveMeta} />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                <label className="form-label">Tervezett befejezés</label>
                <input type="date" className="form-control" min={metaStartDate ? nextDay(metaStartDate) : undefined} value={metaEndDate} onChange={e => setMetaEndDate(e.target.value)} onBlur={autoSaveMeta} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">ÁFA kulcs</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {['0', '5', '18', '27'].map(v => (
                  <button key={v} type="button" onClick={() => { setMetaTaxPercent(v); autoSaveMeta({ taxPercent: v }); }}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: metaTaxPercent === v ? 'var(--accent)' : 'var(--bg-subtle)', color: metaTaxPercent === v ? '#fff' : 'var(--text-secondary)', border: `1px solid ${metaTaxPercent === v ? 'var(--accent)' : 'var(--border-subtle)'}` }}>{v}%</button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ügyfél</label>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ClientSelect value={metaClientId} onChange={e => { setMetaClientId(e.target.value); autoSaveMeta({ clientId: e.target.value }); }} clients={clients} />
                </div>
                <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Plus size={14} /> Új ügyfél
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Ajánlat száma</label>
                <input type="text" className="form-control" value={metaOfferNumber} onChange={e => setMetaOfferNumber(e.target.value)} onBlur={autoSaveMeta} placeholder="pl. 2024/001" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Érvényes</label>
                <input type="date" className="form-control" value={metaValidUntil} onChange={e => setMetaValidUntil(e.target.value)} onBlur={autoSaveMeta} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fizetési határidő <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(nap)</span></label>
                <input type="number" min="0" className="form-control" value={metaPaymentDays} onChange={e => setMetaPaymentDays(e.target.value)} onBlur={autoSaveMeta} placeholder="8" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fizetési mód</label>
                <input type="text" className="form-control" value={metaPaymentMethod} onChange={e => setMetaPaymentMethod(e.target.value)} onBlur={autoSaveMeta} placeholder="banki átutalás" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Előleg <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(%)</span></label>
                <input type="number" min="0" max="100" className="form-control" value={metaDepositPercent} onChange={e => setMetaDepositPercent(e.target.value)} onBlur={autoSaveMeta} placeholder="0" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Garancia <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(hónap)</span></label>
                <input type="number" min="0" className="form-control" value={metaWarrantyMonths} onChange={e => setMetaWarrantyMonths(e.target.value)} onBlur={autoSaveMeta} placeholder="0" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              <label className="form-label">Egyéb feltételek <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(lábjegyzet)</span></label>
              <textarea className="form-control" rows={2} value={metaOfferTerms} onChange={e => setMetaOfferTerms(e.target.value)} onBlur={autoSaveMeta} placeholder="pl. Az ajánlat vállalkozásunk ÁSZF-je mellett érvényes." style={{ resize: 'vertical', fontSize: '0.82rem' }} />
            </div>
            {creator && <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Létrehozta: <strong>{creator.display_name}</strong>{quote.created_at && ` · ${formatDate(quote.created_at)}`}</div>}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '0.6rem 0.85rem', alignItems: 'center' }}>
            {client && (<><User size={15} color="var(--accent)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link href={`${navPrefix}/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>{client.name}</Link>
                {client.discount_percent > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>{client.discount_percent}% kedv.</span>}
              </div>
            </>)}
            {quote.location && (<><MapPin size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.location}</span></>)}
            {quote.work_type && (<><Wrench size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.work_type}</span></>)}
            <><Calendar size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.start_date ? formatDate(quote.start_date) : '—'} – {quote.end_date ? formatDate(quote.end_date) : '—'}</span></>
            <><Coins size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ÁFA: <strong style={{ color: 'var(--text-primary)' }}>{taxRate}%</strong></span></>
            <><User size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Létrehozta: <strong style={{ color: 'var(--text-primary)' }}>{creator?.display_name || '—'}</strong>{quote.created_at && <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatDate(quote.created_at)}</span>}</span></>
          </div>
        )}
        {(linkedSurvey || linkedProject) && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.85rem', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {linkedSurvey && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}><Ruler size={13} color="var(--accent)" style={{ flexShrink: 0 }} /><Link href={`${navPrefix}/felmeres/${linkedSurvey.id}`} style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{linkedSurvey.title}</Link>{linkedSurvey.date && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(linkedSurvey.date)}</span>}</div>}
            {linkedProject && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FolderKanban size={15} color="var(--success)" /><Link href={`${navPrefix}/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.875rem' }}>{linkedProject.name}</Link></div>}
          </div>
        )}
        </div>}
      </div>

      {/* Sections + totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Tételek</h2>
        {canEdit && (
          <button type="button" onClick={() => { setShowAddSection(true); }} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Hozzáadás
          </button>
        )}
      </div>

      {/* Totals summary */}
      {entries.length > 0 && (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.75rem' }}>
          {/* Nettó + ÁFA */}
          <div style={{ display: 'grid', gridTemplateColumns: taxRate > 0 ? '1fr 1fr' : '1fr' }}>
            <div style={{ padding: '0.85rem 1.1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Nettó</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatHUF(netTotal)}</div>
            </div>
            {taxRate > 0 && (
              <div style={{ padding: '0.85rem 1.1rem', borderLeft: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>ÁFA ({taxRate}%)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>{formatHUF(taxAmount)}</div>
              </div>
            )}
          </div>
          {/* Bruttó — hero */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', background: '#0f172a', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>Bruttó összeg</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.35rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Coins size={16} color="rgba(255,255,255,0.5)" />
              {formatHUF(grossTotal)}
            </div>
          </div>
        </div>
      )}

      {canEdit && showAddSection && (
        <SectionAddForm surveyId={quote.survey_id} onSave={handleAddSection} onCancel={() => setShowAddSection(false)} />
      )}

      {sections.length === 0 && !showAddSection && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <Home size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ marginBottom: canEdit ? '1rem' : 0 }}>Még nincsenek helyiségek.</p>
          {canEdit && (
            <button type="button" onClick={() => { setShowAddSection(true); }} className="btn btn-primary btn-sm">
              <Plus size={14} /> Hozzáadás
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {sections.map(s => renderSectionCard(s))}
        {renderSectionCard(null)}
      </div>

      {/* Client comment history */}
      {canModify && <ClientComments quoteId={id} />}

      {/* Entry modal */}
      <Modal isOpen={showEntryModal} onClose={() => { setShowEntryModal(false); setPendingEntries([]); }} title={editingEntryId ? 'Tétel szerkesztése' : 'Tételek hozzáadása'}>
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--success-bg)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hozzáadásra kész: {pendingEntries.length} db</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._tmpKey || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatHUF(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(p => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {(() => {
          const section = sections.find(s => s.id === activeSectionId);
          if (!section && activeSectionId) return null;
          return section ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
              <Home size={13} />{section.name}{section.size_m2 ? ` · ${section.size_m2} m²` : ''}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <MoreHorizontal size={13} /> Általános tételek
            </div>
          );
        })()}

        {entryError &&<div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}

        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(t => { const Icon = TYPE_ICONS[t.id]; const tc = TYPE_COLORS[t.id]; const active = entryForm.entry_type === t.id; return (
            <button key={t.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`, background: active ? tc.bg : '#fff', cursor: 'pointer' }}>
              <Icon size={18} color={active ? tc.color : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
            </button>
          ); })}
        </div>

        <div className="form-group">
          <label className="form-label">Megnevezés *</label>
          <input type="text" className="form-control" autoFocus placeholder={entryForm.entry_type === 'material' ? 'pl. Gipszkarton lap 12,5mm' : entryForm.entry_type === 'labour' ? 'pl. Gipszkarton szerelés' : 'pl. Állványzat bérlés'} value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
        </div>
        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div className="qty-grid">
            <div>
              <label className="form-label">Mennyiség</label>
              <input inputMode="decimal" type="number" min="0" step="0.01" className="form-control text-mono" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Egység</label>
              <select className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>
                {(entryForm.entry_type === 'labour' ? LABOUR_UNITS : QUANTITY_UNITS).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Egységár (Ft)</label>
              <input inputMode="decimal" type="number" min="0" className="form-control text-mono" placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
          </div>
        )}
        {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
          <div className="form-group"><label className="form-label">Összeg (Ft) *</label><input inputMode="decimal" type="number" min="1" className="form-control text-mono" placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} /></div>
        )}
        {previewAmount > 0 && <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Coins size={15} /> Tétel: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(previewAmount)}</span></div>}

        <div className="form-group">
          <label className="form-label">Kivitelező</label>
          <select className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
            <option value={currentUser.id}>Saját magam ({currentUser.display_name})</option>
            {users.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés (opcionális)</label>
          <input type="text" className="form-control" placeholder="pl. Anyaggal együtt, 2. emelet" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {!editingEntryId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAnother}>+ Következő</button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry} disabled={savingEntry}>
            {savingEntry ? <><Loader2 size={13} className="animate-spin" />Mentés…</> : editingEntryId ? 'Módosítás' : pendingEntries.length > 0 ? `Hozzáadás (${pendingEntries.length + (entryForm.work_description.trim() ? 1 : 0)} db)` : 'Hozzáadás'}
          </button>
        </div>
      </Modal>

      {/* Convert to project modal */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Projektté alakítás">
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Válassza ki a projekt tagjait. A cím és dátumok az ajánlatból kerülnek át.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {[...(currentUser && !users.find(u => u.id === currentUser.id) ? [{ id: currentUser.id, display_name: `${currentUser.display_name} (Ön)` }] : []), ...users].map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: convertMembers.includes(u.id) ? 'var(--accent-light)' : '#fff' }}>
              <input type="checkbox" checked={convertMembers.includes(u.id)} onChange={e => setConvertMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.display_name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConvertModal(false)}>Mégse</button>
          <button type="button" onClick={handleConvert} disabled={isConverting} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
            {isConverting ? <><Loader2 size={14} className="animate-spin" />Átalakítás…</> : <><FolderKanban size={14} />Létrehozás</>}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => { confirmModal?.onClose?.(); setConfirmModal(null); }}
        onConfirm={() => confirmModal?.onConfirm?.()}
        title="Megerősítés"
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
        cancelLabel={confirmModal?.cancelLabel}
      />
      {/* Email sending progress — blocking modal */}
      {sendProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '2rem 2.5rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 800 }}>
              {sendProgress.error ? 'Hiba történt' : sendProgress.done ? 'Elküldve!' : 'Ajánlat küldése…'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {SEND_STEPS.map((s, i) => {
                const isActive  = !sendProgress.done && !sendProgress.error && sendProgress.step === i;
                const isDone    = sendProgress.done || sendProgress.step > i;
                const isPending = !isDone && !isActive;
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-subtle)',
                      border: isPending ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      {isDone  && <CheckCircle2 size={14} color="#fff" />}
                      {isActive && <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {sendProgress.error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.825rem', marginBottom: '1rem' }}>
                {sendProgress.error}
              </div>
            )}

            {(sendProgress.done || sendProgress.error) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSendProgress(null)}>
                  Bezárás
                </button>
              </div>
            )}

            {sendProgress.done && sendProgress.sentTo && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                Elküldve: <strong>{sendProgress.sentTo}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Email send confirmation */}
      {showSendConfirm && (
        <Modal isOpen={true} onClose={() => setShowSendConfirm(false)} title="Ajánlat kiküldése emailben">

          {profileIncomplete && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--warning-text)' }}>
                <AlertCircle size={15} /> Hiányos vállalkozói adatok
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--warning-text)', lineHeight: 1.55 }}>
                A profilodban hiányoznak az ajánlaton megjelenő adatok (cégnév, város, adószám). Az ügyfél hiányos fejléccel kapja meg az ajánlatot.
              </p>
              <Link href={`${navPrefix}/profil`} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '0.15rem', fontSize: '0.8rem' }}>
                Profil kitöltése →
              </Link>
            </div>
          )}

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
            Biztosan elküldi az ajánlatot{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{client?.name}</strong>{' '}
            email-címére?
          </p>
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)' }}>
            {client?.email}
          </div>

          {termsPdfName && (
            <button
              type="button"
              onClick={() => setAttachTerms(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: attachTerms ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${attachTerms ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left', marginBottom: '1.25rem' }}
            >
              <div style={{ width: 36, height: 20, borderRadius: 10, background: attachTerms ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: attachTerms ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: attachTerms ? 'var(--success-text)' : 'var(--text-primary)' }}>
                  {attachTerms ? 'ÁSZF csatolva' : 'ÁSZF nem csatolva'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{termsPdfName}</div>
              </div>
            </button>
          )}

          {isDemoMode && (
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span>Demo módban az email valójában nem kerül elküldésre.</span>
              <Link href={`${navPrefix}/ajanlatok/${id}/nyomtatas`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Printer size={13} /> PDF letöltés
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSendConfirm(false)}>Mégse</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSendEmail}>
              <Send size={14} /> Küldés
            </button>
          </div>
        </Modal>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant} />

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={async (fields) => {
          const c = await createClient({ ...fields });
          setMetaClientId(c.id);
          autoSaveMeta({ clientId: c.id });
          setShowNewClientModal(false);
        }}
      />

      <LockedDocumentModal
        isOpen={lockedModalOpen}
        documentType="quote"
        documentId={id}
        lockedReason={quote.locked_reason}
        transferAttempts={transferAttemptCount}
        onDelete={async () => {
          await deleteQuote(id, quote);
          router.push(`${navPrefix}/ajanlatok`);
        }}
        onUnlocked={() => {
          setLockedModalOpen(false);
          setFallbackQuote(prev => prev ? { ...prev, locked_reason: null, locked_at: null } : null);
        }}
        onKeepReadOnly={() => setLockedModalOpen(false)}
      />

      {/* ── Floating actions button ── */}
      {canModify && (
        <button
          type="button"
          onClick={() => setShowActionsSheet(true)}
          aria-label="Műveletek"
          style={{
            position: 'fixed', bottom: 'calc(96px + env(safe-area-inset-bottom))', right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: '#0f172a', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(15,23,42,0.35)',
            cursor: 'pointer', zIndex: 50,
          }}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
        </button>
      )}

      {/* ── Actions bottom sheet ── */}
      {showActionsSheet && (
        <>
          <div
            onClick={() => setShowActionsSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200 }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Műveletek"
            className="bs-panel"
            style={{ padding: '0 0 calc(8px + env(safe-area-inset-bottom))' }}
          >
            <div className="bs-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '0 20px 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Műveletek
            </div>

            {/* PDF Preview */}
            {(isQuoteOwner || isKollektivOwner) ? (
              <Link
                href={`${navPrefix}/ajanlatok/${id}/nyomtatas`}
                onClick={() => setShowActionsSheet(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', textDecoration: 'none', color: '#0f172a' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Printer size={20} strokeWidth={1.75} color="#475569" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Előnézet / PDF</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); setShowMemberRestriction('preview'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Printer size={20} strokeWidth={1.75} color="#475569" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Előnézet / PDF</span>
              </button>
            )}

            {/* Send email */}
            {canModify && (
              (isQuoteOwner || isKollektivOwner) ? (
                <button
                  type="button"
                  onClick={() => { setShowActionsSheet(false); openSendConfirm(); }}
                  disabled={!client?.email || isPendingOutgoingTransfer}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: (client?.email && !isPendingOutgoingTransfer) ? 'pointer' : 'default', textAlign: 'left', opacity: (client?.email && !isPendingOutgoingTransfer) ? 1 : 0.45 }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={20} strokeWidth={1.75} color="#475569" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{quote.status === 'sent' ? 'Újraküldés' : 'Küldés'}</div>
                    {!client?.email && <div style={{ fontSize: 12, color: '#94a3b8' }}>Az ügyfélnek nincs email címe</div>}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowActionsSheet(false); setShowMemberRestriction('send'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={20} strokeWidth={1.75} color="#475569" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{quote.status === 'sent' ? 'Újraküldés' : 'Küldés'}</div>
                </button>
              )
            )}

            {/* Accept → Project */}
            {canModify && !isLocked && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); handleStatusChange('accepted'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} strokeWidth={1.75} color="#16a34a" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Elfogadás → Projekt</span>
              </button>
            )}

            {/* Reject */}
            {canModify && !isLocked && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); handleStatusChange('rejected'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <XCircle size={20} strokeWidth={1.75} color="#ef4444" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Elutasítva</span>
              </button>
            )}

            {/* Save (only when dirty and non-draft — draft auto-saves on blur) */}
            {canEdit && isMetaDirty && quote.status !== 'draft' && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); handleSaveMeta(); }}
                disabled={savingMeta}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={20} strokeWidth={1.75} color="#2563eb" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Mentés</span>
              </button>
            )}

            {/* Reset rejected → draft */}
            {quote.status === 'rejected' && canModify && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); handleResetToDraft(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RotateCcw size={20} strokeWidth={1.75} color="#16a34a" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Visszaállítás</span>
              </button>
            )}

            {/* Duplicate */}
            {canModify && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); setDuplicateTitle(`${quote.title} – Másolat`); setDuplicateWithClient(true); setDuplicateWithSections(true); setShowDuplicateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Copy size={20} strokeWidth={1.75} color="#475569" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Másolás</span>
              </button>
            )}

            {/* Delete */}
            {canModify && (
              <button
                type="button"
                onClick={() => { setShowActionsSheet(false); handleDeleteQuote(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56, padding: '0 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={20} strokeWidth={1.75} color="#ef4444" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#ef4444' }}>Ajánlat törlése</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Member restriction sheet ── */}
      {showMemberRestriction && (
        <>
          <div onClick={() => setShowMemberRestriction(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200 }} aria-hidden="true" />
          <div role="dialog" aria-modal="true" className="bs-panel" style={{ padding: '0 0 calc(20px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {showMemberRestriction === 'send' ? <Send size={22} strokeWidth={1.75} color="#c2410c" /> : <Printer size={22} strokeWidth={1.75} color="#c2410c" />}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                  {showMemberRestriction === 'send' ? 'Ajánlat küldése' : 'Előnézet / PDF'}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Csak a tulajdonos számára elérhető</div>
              </div>
            </div>
            <div style={{ margin: '8px 20px 16px', padding: '14px 16px', borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#9a3412', lineHeight: 1.55 }}>
                {showMemberRestriction === 'send'
                  ? 'Ajánlatot csak az ajánlat tulajdonosa küldhet az ügyfélnek. Te közreműködőként hozzáadhatsz tételeket, de a végleges ajánlatot a tulajdonos küldi el.'
                  : 'Az ajánlat előnézetét és PDF letöltését csak a tulajdonos érheti el, mivel az ő fejléce és adatai szerepelnek rajta.'}
              </p>
            </div>
            <div style={{ padding: '0 20px' }}>
              <button type="button" onClick={() => setShowMemberRestriction(null)} className="btn btn-secondary" style={{ width: '100%' }}>Rendben</button>
            </div>
          </div>
        </>
      )}

      {/* ── Duplicate modal ── */}
      <Modal isOpen={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} title="Ajánlat másolása">
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Új ajánlat neve</label>
          <input
            type="text"
            className="form-control"
            autoFocus
            value={duplicateTitle}
            onChange={e => setDuplicateTitle(e.target.value)}
            placeholder={`${quote?.title} – Másolat`}
          />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Mit másoljon át?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1px solid ${duplicateWithClient ? 'var(--accent-border)' : 'var(--border-subtle)'}`, background: duplicateWithClient ? 'var(--accent-light)' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithClient} onChange={e => setDuplicateWithClient(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Ügyfél</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{client?.name || 'Nincs megrendelő'}</div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1px solid ${duplicateWithSections ? 'var(--accent-border)' : 'var(--border-subtle)'}`, background: duplicateWithSections ? 'var(--accent-light)' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithSections} onChange={e => setDuplicateWithSections(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Szekciók és tételek</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sections.length} szekció · {entries.length} tétel</div>
            </div>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDuplicateModal(false)}>Mégse</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <><Loader2 size={13} className="animate-spin" />Másolás…</> : <><Copy size={13} />Másolás</>}
          </button>
        </div>
      </Modal>

    </div>
  );
}
