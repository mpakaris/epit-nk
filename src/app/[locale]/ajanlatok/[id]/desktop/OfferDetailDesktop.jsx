'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate, QUOTE_ENTRY_TYPES, QUANTITY_UNITS, LABOUR_UNITS } from '@/lib/constants';
import { podColor } from '@/lib/podColor';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import StatusBadge from '@/components/StatusBadge';
import CollectiveBanner from '@/components/CollectiveBanner';
import ClientSelect from '@/components/ClientSelect';
import NewClientModal from '@/components/NewClientModal';
import PageSpinner from '@/components/PageSpinner';
import SectionAddForm from '../components/SectionAddForm';
import ClientComments from '../components/ClientComments';
import CollectiveChatSection from '@/components/CollectiveChatSection';
import { TYPE_ICONS, TYPE_COLORS, sortEntries } from '../components/constants';
import {
  ArrowLeft, MapPin, Calendar, Coins, Plus, Trash2, User, Wrench, Printer,
  CheckCircle2, XCircle, Send, FolderKanban, AlertCircle,
  Edit3, Loader2, MoreHorizontal, Ruler, Home,
  X, Copy, ExternalLink, Check, ChevronDown, ChevronUp,
  MessageSquare, RotateCcw,
} from 'lucide-react';

const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '', user_id: '' };
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function calcAmount(t, qty, up, flat) {
  if ((t === 'material' || t === 'labour') && qty && up) return Math.round(parseFloat(qty) * parseInt(up, 10));
  return parseInt(flat, 10) || 0;
}

export default function OfferDetailDesktop() {
  const t  = useTranslations('quotes');
  const tc = useTranslations('common');
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
    userCurrency,
    contextSwitching,
  } = useApp();

  const fmt = (n) => formatMoney(n, userCurrency);
  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;
  const AppLink = isDemoMode ? Link : LocaleLink;

  const activeColl    = (collectives || []).find(c => c.collective_id === activeCollectiveId);
  const workspaceLabel = activeColl ? activeColl.name : t('desktop.workspacePersonal');
  const wsStyle = activeCollectiveId
    ? { '--dk-c': podColor(activeCollectiveId).deep }
    : {};

  // ── Meta state ────────────────────────────────────────────────────────────
  const [metaTitle,       setMetaTitle]       = useState('');
  const [metaLocation,    setMetaLocation]    = useState('');
  const [metaWorkType,    setMetaWorkType]    = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaStartDate,   setMetaStartDate]   = useState('');
  const [metaEndDate,     setMetaEndDate]     = useState('');
  const [metaClientId,    setMetaClientId]    = useState('');
  const [metaTaxPercent,  setMetaTaxPercent]  = useState('27');
  const [metaOfferNumber,       setMetaOfferNumber]       = useState('');
  const [metaValidUntil,        setMetaValidUntil]        = useState('');
  const [metaOfferTerms,        setMetaOfferTerms]        = useState('');
  const [metaPaymentDays,       setMetaPaymentDays]       = useState('8');
  const [metaPaymentMethod,     setMetaPaymentMethod]     = useState('');
  const [metaDepositPercent,    setMetaDepositPercent]    = useState('0');
  const [metaWarrantyMonths,    setMetaWarrantyMonths]    = useState('0');
  const [metaInitialized, setMetaInitialized] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [linkedSurveyData, setLinkedSurveyData] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [metaCollapsed, setMetaCollapsed] = useState(true);

  const initialCollectiveRef = useRef(activeCollectiveId);
  const metaRef = useRef({});
  metaRef.current = {
    title: metaTitle, location: metaLocation, workType: metaWorkType,
    description: metaDescription, startDate: metaStartDate, endDate: metaEndDate,
    clientId: metaClientId, taxPercent: metaTaxPercent,
    offerNumber: metaOfferNumber, validUntil: metaValidUntil, offerTerms: metaOfferTerms,
    paymentDays: metaPaymentDays, paymentMethod: metaPaymentMethod,
    depositPercent: metaDepositPercent, warrantyMonths: metaWarrantyMonths,
  };

  // ── Section/Entry state ───────────────────────────────────────────────────
  const [showAddSection,  setShowAddSection]  = useState(false);
  const [showEntryModal,  setShowEntryModal]  = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [editingEntryId,  setEditingEntryId]  = useState(null);
  const [entryForm,       setEntryForm]       = useState(EMPTY_ENTRY_FORM);
  const [entryError,      setEntryError]      = useState('');
  const [pendingEntries,  setPendingEntries]  = useState([]);
  const [savingEntry,     setSavingEntry]     = useState(false);

  // ── Convert / status state ────────────────────────────────────────────────
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting,     setIsConverting]     = useState(false);
  const [convertedProject, setConvertedProject] = useState(null);
  const [convertError,     setConvertError]     = useState(null);
  const [showSendConfirm,  setShowSendConfirm]  = useState(false);
  const [sendProgress,     setSendProgress]     = useState(null);
  const [attachTerms,      setAttachTerms]      = useState(true);
  const [termsPdfName,     setTermsPdfName]     = useState(null);
  const [sendRecipient,    setSendRecipient]    = useState('');
  const [sendSelectedTerms, setSendSelectedTerms] = useState({ profileTerms: true, fileIds: [] });
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [downloadingPdf,   setDownloadingPdf]   = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history,          setHistory]          = useState(null);
  const [historyTotal,     setHistoryTotal]     = useState(0);
  const [historyLoading,   setHistoryLoading]   = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  // ── Duplicate state ───────────────────────────────────────────────────────
  const [showDuplicateModal,    setShowDuplicateModal]    = useState(false);
  const [duplicateTitle,        setDuplicateTitle]        = useState('');
  const [duplicateWithClient,   setDuplicateWithClient]   = useState(true);
  const [duplicateWithSections, setDuplicateWithSections] = useState(true);
  const [isDuplicating,         setIsDuplicating]         = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [confirmModal,       setConfirmModal]       = useState(null);
  const [alertModal,         setAlertModal]         = useState(null);
  const [copied,             setCopied]             = useState(false);
  const [showClientModal,    setShowClientModal]    = useState(false);
  const [showTermsModal,     setShowTermsModal]     = useState(false);
  const [termsLocal,         setTermsLocal]         = useState(null); // local copy for instant modal updates
  const [uploadingTerms,     setUploadingTerms]     = useState(false);
  const [lockedModalOpen,    setLockedModalOpen]    = useState(false);
  const [outgoingTransfers,  setOutgoingTransfers]  = useState([]);
  const [fallbackQuote,      setFallbackQuote]      = useState(null);
  const [fallbackEntries,    setFallbackEntries]    = useState(null);
  const [fallbackSections,   setFallbackSections]   = useState(null);
  const [fallbackFetching,   setFallbackFetching]   = useState(false);
  const [sectionMediaItemsMap, setSectionMediaItemsMap] = useState({});

  // ── Section collapse state ────────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState(new Set());
  const toggleSection = (id) => setExpandedSections(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  // ── Section edit modal ────────────────────────────────────────────────────
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [editingSection,       setEditingSection]       = useState(null);
  const [editSecName,          setEditSecName]          = useState('');
  const [editSecDesc,          setEditSecDesc]          = useState('');
  const [savingSection,        setSavingSection]        = useState(false);

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
  const resolvedEntries  = fallbackEntries  !== null ? fallbackEntries  : quoteEntries.filter(e => e.quote_id === id);
  const resolvedSections = fallbackSections !== null ? fallbackSections : quoteSections.filter(s => s.quote_id === id);

  useEffect(() => {
    if (quote?.survey_id) fetchSurveyMedia(quote.survey_id).catch(() => {});
  }, [quote?.survey_id]);

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

  useEffect(() => {
    if (!dataReady || isDemoMode) return;
    fetch('/api/auth/profile')
      .then(r => r.ok ? r.json() : {})
      .then(d => { if (d.profile?.terms_pdf_name) setTermsPdfName(d.profile.terms_pdf_name); })
      .catch(() => {});
  }, [dataReady, isDemoMode]);

  useEffect(() => {
    if (!dataReady || isDemoMode) return;
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOutgoingTransfers(d.requests || []))
      .catch(() => {});
  }, [dataReady, isDemoMode]);

  useEffect(() => {
    if (quote?.locked_reason) setLockedModalOpen(true);
  }, [quote?.locked_reason]);

  useEffect(() => {
    if (!showTermsModal || !quote) return;
    setTermsLocal(prev => prev ? { ...prev, attachments: quote.terms_attachments || [] } : null);
  }, [quote?.terms_attachments, showTermsModal]);

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
    setMetaPaymentMethod(quote.payment_method || '');
    setMetaDepositPercent(quote.deposit_percent != null ? String(quote.deposit_percent) : '0');
    setMetaWarrantyMonths(quote.warranty_months != null ? String(quote.warranty_months) : '0');
    setMetaInitialized(true);
  }, [quote, metaInitialized]);

  useEffect(() => {
    if (!dataReady) return;
    if (activeCollectiveId !== initialCollectiveRef.current) {
      router.push(p('/ajanlatok'));
    }
  }, [activeCollectiveId, dataReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !dataReady || fallbackFetching) return <PageSpinner />;
  if (!quote) return (
    <div className="dk-page dk-mod-quotes" style={wsStyle}>
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1 }}><h1 className="dk-h1">{t('notFound')}</h1></div>
      </header>
      <div className="dk-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button className="dk-btn dk-btn-l" onClick={() => router.push(p('/ajanlatok'))}>
          <ArrowLeft size={18} /> {t('back')}
        </button>
      </div>
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
  const convertCollectiveName = collectives?.find(c => c.collective_id === quote.collective_id)?.name || null;
  const isCollMember     = !!(quote.collective_id && collectives?.some(c => c.collective_id === quote.collective_id));
  const isDocLocked   = !!quote.locked_reason;
  const canModify     = !isDocLocked && (isQuoteOwner || isKollektivOwner || (quote.shared_with || []).includes(currentUser?.id) || isCollMember);
  const isLocked      = quote.status === 'accepted' || quote.status === 'rejected';
  const canEdit       = canModify && !isLocked;
  const isPendingOutgoingTransfer = outgoingTransfers.some(t => t.document_id === id && t.status === 'pending');
  const linkedProject = quote.project_id ? projects.find(pr => pr.id === quote.project_id) : null;
  const linkedSurvey  = linkedSurveyData;
  const sections      = resolvedSections.sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);
  const STATUS_LABELS_HU = { draft: t('statusDraft'), sent: t('statusSent'), accepted: t('statusAccepted'), rejected: t('statusRejected') };

  const isMetaDirty = canEdit && metaInitialized && (
    metaTitle       !== (quote.title        || '') ||
    metaLocation    !== (quote.location     || '') ||
    metaWorkType    !== (quote.work_type    || '') ||
    metaDescription !== (quote.description  || '') ||
    metaStartDate   !== (quote.start_date   || '') ||
    metaEndDate     !== (quote.end_date     || '') ||
    metaClientId    !== (quote.client_id    || '') ||
    metaTaxPercent  !== String(quote.tax_percent ?? 27) ||
    metaOfferNumber    !== (quote.offer_number    || '') ||
    metaValidUntil     !== (quote.valid_until     || '') ||
    metaOfferTerms     !== (quote.offer_terms_text || '') ||
    metaPaymentDays    !== String(quote.payment_deadline_days ?? 8) ||
    metaPaymentMethod  !== (quote.payment_method  || '') ||
    metaDepositPercent !== String(quote.deposit_percent ?? 0) ||
    metaWarrantyMonths !== String(quote.warranty_months ?? 0)
  );

  // ── Send ──────────────────────────────────────────────────────────────────
  const SEND_STEPS = [
    { key: 'pdf',        label: t('sendStepPdf'),        ms: 0     },
    { key: 'message',    label: t('sendStepMessage'),    ms: 18000 },
    { key: 'recipients', label: t('sendStepRecipients'), ms: 22000 },
    { key: 'sending',    label: t('sendStepSending'),    ms: 25000 },
  ];

  const openSendConfirm = async () => {
    setSendRecipient(client?.email || '');
    try {
      const res  = await fetch('/api/auth/profile');
      const data = await res.json();
      const pr   = data.profile || {};
      setTermsPdfName(pr.terms_pdf_name || null);
      setAttachTerms(!!pr.terms_pdf_url);
      const missing = !((pr.company_name || pr.display_name) && pr.city && pr.tax_number);
      setProfileIncomplete(missing);
      setSendSelectedTerms({
        profileTerms: !!pr.terms_pdf_url,
        fileIds: [],
      });
    } catch {
      setTermsPdfName(null); setAttachTerms(false); setProfileIncomplete(false);
      setSendSelectedTerms({ profileTerms: false, fileIds: [] });
    }
    setShowSendConfirm(true);
  };

  const handleSendEmail = async () => {
    setShowSendConfirm(false);
    setSendProgress({ step: 0, done: false, error: null });
    if (isDemoMode) {
      const delays = [0, 600, 1100, 1600];
      delays.forEach((ms, i) => { setTimeout(() => setSendProgress(pr => pr && !pr.done ? { ...pr, step: i } : pr), ms); });
      setTimeout(() => { setSendProgress({ step: SEND_STEPS.length - 1, done: true, error: null, sentTo: client?.email || 'demo@okosszaki.hu' }); }, 2000);
      return;
    }
    const timers = [];
    SEND_STEPS.forEach((s, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setSendProgress(pr => pr && !pr.done && !pr.error ? { ...pr, step: i } : pr), s.ms));
    });
    try {
      const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_email: sendRecipient || undefined, selectedTerms: sendSelectedTerms }) });
      const data = await res.json();
      timers.forEach(clearTimeout);
      if (!res.ok) throw new Error(data.error || t('errorUnknown'));
      const sentUpdated = await updateQuoteStatus(id, 'sent');
      if (fallbackQuote && sentUpdated) setFallbackQuote(sentUpdated);
      setSendProgress({ step: SEND_STEPS.length - 1, done: true, error: null, sentTo: data.sentTo });
    } catch (err) {
      timers.forEach(clearTimeout);
      setSendProgress(pr => ({ ...pr, done: false, error: err.message }));
    }
  };

  // ── Meta save ─────────────────────────────────────────────────────────────
  const doSaveMeta = async (revert) => {
    setSavingMeta(true);
    try {
      const metaUpdated = await updateQuote(id, {
        title: metaTitle.trim(), location: metaLocation.trim(), work_type: metaWorkType.trim(),
        description: metaDescription.trim(), start_date: metaStartDate || null, end_date: metaEndDate || null,
        client_id: metaClientId || null, tax_percent: Number(metaTaxPercent) || 0,
        offer_number: metaOfferNumber.trim() || null, valid_until: metaValidUntil || null,
        offer_terms_text: metaOfferTerms.trim() || null,
        payment_deadline_days: metaPaymentDays !== '' ? Number(metaPaymentDays) : 8,
        payment_method: metaPaymentMethod.trim() || null,
        deposit_percent: metaDepositPercent !== '' ? Number(metaDepositPercent) : 0,
        warranty_months: metaWarrantyMonths !== '' ? Number(metaWarrantyMonths) : 0,
      });
      const reverted = revert ? await updateQuoteStatus(id, 'draft') : null;
      if (fallbackQuote) setFallbackQuote(reverted || metaUpdated);
      setMetaInitialized(false);
    } catch (err) { setAlertModal({ message: err.message }); }
    finally { setSavingMeta(false); }
  };

  const handleSaveMeta = async () => {
    if (!metaTitle.trim()) return;
    if (!quote || quote.status === 'draft') { doSaveMeta(false); return; }
    setConfirmModal({
      message: t('statusRevertConfirm', { status: STATUS_LABELS_HU[quote.status] || quote.status }),
      confirmLabel: t('statusRevertYes'),
      confirmStyle: { background: '#0F172A' },
      cancelLabel: t('statusRevertNo'),
      onConfirm: () => doSaveMeta(true),
      onClose:   () => doSaveMeta(false),
    });
  };

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
      offer_number: v.offerNumber?.trim() || null, valid_until: v.validUntil || null,
      offer_terms_text: v.offerTerms?.trim() || null,
      payment_deadline_days: v.paymentDays !== '' ? Number(v.paymentDays) : 8,
      payment_method: v.paymentMethod?.trim() || null,
      deposit_percent: v.depositPercent !== '' ? Number(v.depositPercent) : 0,
      warranty_months: v.warrantyMonths !== '' ? Number(v.warrantyMonths) : 0,
    }).catch(err => setAlertModal({ message: err.message })).finally(() => setSavingMeta(false));
  };

  // ── Status handlers ───────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') { setConvertedProject(null); setConvertError(null); setShowConvertModal(true); return; }
    if (newStatus === 'rejected') {
      setConfirmModal({
        message: t('rejectConfirmMessage'),
        confirmLabel: t('actionReject'),
        confirmStyle: { background: '#DC2626', color: '#fff' },
        onConfirm: async () => {
          try {
            const updated = await updateQuoteStatus(id, 'rejected');
            if (fallbackQuote && updated) setFallbackQuote(updated);
          } catch (err) { setAlertModal({ message: err.message }); }
        },
      });
      return;
    }
    try {
      const updated = await updateQuoteStatus(id, newStatus);
      if (fallbackQuote && updated) setFallbackQuote(updated);
    } catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleConvert = async () => {
    setIsConverting(true); setConvertError(null);
    try { const proj = await convertQuoteToProject(id); setConvertedProject(proj); }
    catch (err) { setConvertError(err.message || tc('error')); }
    finally { setIsConverting(false); }
  };

  const handleDeleteQuote = () => {
    setConfirmModal({
      message: t('deleteConfirmMessage', { title: quote.title }),
      onConfirm: async () => {
        try { await deleteQuote(id); router.push(p('/ajanlatok')); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleResetToDraft = async () => {
    try {
      const updated = await updateQuoteStatus(id, 'draft');
      if (fallbackQuote && updated) setFallbackQuote(updated);
    } catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const newQuote = await createQuote({
        title: duplicateTitle.trim() || `${quote.title} – ${t('duplicateSuffix')}`,
        location: quote.location, workType: quote.work_type, description: quote.description,
        startDate: quote.start_date, endDate: quote.end_date,
        clientId: duplicateWithClient ? quote.client_id : null,
        taxPercent: quote.tax_percent, surveyId: null, collectiveId: quote.collective_id,
      });
      if (duplicateWithSections) {
        for (const section of sections) {
          const newSection = await createQuoteSection(newQuote.id, {
            name: section.name, description: section.description || null,
            width_m: section.width_m ?? null, length_m: section.length_m ?? null,
            height_m: section.height_m ?? null, window_count: section.window_count || 0,
            door_count: section.door_count || 0, sort_order: section.sort_order ?? 0,
          });
          for (const e of entries.filter(e => e.section_id === section.id)) {
            await createQuoteEntry({ quoteId: newQuote.id, userId: currentUser.id, workDescription: e.work_description, amountHuf: e.amount_huf, notes: e.notes || '', entryType: e.entry_type, quantity: e.quantity, unit: e.unit, unitPrice: e.unit_price, sectionId: newSection.id });
          }
        }
        for (const e of entries.filter(e => !e.section_id)) {
          await createQuoteEntry({ quoteId: newQuote.id, userId: currentUser.id, workDescription: e.work_description, amountHuf: e.amount_huf, notes: e.notes || '', entryType: e.entry_type, quantity: e.quantity, unit: e.unit, unitPrice: e.unit_price, sectionId: null });
        }
      }
      setShowDuplicateModal(false);
      router.push(p(`/ajanlatok/${newQuote.id}`));
    } catch (err) { setAlertModal({ message: err.message }); }
    finally { setIsDuplicating(false); }
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
      message: t('deleteSectionConfirm', { name: section.name, extra: entryCount ? t('deleteSectionEntries', { count: entryCount }) : '' }),
      onConfirm: async () => {
        try { await deleteQuoteSection(id, section.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  // ── Section edit modal ────────────────────────────────────────────────────
  const openEditSection = (section) => {
    setEditingSection(section);
    setEditSecName(section.name || '');
    setEditSecDesc(section.description || '');
    setShowEditSectionModal(true);
  };

  const handleSaveEditSection = async () => {
    if (!editingSection || !editSecName.trim()) return;
    setSavingSection(true);
    try {
      await updateQuoteSection(id, editingSection.id, {
        name: editSecName.trim(),
        description: editSecDesc.trim() || null,
        width_m: editingSection.width_m ?? null,
        length_m: editingSection.length_m ?? null,
        height_m: editingSection.height_m ?? null,
        window_count: editingSection.window_count || 0,
        door_count: editingSection.door_count || 0,
        start_date: editingSection.start_date || null,
        end_date: editingSection.end_date || null,
      });
      setShowEditSectionModal(false);
    } catch (err) { setAlertModal({ message: err.message }); }
    finally { setSavingSection(false); }
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
    if (!entryForm.work_description.trim()) { setEntryError(t('entryNameRequired')); return; }
    if (previewAmount <= 0) { setEntryError(t('entryAmountZero')); return; }
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
      setEntryError(err.message || tc('error'));
    } finally { setSavingEntry(false); }
  };

  const handleSaveEntry = async () => {
    setEntryError('');
    const hasCurrent = entryForm.work_description.trim();
    if (!hasCurrent && pendingEntries.length === 0) { setEntryError(t('entryNameRequired')); return; }
    if (hasCurrent && previewAmount <= 0) { setEntryError(t('entryAmountZero')); return; }
    if (!quote || quote.status === 'draft') { doSaveEntry(false); return; }
    setConfirmModal({
      message: t('statusRevertConfirm', { status: STATUS_LABELS_HU[quote.status] || quote.status }),
      confirmLabel: t('statusRevertYes'),
      confirmStyle: { background: '#0F172A' },
      cancelLabel: t('statusRevertNo'),
      onConfirm: () => doSaveEntry(true),
      onClose:   () => { setPendingEntries([]); setShowEntryModal(false); },
    });
  };

  const handleDeleteEntry = (entry) => {
    setConfirmModal({
      message: t('deleteEntryConfirm', { desc: entry.work_description }),
      onConfirm: async () => {
        try { await deleteQuoteEntry(entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const openHistory = async () => {
    setShowHistoryModal(true);
    if (history !== null) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/quotes/${id}/history?limit=10&offset=0`);
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
      const res = await fetch(`/api/quotes/${id}/history?limit=10&offset=${history.length}`);
      const data = await res.json();
      setHistory(prev => [...(prev || []), ...(data.history || [])]);
      setHistoryTotal(data.total || 0);
    } catch {}
    finally { setHistoryLoadingMore(false); }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`);
      if (!res.ok) throw new Error(t('pdfGenerateFailed'));
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'Ajanlat.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally { setDownloadingPdf(false); }
  };

  // ── Desktop section pod renderer (DO2 design) ────────────────────────────
  const ENTRY_GRID = '88px 1fr 60px 50px 110px 130px';

  const renderDesktopSectionPod = (section) => {
    const isGeneral = section === null;
    const sectionEntries = isGeneral
      ? sortEntries(entries.filter(e => !e.section_id))
      : sortEntries(entries.filter(e => e.section_id === section.id));
    const sectionTotal = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    const sectionId = section?.id || null;

    const isCollapsed = !expandedSections.has(sectionId || '_general');

    return (
      <section key={sectionId || '_general'} className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Section header — clickable to collapse/expand */}
        <div
          onClick={() => toggleSection(sectionId || '_general')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 10px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: '#0E1116' }}>
              {isGeneral ? t('generalItems') : section.name}
            </span>
            {!isGeneral && section.description && (
              <span style={{ fontSize: 13, color: '#8A8F98', fontWeight: 500 }}>{section.description}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {sectionTotal > 0 && (
              <b style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: '#0E1116' }}>{fmt(sectionTotal)}</b>
            )}
            {!isGeneral && canEdit && (
              <>
                {!isCollapsed && (
                  <button type="button" onClick={e => { e.stopPropagation(); openEntryModal(sectionId); }}
                    style={{ height: 32, padding: '0 12px', borderRadius: 16, border: 0, background: '#F1F1F3', color: '#5A5F68', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    <Plus size={13} /> {t('desktop.addEntry')}
                  </button>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); openEditSection(section); }}
                  style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: '#1E293B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <MoreHorizontal size={14} />
                </button>
              </>
            )}
            {isCollapsed ? <ChevronDown size={18} color="#8A8F98" /> : <ChevronUp size={18} color="#8A8F98" />}
          </div>
        </div>

        {/* Column headers + rows + add button (hidden when collapsed) */}
        {!isCollapsed && sectionEntries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: ENTRY_GRID, padding: '0 18px', height: 40, alignItems: 'center', gap: 12, borderTop: '1px solid #EDEBE5', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>
            <span>{t('desktop.colType')}</span>
            <span>{t('desktop.colItem')}</span>
            <span>{t('desktop.colQty')}</span>
            <span>{t('desktop.colUnit')}</span>
            <span>{t('desktop.colUnitPrice')}</span>
            <span style={{ textAlign: 'right' }}>{t('desktop.colSubtotal')}</span>
          </div>
        )}

        {/* Entry rows */}
        {!isCollapsed && sectionEntries.map((entry) => {
          const Icon = TYPE_ICONS[entry.entry_type] || MoreHorizontal;
          const tc2  = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
          const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
          return (
            <div key={entry.id} onClick={canEdit ? () => openEntryModal(sectionId, entry.id) : undefined} style={{ display: 'grid', gridTemplateColumns: ENTRY_GRID, padding: '0 18px', minHeight: 60, alignItems: 'center', gap: 12, borderTop: '1px solid #EDEBE5', fontSize: 14, fontWeight: 600, cursor: canEdit ? 'pointer' : 'default' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 12, background: tc2.bg, color: tc2.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <Icon size={10} /> {ENTRY_TYPE_T[entry.entry_type]}
                </span>
              </span>
              <span style={{ minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.work_description}
                {entry.notes && <span style={{ fontSize: 12, color: '#8A8F98', fontWeight: 500, marginLeft: 6 }}>{entry.notes}</span>}
              </span>
              <span style={{ color: '#5A5F68' }}>{useQty && entry.quantity != null ? entry.quantity : ''}</span>
              <span style={{ color: '#5A5F68' }}>{useQty ? (entry.unit || 'db') : ''}</span>
              <span style={{ color: '#5A5F68', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {useQty && entry.unit_price ? fmt(entry.unit_price) : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, textAlign: 'right' }}>
                {fmt(entry.amount_huf)}
              </span>
            </div>
          );
        })}

        {/* Empty state */}
        {!isCollapsed && sectionEntries.length === 0 && (
          <div style={{ padding: '10px 18px', fontSize: 13, color: '#8A8F98', fontStyle: 'italic', borderTop: '1px solid #EDEBE5' }}>
            {t('noItems')}
          </div>
        )}

      </section>
    );
  };

  // ── Pods form style constants ─────────────────────────────────────────────
  const LBL = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070' };
  const INP = { background: '#F4F5F8', boxShadow: 'none' };
  const ENTRY_TYPE_T = {
    material:  t('entryTypeMaterial'),
    labour:    t('entryTypeLabour'),
    equipment: t('entryTypeEquipment'),
    transport: t('entryTypeTransport'),
    other:     t('entryTypeOther'),
  };

  // ── STATUS BADGE COLOURS (white on dark for header) ───────────────────────
  const STATUS_HEADER_STYLE = {
    draft:    { background: 'rgba(255,255,255,.18)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' },
    sent:     { background: 'rgba(251,191,36,.25)',  color: '#FCD34D', borderColor: 'rgba(251,191,36,.4)' },
    accepted: { background: 'rgba(52,211,153,.25)',  color: '#6EE7B7', borderColor: 'rgba(52,211,153,.4)' },
    rejected: { background: 'rgba(248,113,113,.25)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,.4)' },
  };
  const headerStatusStyle = STATUS_HEADER_STYLE[quote.status] || STATUS_HEADER_STYLE.draft;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dk-page dk-mod-quotes" style={wsStyle}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <button className="dk-btn dk-btn-g" onClick={() => router.push(p('/ajanlatok'))} aria-label={t('back')} style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('desktop.kicker')} · {workspaceLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
            <h1 className="dk-h1" style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>{metaTitle || quote.title}</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${headerStatusStyle.borderColor}`, background: headerStatusStyle.background, color: headerStatusStyle.color, flexShrink: 0 }}>
              {STATUS_LABELS_HU[quote.status] || quote.status}
            </span>
          </div>
        </div>
        {canEdit && isMetaDirty && quote.status !== 'draft' && (
          <button className="dk-btn dk-btn-w" onClick={handleSaveMeta} disabled={savingMeta} style={{ flexShrink: 0 }}>
            <Check size={18} aria-hidden="true" />
            {savingMeta ? tc('saving') : tc('save')}
          </button>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="dk-body">

        {contextSwitching && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div className="dk-ws-spinner" />
          </div>
        )}

        {!contextSwitching && (
          <>
            <CollectiveBanner documentCollectiveId={quote.collective_id ?? null} />

            {isDocLocked && !lockedModalOpen && (
              <div style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)', fontWeight: 600 }}>{t('locked')}</span>
                <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  {t('lockedOptions')}
                </button>
              </div>
            )}

            {/* Two-panel layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* ── Left panel: meta + sections ──────────────────────────── */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>{t('desktop.panelDetails')}</span>

                {/* Meta card */}
                <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setMetaCollapsed(v => !v)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '0.5rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0E1116' }}>{t('details')}</span>
                      {savingMeta && <span style={{ fontSize: '0.72rem', color: '#8A8F98', fontWeight: 600 }}>{tc('saving')}…</span>}
                    </div>
                    {metaCollapsed ? <ChevronDown size={16} color="#5A5F68" /> : <ChevronUp size={16} color="#5A5F68" />}
                  </button>

                  {!metaCollapsed && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #EDEBE5' }}>
                      {canEdit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>

                          {/* Title */}
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={LBL}>{t('metaTitle')}</span>
                            <input type="text" className="dk-input" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} onBlur={autoSaveMeta} placeholder={t('metaTitlePlaceholder')} style={INP} />
                          </label>

                          {/* Location + Work type */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('location')}</span>
                              <input type="text" className="dk-input" value={metaLocation} onChange={e => setMetaLocation(e.target.value)} onBlur={autoSaveMeta} placeholder={t('locationPlaceholder')} style={INP} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('workType')}</span>
                              <input type="text" className="dk-input" value={metaWorkType} onChange={e => setMetaWorkType(e.target.value)} onBlur={autoSaveMeta} placeholder={t('workTypePlaceholder')} style={INP} />
                            </label>
                          </div>

                          {/* Description */}
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={LBL}>{t('description')}</span>
                            <textarea rows={2} className="dk-input" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} onBlur={autoSaveMeta} placeholder={t('descriptionPlaceholder')} style={{ ...INP, padding: '12px 14px', resize: 'vertical' }} />
                          </label>

                          {/* Dates */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('plannedStart')}</span>
                              <input type="date" className="dk-input" value={metaStartDate} onChange={e => { const v = e.target.value; setMetaStartDate(v); if (v && (!metaEndDate || metaEndDate <= v)) setMetaEndDate(nextDay(v)); }} onBlur={autoSaveMeta} style={INP} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('plannedEnd')}</span>
                              <input type="date" className="dk-input" min={metaStartDate ? nextDay(metaStartDate) : undefined} value={metaEndDate} onChange={e => setMetaEndDate(e.target.value)} onBlur={autoSaveMeta} style={INP} />
                            </label>
                          </div>

                          {/* VAT */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={LBL}>{t('vatRate')}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['0', '5', '18', '27'].map(v => (
                                <button key={v} type="button" onClick={() => { setMetaTaxPercent(v); autoSaveMeta({ taxPercent: v }); }}
                                  className="dk-btn" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 13, background: metaTaxPercent === v ? '#6D3FD1' : '#F4F5F8', color: metaTaxPercent === v ? '#fff' : '#5A5F68', boxShadow: 'none' }}>{v}%</button>
                              ))}
                              <input
                                type="number" min="0" max="100" inputMode="decimal"
                                value={['0','5','18','27'].includes(metaTaxPercent) ? '' : metaTaxPercent}
                                onChange={e => { setMetaTaxPercent(e.target.value); }}
                                onBlur={() => autoSaveMeta({ taxPercent: metaTaxPercent })}
                                placeholder="…%"
                                style={{ flex: 1, height: 40, border: 0, borderRadius: 10, fontSize: 13, textAlign: 'center', padding: '0 4px',
                                  background: !['0','5','18','27'].includes(metaTaxPercent) && metaTaxPercent !== '' ? '#6D3FD1' : '#F4F5F8',
                                  color:      !['0','5','18','27'].includes(metaTaxPercent) && metaTaxPercent !== '' ? '#fff'    : '#5A5F68',
                                  boxShadow: 'none', outline: 'none', minWidth: 0 }}
                              />
                            </div>
                          </div>

                          {/* Offer number + Valid until */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('offerNumber')}</span>
                              <input type="text" className="dk-input" value={metaOfferNumber} onChange={e => setMetaOfferNumber(e.target.value)} onBlur={autoSaveMeta} placeholder={t('offerNumberPlaceholder')} style={INP} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('validUntil')}</span>
                              <input type="date" className="dk-input" value={metaValidUntil} onChange={e => setMetaValidUntil(e.target.value)} onBlur={autoSaveMeta} style={INP} />
                            </label>
                          </div>

                          {/* Payment days + method */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('paymentDeadline')} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{t('paymentDeadlineUnit')}</span></span>
                              <input type="number" min="0" className="dk-input" value={metaPaymentDays} onChange={e => setMetaPaymentDays(e.target.value)} onBlur={autoSaveMeta} placeholder="8" style={INP} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('paymentMethod')}</span>
                              <input type="text" className="dk-input" value={metaPaymentMethod} onChange={e => setMetaPaymentMethod(e.target.value)} onBlur={autoSaveMeta} placeholder={t('paymentMethodPlaceholder')} style={INP} />
                            </label>
                          </div>

                          {/* Deposit + Warranty */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('deposit')} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(%)</span></span>
                              <input type="number" min="0" max="100" className="dk-input" value={metaDepositPercent} onChange={e => setMetaDepositPercent(e.target.value)} onBlur={autoSaveMeta} placeholder="0" style={INP} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={LBL}>{t('warrantyMonths')}</span>
                              <input type="number" min="0" className="dk-input" value={metaWarrantyMonths} onChange={e => setMetaWarrantyMonths(e.target.value)} onBlur={autoSaveMeta} placeholder="0" style={INP} />
                            </label>
                          </div>

                          {/* Other terms */}
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={LBL}>{t('otherTerms')} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{t('otherTermsUnit')}</span></span>
                            <textarea className="dk-input" rows={2} value={metaOfferTerms} onChange={e => setMetaOfferTerms(e.target.value)} onBlur={autoSaveMeta} placeholder={t('otherTermsPlaceholder')} style={{ ...INP, padding: '12px 14px', resize: 'vertical' }} />
                          </label>

                          {creator && (
                            <div style={{ fontSize: 12, color: '#9AA1AD', background: '#F4F5F8', borderRadius: 10, padding: '8px 12px' }}>
                              {t('createdBy')} <strong style={{ color: '#5A6070' }}>{creator.display_name}</strong>{quote.created_at && ` · ${formatDate(quote.created_at)}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '0.6rem 0.85rem', alignItems: 'center', marginTop: '0.85rem' }}>
                          {client && (<><User size={15} color="#6D3FD1" />
                            <AppLink href={p(`/ugyfelek/${client.id}`)} style={{ fontWeight: 700, color: '#6D3FD1', fontSize: '0.9rem' }}>{client.name}</AppLink>
                          </>)}
                          {quote.location && (<><MapPin size={15} color="#5A5F68" /><span style={{ fontSize: '0.875rem', color: '#5A5F68' }}>{quote.location}</span></>)}
                          {quote.work_type && (<><Wrench size={15} color="#5A5F68" /><span style={{ fontSize: '0.875rem', color: '#5A5F68' }}>{quote.work_type}</span></>)}
                          <><Calendar size={15} color="#5A5F68" /><span style={{ fontSize: '0.875rem', color: '#5A5F68' }}>{quote.start_date ? formatDate(quote.start_date) : '—'} – {quote.end_date ? formatDate(quote.end_date) : '—'}</span></>
                          <><Coins size={15} color="#5A5F68" /><span style={{ fontSize: '0.875rem', color: '#5A5F68' }}>{t('vatReadOnly')} <strong style={{ color: '#0E1116' }}>{taxRate}%</strong></span></>
                          <><User size={15} color="#5A5F68" /><span style={{ fontSize: '0.875rem', color: '#5A5F68' }}>{t('createdBy')} <strong style={{ color: '#0E1116' }}>{creator?.display_name || '—'}</strong>{quote.created_at && <span style={{ marginLeft: '0.4rem', color: '#8A8F98', fontSize: '0.82rem' }}>{formatDate(quote.created_at)}</span>}</span></>
                        </div>
                      )}
                      {(linkedSurvey || linkedProject) && (
                        <div style={{ borderTop: '1px solid #EDEBE5', marginTop: '0.85rem', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {linkedSurvey && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}><Ruler size={13} color="#6D3FD1" style={{ flexShrink: 0 }} /><AppLink href={p(`/felmeres/${linkedSurvey.id}`)} style={{ fontWeight: 600, color: '#6D3FD1', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{linkedSurvey.title}</AppLink></div>}
                          {linkedProject && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FolderKanban size={15} color="var(--success)" /><AppLink href={p(`/projektek/${linkedProject.id}`)} style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.875rem' }}>{linkedProject.name}</AppLink></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)' }}>{t('desktop.panelSections')}</span>
                  {canEdit && (
                    <button type="button" className="dk-btn" onClick={() => setShowAddSection(true)} style={{ height: 36, padding: '0 14px', fontSize: 13, background: 'var(--dk-c)', color: '#fff' }}>
                      <Plus size={16} aria-hidden="true" /> {t('desktop.addSection')}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sections.map(s => renderDesktopSectionPod(s))}
                </div>

                {canModify && <ClientComments quoteId={id} />}
                {quote.collective_id && !isDemoMode && <CollectiveChatSection collectiveId={quote.collective_id} quoteId={id} />}
              </div>

              {/* ── Right panel: totals + status + actions ───────────────── */}
              <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>

                {/* Totals card */}
                {entries.length > 0 && (
                  <div className="dk-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('offerTotals')}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('net')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#0E1116' }}>{fmt(netTotal)}</span>
                    </div>
                    {taxRate > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('vat', { rate: taxRate })}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: '#8A8F98' }}>{fmt(taxAmount)}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #EDEBE5', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('gross')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: '#0E1116', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Coins size={15} color="#8A8F98" />
                        {fmt(grossTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status + actions card */}
                <div className="dk-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('desktop.statusFlow')}</span>

                  {/* Status flow visual */}
                  {(() => {
                    const isRej = quote.status === 'rejected';
                    const statusOrder = ['draft', 'sent', isRej ? 'rejected' : 'accepted'];
                    const labels = [t('statusDraft'), t('statusSent'), isRej ? t('statusRejected') : t('statusAccepted')];
                    const currentIdx = statusOrder.indexOf(quote.status);
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 2 }}>
                        {statusOrder.map((step, idx) => {
                          const isDone    = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          const isPending = idx > currentIdx;
                          const bg = isPending ? '#E4E1D8' : (isRej && isCurrent) ? '#FEE2E2' : '#6D3FD1';
                          const fg = isPending ? '#9AA1AD' : (isRej && isCurrent) ? '#991B1B' : '#fff';
                          const lc = isPending ? '#8A8F98' : '#0E1116';
                          return (
                            <React.Fragment key={step}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 15, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                                  {isDone && <Check size={14} />}
                                  {isCurrent && !isDone && (isRej ? <X size={12} /> : <span style={{ fontSize: 11 }}>→</span>)}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: lc, textAlign: 'center', lineHeight: 1.2 }}>{labels[idx]}</span>
                              </div>
                              {idx < statusOrder.length - 1 && (
                                <div style={{ flex: 0.6, height: 1, background: '#EDEBE5', marginTop: 15, flexShrink: 0 }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Status actions */}
                  {canModify && (isQuoteOwner || isKollektivOwner) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {!isLocked && (
                        <button className="dk-btn dk-btn-dark" onClick={openSendConfirm} style={{ width: '100%', justifyContent: 'center', background: '#1D4ED8', color: '#fff' }}>
                          <Send size={16} aria-hidden="true" /> {t('actionSend')}
                        </button>
                      )}
                      {!isLocked && (
                        <button className="dk-btn" onClick={() => handleStatusChange('accepted')} style={{ width: '100%', justifyContent: 'center', background: '#16A34A', color: '#fff' }}>
                          <CheckCircle2 size={16} aria-hidden="true" /> {t('actionAccept')}
                        </button>
                      )}
                      {!isLocked && (
                        <button className="dk-btn" onClick={() => handleStatusChange('rejected')} style={{ width: '100%', justifyContent: 'center', background: '#DC2626', color: '#fff' }}>
                          <XCircle size={16} aria-hidden="true" /> {t('actionReject')}
                        </button>
                      )}
                      {quote.status === 'rejected' && (
                        <button className="dk-btn" onClick={handleResetToDraft} style={{ width: '100%', justifyContent: 'center', background: '#16A34A', color: '#fff' }}>
                          <RotateCcw size={16} aria-hidden="true" /> {t('actionReset')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid #EDEBE5' }} />

                  {/* Secondary actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* PDF */}
                    {(isQuoteOwner || isKollektivOwner) && (
                      quote.status === 'accepted' ? (
                        <button className="dk-btn dk-btn-l" onClick={handleDownloadPdf} disabled={downloadingPdf} style={{ width: '100%', justifyContent: 'flex-start' }}>
                          {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                          {downloadingPdf ? t('actionPdfGenerating') : t('actionDownloadPdf')}
                        </button>
                      ) : (
                        <AppLink href={p(`/ajanlatok/${id}/nyomtatas`)} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 44, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                          <Printer size={16} /> {t('actionPreviewPdf')}
                        </AppLink>
                      )
                    )}

                    {/* Duplicate */}
                    {canModify && (isQuoteOwner || isKollektivOwner) && (
                      <button className="dk-btn dk-btn-l" onClick={() => { setDuplicateTitle(`${quote.title} – ${t('duplicateSuffix')}`); setDuplicateWithClient(true); setDuplicateWithSections(true); setShowDuplicateModal(true); }} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <Copy size={16} /> {t('actionCopy')}
                      </button>
                    )}

                    {/* History */}
                    <button className="dk-btn dk-btn-l" onClick={openHistory} style={{ width: '100%', justifyContent: 'flex-start' }}>
                      <MessageSquare size={16} /> {t('actionHistory')}
                    </button>

                    {/* Delete */}
                    {canModify && (isQuoteOwner || isKollektivOwner) && (
                      <button className="dk-btn" onClick={handleDeleteQuote} style={{ width: '100%', justifyContent: 'flex-start', background: '#FDECEC', color: '#B71C1C' }}>
                        <Trash2 size={16} /> {t('actionDelete')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Client card */}
                {(canEdit || client) && (
                  <div
                    className="dk-card"
                    onClick={canEdit ? () => setShowClientModal(true) : undefined}
                    style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, cursor: canEdit ? 'pointer' : 'default' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('client')}</span>

                    {client ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 20, background: '#B8456B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                          {client.name?.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0E1116' }}>{client.name}</div>
                          {client.email && <div style={{ fontSize: 12, color: '#5A5F68' }}>{client.email}</div>}
                        </div>
                      </div>
                    ) : canEdit ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8A8F98', fontSize: 14, fontWeight: 600 }}>
                        <Plus size={16} /> {t('clientAddPlaceholder')}
                      </div>
                    ) : null}

                    {metaValidUntil && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EDEBE5', paddingTop: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('validUntil')}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{formatDate(metaValidUntil)}</span>
                      </div>
                    )}
                    {Number(metaDepositPercent) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('deposit')}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{metaDepositPercent}%</span>
                      </div>
                    )}
                  </div>
                )}


                {/* T&C attachment card */}
                {canEdit && (() => {
                  const attachedCount = (
                    (quote.attach_profile_terms !== false && termsPdfName ? 1 : 0) +
                    (quote.terms_attachments || []).filter(a => a.attached).length
                  );
                  return (
                    <div className="dk-card" onClick={async () => {
                      setTermsLocal({ attachments: quote.terms_attachments || [], attachProfile: quote.attach_profile_terms !== false });
                      setShowTermsModal(true);
                      if (!termsPdfName) {
                        fetch('/api/auth/profile').then(r => r.ok ? r.json() : {}).then(d => { if (d.profile?.terms_pdf_name) setTermsPdfName(d.profile.terms_pdf_name); }).catch(() => {});
                      }
                    }}
                      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('desktop.termsCard')}</span>
                        {attachedCount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB' }}>{attachedCount}</span>
                        )}
                      </div>
                      {attachedCount === 0 ? (
                        <span style={{ fontSize: 13, color: '#8A8F98' }}>{t('desktop.termsNone')}</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {quote.attach_profile_terms !== false && termsPdfName && (
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</div>
                          )}
                          {(quote.terms_attachments || []).filter(a => a.attached).map(a => (
                            <div key={a.id} style={{ fontSize: 13, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Linked project */}
                {linkedProject && (
                  <div className="dk-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 8 }}>Projekt</div>
                    <AppLink href={p(`/projektek/${linkedProject.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#065F46', fontSize: '0.875rem', textDecoration: 'none' }}>
                      <FolderKanban size={15} color="var(--success)" /> {linkedProject.name}
                    </AppLink>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── All modals ─────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!(canEdit && showAddSection)}
        onClose={() => setShowAddSection(false)}
        title={t('sectionNewTitle')}
        maxWidth="560px"
      >
        <SectionAddForm surveyId={quote.survey_id} onSave={handleAddSection} onCancel={() => setShowAddSection(false)} />
      </Modal>

      <Modal isOpen={showEntryModal} onClose={() => { setShowEntryModal(false); setPendingEntries([]); }} title={editingEntryId ? t('entryModalEdit') : t('entryModalAdd')}>
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: '0.85rem', borderRadius: 16, overflow: 'hidden', background: '#D1FAE5' }}>
            <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#065F46', display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('entryPending', { count: pendingEntries.length })}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._tmpKey || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(6,95,70,0.1)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#065F46', flexShrink: 0 }}>{fmt(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(pr => pr.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B91C1C', padding: 0, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {(() => {
          const section = sections.find(s => s.id === activeSectionId);
          if (!section && activeSectionId) return null;
          return section ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', background: '#EDE9FB', borderRadius: 16, marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#6D3FD1' }}>
              <Home size={13} />{section.name}{section.size_m2 ? ` · ${section.size_m2} m²` : ''}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', background: '#F4F3F0', borderRadius: 16, marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#5A5F68' }}>
              <MoreHorizontal size={13} /> {t('generalItems')}
            </div>
          );
        })()}

        {entryError && <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.6rem 0.85rem', borderRadius: 16, fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}

        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(ety => { const Icon = TYPE_ICONS[ety.id]; const tc2 = TYPE_COLORS[ety.id]; const active = entryForm.entry_type === ety.id; return (
            <button key={ety.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: ety.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 12, border: 'none', background: active ? tc2.bg : '#F4F3F0', cursor: 'pointer' }}>
              <Icon size={18} color={active ? tc2.color : '#8A8F98'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc2.color : '#8A8F98', textAlign: 'center', lineHeight: 1.2 }}>{ENTRY_TYPE_T[ety.id]}</span>
            </button>
          ); })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LBL}>{t('entryName')}</span>
            <input type="text" className="dk-input" autoFocus placeholder={entryForm.entry_type === 'material' ? t('entryNameMaterialPh') : entryForm.entry_type === 'labour' ? t('entryNameLabourPh') : t('entryNameOtherPh')} value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
          </label>

          {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={LBL}>{t('entryQuantity')}</span>
                <input inputMode="decimal" type="number" min="0" step="0.01" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={LBL}>{t('entryUnit')}</span>
                <select className="dk-input" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>
                  {(entryForm.entry_type === 'labour' ? LABOUR_UNITS : QUANTITY_UNITS).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={LBL}>{t('entryUnitPrice')}</span>
                <input inputMode="decimal" type="number" min="0" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} />
              </label>
            </div>
          )}

          {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={LBL}>{t('entryAmount')}</span>
              <input inputMode="decimal" type="number" min="1" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} />
            </label>
          )}

          {previewAmount > 0 && <div style={{ padding: '0.6rem 0.85rem', borderRadius: 16, background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Coins size={15} /> {t('entryItem')} <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(previewAmount)}</span></div>}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LBL}>{t('entryNotes')}</span>
            <input type="text" className="dk-input" placeholder={t('entryNotesPh')} value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          {!editingEntryId && (
            <button type="button" className="dk-btn dk-btn-l" onClick={handleAddAnother}>{t('entryAddAnother')}</button>
          )}
          {editingEntryId && (
            <button type="button" className="dk-btn" onClick={() => { const entry = entries.find(e => e.id === editingEntryId); setShowEntryModal(false); setPendingEntries([]); handleDeleteEntry(entry); }} style={{ background: '#B71C1C', color: '#fff' }}>
              <Trash2 size={16} /> {tc('delete')}
            </button>
          )}
          <button type="button" className="dk-btn" onClick={handleSaveEntry} disabled={savingEntry} style={{ background: '#6D3FD1', color: '#fff' }}>
            {savingEntry ? <><Loader2 size={13} className="animate-spin" />{tc('saving')}</> : editingEntryId ? t('entryModify') : pendingEntries.length > 0 ? t('entryAddCount', { count: pendingEntries.length + (entryForm.work_description.trim() ? 1 : 0) }) : tc('add')}
          </button>
        </div>
      </Modal>

      {/* Convert to project modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => { setShowConvertModal(false); setConvertedProject(null); setConvertError(null); }}
        title={t('convertTitle')}
      >
        {convertedProject ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0 1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} color="var(--success)" /></div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>{t('convertSuccess')}</p>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>{t('convertSuccessDetail')}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => { setShowConvertModal(false); setConvertedProject(null); }}>{tc('close')}</button>
              <button type="button" className="dk-btn" style={{ background: '#16A34A', color: '#fff' }} onClick={() => router.push(p(`/projektek/${convertedProject.id}`))}>
                <FolderKanban size={16} />{t('viewProject')}
              </button>
            </div>
          </>
        ) : convertError ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0 1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={24} color="var(--danger)" /></div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>{t('convertError')}</p>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>{convertError}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => { setShowConvertModal(false); setConvertError(null); }}>{tc('close')}</button>
              <button type="button" className="dk-btn" style={{ background: '#2563EB', color: '#fff' }} onClick={handleConvert} disabled={isConverting}>
                {isConverting ? <><Loader2 size={16} className="animate-spin" />{t('convertInProgress')}</> : t('convertRetry')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {quote.collective_id
                ? <>{t('convertConfirmCollective', { name: convertCollectiveName || t('convertCollective') })}</>
                : t('convertConfirmPersonal')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleConvert} disabled={isConverting} className="dk-btn" style={{ background: '#16A34A', color: '#fff' }}>
                {isConverting ? <><Loader2 size={16} className="animate-spin" />{t('convertInProgress')}</> : <><CheckCircle2 size={16} />{t('convertOk')}</>}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => { confirmModal?.onClose?.(); setConfirmModal(null); }}
        onConfirm={() => confirmModal?.onConfirm?.()}
        title={tc('confirm')}
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
        cancelLabel={confirmModal?.cancelLabel}
        confirmStyle={confirmModal?.confirmStyle}
      />

      {/* Email sending progress */}
      {sendProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '2rem 2.5rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 800 }}>
              {sendProgress.error ? t('convertError') : sendProgress.done ? t('sendDone') : t('sendInProgress')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {SEND_STEPS.map((s, i) => {
                const isActive  = !sendProgress.done && !sendProgress.error && sendProgress.step === i;
                const isDone    = sendProgress.done || sendProgress.step > i;
                const isPending = !isDone && !isActive;
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-subtle)', border: isPending ? '1px solid var(--border-subtle)' : 'none' }}>
                      {isDone  && <CheckCircle2 size={14} color="#fff" />}
                      {isActive && <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            {sendProgress.error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.825rem', marginBottom: '1rem' }}>{sendProgress.error}</div>
            )}
            {(sendProgress.done || sendProgress.error) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSendProgress(null)}>{tc('close')}</button>
              </div>
            )}
            {sendProgress.done && sendProgress.sentTo && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>{t('sendSentTo')} <strong>{sendProgress.sentTo}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* Send confirmation */}
      {showSendConfirm && (
        <Modal isOpen={true} onClose={() => setShowSendConfirm(false)} title={t('sendTitle')} maxWidth="480px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Profile incomplete warning */}
            {profileIncomplete && (
              <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--warning-text)' }}>
                  <AlertCircle size={15} /> {t('profileIncomplete')}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--warning-text)', lineHeight: 1.5 }}>{t('profileIncompleteDetail')}</p>
                <AppLink href={p('/profil')} className="dk-btn dk-btn-l" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', height: 34 }}>{t('profileFill')}</AppLink>
              </div>
            )}

            {/* Recipient */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={LBL}>{t('sendRecipient')}</span>
              {client?.email && (
                <button type="button" onClick={() => setSendRecipient(client.email)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 14, background: sendRecipient === client.email ? '#EFF6FF' : '#F8F9FB', border: `1px solid ${sendRecipient === client.email ? '#BFDBFE' : 'transparent'}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: '#B8456B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {client.name?.split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0E1116' }}>{client.name}</div>
                    <div style={{ fontSize: 12, color: '#5A5F68' }}>{client.email}</div>
                  </div>
                  {sendRecipient === client.email && <Check size={14} color="#2563EB" />}
                </button>
              )}
              <div style={{ fontSize: 12, color: '#8A8F98', fontWeight: 500 }}>{t('sendRecipientHint')}</div>
              <input type="email" className="dk-input" value={sendRecipient} onChange={e => setSendRecipient(e.target.value)}
                placeholder={t('sendRecipientPlaceholder')} />
            </div>

            {/* T&C selection */}
            {(termsPdfName || (quote.terms_attachments || []).length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={LBL}>{t('desktop.termsCard')}</span>

                {termsPdfName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 14, background: '#F8F9FB' }}>
                    <Printer size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</span>
                    <button type="button" onClick={() => setSendSelectedTerms(p => ({ ...p, profileTerms: !p.profileTerms }))}
                      style={{ width: 44, height: 26, borderRadius: 13, border: 0, cursor: 'pointer', flexShrink: 0, position: 'relative', background: sendSelectedTerms.profileTerms ? '#2563EB' : '#D5D2C8', transition: 'background .15s' }}>
                      <div style={{ position: 'absolute', top: 3, left: sendSelectedTerms.profileTerms ? 20 : 4, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
                    </button>
                  </div>
                )}

                {(quote.terms_attachments || []).map(att => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 14, background: '#F8F9FB' }}>
                    <Printer size={14} color="#5A5F68" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                    <button type="button" onClick={() => setSendSelectedTerms(p => ({ ...p, fileIds: p.fileIds.includes(att.id) ? p.fileIds.filter(x => x !== att.id) : [...p.fileIds, att.id] }))}
                      style={{ width: 44, height: 26, borderRadius: 13, border: 0, cursor: 'pointer', flexShrink: 0, position: 'relative', background: sendSelectedTerms.fileIds.includes(att.id) ? '#2563EB' : '#D5D2C8', transition: 'background .15s' }}>
                      <div style={{ position: 'absolute', top: 3, left: sendSelectedTerms.fileIds.includes(att.id) ? 20 : 4, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isDemoMode && (
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span>{t('sendDemoNote')}</span>
                <AppLink href={p(`/ajanlatok/${id}/nyomtatas`)} target="_blank" rel="noopener noreferrer" className="dk-btn dk-btn-l" style={{ fontSize: '0.8rem', height: 34 }}>
                  <Printer size={13} /> {t('sendPdfDownload')}
                </AppLink>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dk-btn" onClick={handleSendEmail} disabled={!sendRecipient.trim()} style={{ background: '#1D4ED8', color: '#fff' }}>
                <Send size={16} /> {tc('send')}
              </button>
            </div>
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
          setShowClientModal(false);
        }}
      />

      {/* Terms attachment modal */}
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title={t('desktop.termsCard')}>
        {termsLocal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Profile default row — read-only, toggle lives in Send modal */}
            {termsPdfName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: '#F8F9FB' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Printer size={15} color="#2563EB" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</div>
                  <div style={{ fontSize: 11, color: '#8A8F98' }}>{t('desktop.termsDefault')}</div>
                </div>
              </div>
            )}

            {/* Custom attachments */}
            {termsLocal.attachments.map(att => (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: '#F8F9FB' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F4F5F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Printer size={15} color="#5A5F68" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                  <div style={{ fontSize: 11, color: '#8A8F98' }}>{t('desktop.termsCustom')}</div>
                </div>
                <button type="button" onClick={async () => {
                    setTermsLocal(p => ({ ...p, attachments: p.attachments.filter(a => a.id !== att.id) }));
                    try {
                      const res = await fetch(`/api/quotes/${id}/terms-pdf?fileId=${att.id}`, { method: 'DELETE' });
                      if (!res.ok) throw new Error((await res.json()).error);
                      const d = await res.json();
                      cacheQuote(d.quote);
                      if (fallbackQuote) setFallbackQuote(d.quote);
                    } catch (err) { setTermsLocal(p => ({ ...p, attachments: [...p.attachments, att] })); setAlertModal({ message: err.message }); }
                  }} className="dk-btn" style={{ background: '#B71C1C', color: '#fff', height: 32, padding: '0 12px', fontSize: 12 }}>
                    {tc('delete')}
                  </button>
              </div>
            ))}

            {/* Upload button — hidden once 5 docs reached */}
            {termsLocal.attachments.length < 5 ? (
              <label style={{ cursor: uploadingTerms ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
                <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingTerms(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch(`/api/quotes/${id}/terms-pdf`, { method: 'POST', body: fd });
                    if (!res.ok) throw new Error((await res.json()).error);
                    const d = await res.json();
                    setTermsLocal(p => ({ ...p, attachments: d.quote.terms_attachments || [] }));
                    cacheQuote(d.quote);
                    if (fallbackQuote) setFallbackQuote(d.quote);
                  } catch (err) { setAlertModal({ message: err.message }); }
                  finally { setUploadingTerms(false); e.target.value = ''; }
                }} />
                <span className="dk-btn dk-btn-l" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: uploadingTerms ? 0.5 : 1 }}>
                  <Plus size={14} /> {uploadingTerms ? tc('loading') : t('desktop.termsUpload')}
                </span>
              </label>
            ) : (
              <span style={{ fontSize: 12, color: '#8A8F98' }}>{t('desktop.termsMaxReached')}</span>
            )}

          </div>
        )}
      </Modal>

      <Modal isOpen={showClientModal} onClose={() => setShowClientModal(false)} title={t('client')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LBL}>{t('clientSelectExisting')}</span>
            <ClientSelect
              value={metaClientId}
              onChange={e => {
                const cid = e.target.value;
                setMetaClientId(cid);
                updateQuote(id, { client_id: cid || null }).catch(err => setAlertModal({ message: err.message }));
                setShowClientModal(false);
              }}
              clients={clients}
              className="dk-input"
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#EDEBE5' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8A8F98', letterSpacing: '.06em', textTransform: 'uppercase' }}>{tc('or')}</span>
            <div style={{ flex: 1, height: 1, background: '#EDEBE5' }} />
          </div>
          <button type="button" className="dk-btn dk-btn-l" onClick={() => { setShowClientModal(false); setShowNewClientModal(true); }} style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} /> {t('clientCreate')}
          </button>
        </div>
      </Modal>

      {/* Section edit modal */}
      <Modal isOpen={showEditSectionModal} onClose={() => setShowEditSectionModal(false)} title={t('desktop.sectionEdit')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LBL}>{t('desktop.sectionName')}</span>
            <input type="text" className="dk-input" autoFocus value={editSecName} onChange={e => setEditSecName(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={LBL}>{t('description')}</span>
            <textarea rows={3} className="dk-input" value={editSecDesc} onChange={e => setEditSecDesc(e.target.value)} style={{ height: 'auto', padding: '12px 14px', resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="dk-btn" onClick={handleSaveEditSection} disabled={savingSection || !editSecName.trim()} style={{ background: '#6D3FD1', color: '#fff' }}>
              {savingSection ? <><Loader2 size={13} className="animate-spin" />{tc('saving')}</> : tc('save')}
            </button>
            <button type="button" className="dk-btn" onClick={() => { setShowEditSectionModal(false); handleDeleteSection(editingSection); }} style={{ background: '#B71C1C', color: '#fff' }}>
              <Trash2 size={16} /> {tc('delete')}
            </button>
          </div>
        </div>
      </Modal>

      <LockedDocumentModal
        isOpen={lockedModalOpen}
        documentType="quote"
        documentId={id}
        lockedReason={quote.locked_reason}
        transferAttempts={outgoingTransfers.filter(t => t.document_id === id && (t.status === 'rejected' || t.status === 'transfer_expired')).length}
        onDelete={async () => {
          await deleteQuote(id, quote);
          router.push(p('/ajanlatok'));
        }}
        onUnlocked={() => {
          setLockedModalOpen(false);
          setFallbackQuote(prev => prev ? { ...prev, locked_reason: null, locked_at: null } : null);
        }}
        onKeepReadOnly={() => setLockedModalOpen(false)}
      />

      {/* Duplicate modal */}
      <Modal isOpen={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} title={t('duplicateTitle')}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 8 }}>{t('duplicateNewName')}</div>
          <input type="text" className="dk-input" autoFocus value={duplicateTitle} onChange={e => setDuplicateTitle(e.target.value)} placeholder={`${quote?.title} – ${t('duplicateSuffix')}`} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 8 }}>{t('duplicateWhat')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 16, background: duplicateWithClient ? '#EDEBE5' : '#F4F3F0', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithClient} onChange={e => setDuplicateWithClient(e.target.checked)} style={{ accentColor: '#0E1116', width: 16, height: 16, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0E1116' }}>{t('duplicateWithClient')}</div>
              <div style={{ fontSize: '0.78rem', color: '#5A5F68' }}>{client?.name || t('duplicateNoClient')}</div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 16, background: duplicateWithSections ? '#EDEBE5' : '#F4F3F0', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithSections} onChange={e => setDuplicateWithSections(e.target.checked)} style={{ accentColor: '#0E1116', width: 16, height: 16, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0E1116' }}>{t('duplicateWithSections')}</div>
              <div style={{ fontSize: '0.78rem', color: '#5A5F68' }}>{t('duplicateSectionCount', { sections: sections.length, entries: entries.length })}</div>
            </div>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={() => setShowDuplicateModal(false)}>{tc('cancel')}</button>
          <button type="button" className="dk-btn dk-btn-dark" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <><Loader2 size={16} className="animate-spin" />{tc('copying')}</> : <><Copy size={16} />{tc('copy')}</>}
          </button>
        </div>
      </Modal>

      {/* History modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={t('historyTitle')}>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Loader2 size={22} className="animate-spin" color="var(--text-muted)" /></div>
        ) : !history || history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('historyEmpty')}</div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {(() => {
              const FIELD_LABELS = {
                title: t('histFieldTitle'), location: t('histFieldLocation'),
                work_type: t('histFieldWorkType'), description: t('histFieldDescription'),
                start_date: t('histFieldStartDate'), end_date: t('histFieldEndDate'),
                client_id: t('histFieldClient'), tax_percent: t('histFieldTax'),
                offer_number: t('histFieldOfferNumber'), valid_until: t('histFieldValidUntil'),
                offer_terms_text: t('histFieldTerms'), payment_deadline_days: t('histFieldPaymentDays'),
                payment_method: t('histFieldPaymentMethod'), deposit_percent: t('histFieldDeposit'),
                warranty_months: t('histFieldWarranty'),
              };
              const ACTION_LABELS = {
                'quote.created':        t('histActionCreated'),
                'quote.edited':         t('histActionEdited'),
                'quote.status_changed': t('histActionStatusChanged'),
                'quote.sent':           t('histActionSent'),
                'quote.deleted':        t('histActionDeleted'),
                'Quote terms uploaded': t('histActionTermsUploaded'),
                'Quote terms removed':  t('histActionTermsRemoved'),
                'section.added':        t('histActionSectionAdded'),
                'section.deleted':      t('histActionSectionDeleted'),
                'entry.added':          t('histActionEntryAdded'),
                'entry.edited':         t('histActionEntryEdited'),
                'entry.deleted':        t('histActionEntryDeleted'),
              };
              const statusLabel = (s) => ({ sent: t('statusSent'), accepted: t('statusAccepted'), rejected: t('statusRejected'), draft: t('statusDraft') })[s] || s;

              return history.map((entry, idx) => {
                const code = entry.action || '';
                const displayAction = ACTION_LABELS[code] || entry.action;

                const isCreate   = code === 'quote.created'   || code.includes('létrehozva');
                const isSent     = code === 'quote.sent'      || code.includes('elküldve');
                const isStatus   = code === 'quote.status_changed';
                const isAccepted = isStatus && entry.details?.status === 'accepted' || code.includes('elfogadva');
                const isRejected = isStatus && entry.details?.status === 'rejected' || code.includes('Elutasítva') || code.includes('rejected');
                const isDraft    = isStatus && entry.details?.status === 'draft'    || code.includes('Tervezet');
                const isDeleted  = code === 'quote.deleted'   || code.includes('törölve');
                const isPdf      = code.includes('PDF') || code.includes('terms');
                const isEdit     = code === 'quote.edited'    || (code.includes('módosítva') && !code.includes('Státusz'));

                const iconColor = isCreate ? '#16a34a' : isAccepted ? '#16a34a' : isRejected ? '#ef4444' : isDeleted ? '#ef4444' : isSent ? '#2563eb' : isPdf ? '#475569' : isDraft ? '#94a3b8' : isEdit ? '#d97706' : '#2563eb';
                const iconBg    = isCreate ? '#f0fdf4' : isAccepted ? '#f0fdf4' : isRejected ? '#fff1f2' : isDeleted ? '#fff1f2' : isSent ? '#eff6ff' : isPdf ? '#f1f5f9' : isDraft ? '#f8fafc' : isEdit ? '#fffbeb' : '#eff6ff';
                const Icon = isCreate ? Plus : isAccepted ? CheckCircle2 : isRejected ? XCircle : isDeleted ? Trash2 : isSent ? Send : isPdf ? Printer : isDraft ? RotateCcw : isEdit ? Edit3 : MessageSquare;

                const sub = [];
                if (entry.user_name) sub.push(entry.user_name);
                if (entry.details?.status) sub.push(statusLabel(entry.details.status));
                if (entry.details?.to) sub.push(`→ ${entry.details.to}`);
                if (entry.details?.project_name) sub.push(`${t('historyProject')} ${entry.details.project_name}`);
                if (entry.details?.work_description) sub.push(entry.details.work_description);
                if (entry.details?.amount_huf) sub.push(fmt(entry.details.amount_huf));
                if (entry.details?.name) sub.push(`„${entry.details.name}"`);
                if (entry.details?.filename) sub.push(entry.details.filename);
                if (entry.details?.changed_fields?.length) sub.push(entry.details.changed_fields.map(f => FIELD_LABELS[f] || f).join(', '));

                return (
                  <div key={entry.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem 0', borderBottom: idx < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Icon size={15} color={iconColor} strokeWidth={2} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{displayAction}</div>
                      {sub.length > 0 && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{sub.join(' · ')}</div>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right', marginTop: 2 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8A8F98', marginBottom: 2 }}>#{idx + 1}</div>
                      {formatDate(entry.created_at)}<br />
                      <span style={{ fontSize: '0.68rem' }}>{new Date(entry.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              });
            })()}
            {history.length < historyTotal && (
              <div style={{ paddingTop: '0.75rem', textAlign: 'center' }}>
                <button type="button" onClick={loadMoreHistory} disabled={historyLoadingMore} className="btn btn-secondary btn-sm">
                  {historyLoadingMore ? <><Loader2 size={13} className="animate-spin" />{tc('loading')}</> : t('historyLoadMore', { count: historyTotal - history.length })}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
