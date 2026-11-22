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
import SectionCard from '../components/SectionCard';
import SectionAddForm from '../components/SectionAddForm';
import ClientComments from '../components/ClientComments';
import CollectiveChatSection from '@/components/CollectiveChatSection';
import { TYPE_ICONS, TYPE_COLORS, QUOTE_ENTRY_LABELS, sortEntries } from '../components/constants';
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
  const [metaCollapsed, setMetaCollapsed] = useState(false);

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
  const [lockedModalOpen,    setLockedModalOpen]    = useState(false);
  const [outgoingTransfers,  setOutgoingTransfers]  = useState([]);
  const [fallbackQuote,      setFallbackQuote]      = useState(null);
  const [fallbackEntries,    setFallbackEntries]    = useState(null);
  const [fallbackSections,   setFallbackSections]   = useState(null);
  const [fallbackFetching,   setFallbackFetching]   = useState(false);
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
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOutgoingTransfers(d.requests || []))
      .catch(() => {});
  }, [dataReady, isDemoMode]);

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
    setMetaPaymentMethod(quote.payment_method || '');
    setMetaDepositPercent(quote.deposit_percent != null ? String(quote.deposit_percent) : '0');
    setMetaWarrantyMonths(quote.warranty_months != null ? String(quote.warranty_months) : '0');
    setMetaInitialized(true);
  }, [quote, metaInitialized]);

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
    if (!client?.email) { setAlertModal({ message: t('noClientEmail') }); return; }
    try {
      const res  = await fetch('/api/auth/profile');
      const data = await res.json();
      const pr   = data.profile || {};
      setTermsPdfName(pr.terms_pdf_name || null);
      setAttachTerms(!!pr.terms_pdf_url);
      const missing = !((pr.company_name || pr.display_name) && pr.city && pr.tax_number);
      setProfileIncomplete(missing);
    } catch { setTermsPdfName(null); setAttachTerms(false); setProfileIncomplete(false); }
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
      const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachTerms }) });
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
      cancelLabel: t('statusRevertNo'),
      onConfirm: () => doSaveEntry(true),
      onClose:   () => doSaveEntry(false),
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

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderSectionCard = (section) => {
    const sectionEntries = section ? entries.filter(e => e.section_id === section.id) : entries.filter(e => !e.section_id);
    const sectionTotal   = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    const surveyEntry    = section?.survey_entry_id && quote.survey_id
      ? (surveyEntriesBySurvey[quote.survey_id] || []).find(e => e.id === section.survey_entry_id)
      : null;

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

    return (
      <div key="_general" className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1.1rem', background: '#F4F5F8', borderBottom: sectionEntries.length > 0 ? '1px solid #E8E9ED' : 'none', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#5A5F68', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MoreHorizontal size={14} />{t('generalItems')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {sectionTotal > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: '#5A5F68' }}>{fmt(sectionTotal)}</span>}
            {canEdit && <button type="button" onClick={() => openEntryModal(null)} className="dk-btn" style={{ height: 32, padding: '0 10px', fontSize: 13, borderRadius: 10, background: '#6D3FD1', color: '#fff' }}><Plus size={12} /></button>}
          </div>
        </div>
        {sectionEntries.length === 0 ? (
          <div style={{ padding: '0.75rem 1.1rem', fontSize: '0.82rem', color: '#8A8F98', fontStyle: 'italic' }}>{t('noItems')}</div>
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
    const tc2  = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
    const contributor = users.find(u => u.id === entry.user_id);
    const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
    return (
      <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.65rem 1.1rem', borderTop: idx > 0 ? '1px solid #EDEBE5' : 'none' }}>
        <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: tc2.bg, flexShrink: 0 }}><Icon size={14} color={tc2.color} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0E1116', marginBottom: '0.15rem', fontSize: '0.9rem' }}>{entry.work_description}</div>
          <div style={{ fontSize: '0.75rem', color: '#8A8F98', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc2.bg, color: tc2.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${tc2.border}` }}>{QUOTE_ENTRY_LABELS[entry.entry_type]}</span>
            {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit || 'db'}{entry.unit_price ? ` × ${fmt(entry.unit_price)}` : ''}</span>}
            {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} />{contributor.display_name}</span>}
            {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{fmt(entry.amount_huf)}</span>
          {canEdit && (
            <>
              <button type="button" onClick={() => openEntryModal(sectionId, entry.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: '#F1F1F3', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit3 size={11} /></button>
              <button type="button" onClick={() => handleDeleteEntry(entry)} style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={11} /></button>
            </>
          )}
        </div>
      </div>
    );
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('desktop.kicker')} · {workspaceLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
            <h1 className="dk-h1" style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>{metaTitle || quote.title}</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${headerStatusStyle.borderColor}`, background: headerStatusStyle.background, color: headerStatusStyle.color, flexShrink: 0 }}>
              {STATUS_LABELS_HU[quote.status] || quote.status}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button className="dk-btn dk-btn-g" onClick={() => router.push(p('/ajanlatok'))}>
            <ArrowLeft size={18} aria-hidden="true" /> {t('back')}
          </button>
          {canEdit && isMetaDirty && quote.status !== 'draft' && (
            <button className="dk-btn dk-btn-w" onClick={handleSaveMeta} disabled={savingMeta}>
              <Check size={18} aria-hidden="true" />
              {savingMeta ? tc('saving') : tc('save')}
            </button>
          )}
          {(isQuoteOwner || isKollektivOwner) && canModify && (
            <button
              className="dk-btn dk-btn-w"
              onClick={openSendConfirm}
              disabled={!client?.email || isPendingOutgoingTransfer}
              title={!client?.email ? t('noClientEmail') : undefined}
            >
              <Send size={18} aria-hidden="true" />
              {quote.status === 'sent' ? t('actionResend') : t('actionSend')}
            </button>
          )}
        </div>
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

            {/* Client portal link */}
            {quote.status !== 'draft' && quote.status !== 'rejected' && client && (
              <div style={{ marginBottom: '0.75rem', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ExternalLink size={15} color="rgba(255,255,255,.8)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{t('clientPortalVisible')}</span>
                <button type="button" onClick={() => { const url = `${window.location.origin}/portal${client.email ? `?email=${encodeURIComponent(client.email)}` : ''}`; navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="dk-btn dk-btn-g" style={{ height: 34, padding: '0 12px', fontSize: 12 }}>
                  {copied ? <><CheckCircle2 size={13} /> {t('copied')}</> : <><Copy size={13} /> {t('copyLink')}</>}
                </button>
              </div>
            )}

            {/* Two-panel layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* ── Left panel: meta + sections ──────────────────────────── */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Meta card */}
                <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setMetaCollapsed(v => !v)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '0.5rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      {client && <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0E1116' }}>{client.name}</span>}
                      {quote.location && <span style={{ fontSize: '0.82rem', color: '#5A5F68', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} />{quote.location}</span>}
                      {!client && !quote.location && <span style={{ fontSize: '0.85rem', color: '#5A5F68' }}>{t('generalData')}</span>}
                      {savingMeta && <span style={{ fontSize: '0.72rem', color: '#8A8F98', fontWeight: 600 }}>{tc('saving')}…</span>}
                    </div>
                    {metaCollapsed ? <ChevronDown size={16} color="#5A5F68" /> : <ChevronUp size={16} color="#5A5F68" />}
                  </button>

                  {!metaCollapsed && (
                    <div style={{ padding: '0 20px 18px', borderTop: '1px solid #EDEBE5' }}>
                      {canEdit ? (
                        <>
                          <div className="form-group" style={{ marginTop: '0.85rem' }}>
                            <label className="form-label">{t('metaTitle')}</label>
                            <input type="text" className="form-control" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} onBlur={autoSaveMeta} placeholder={t('metaTitlePlaceholder')} />
                          </div>
                          <div className="grid-2col">
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('location')}</label>
                              <input type="text" className="form-control" value={metaLocation} onChange={e => setMetaLocation(e.target.value)} onBlur={autoSaveMeta} placeholder={t('locationPlaceholder')} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('workType')}</label>
                              <input type="text" className="form-control" value={metaWorkType} onChange={e => setMetaWorkType(e.target.value)} onBlur={autoSaveMeta} placeholder={t('workTypePlaceholder')} />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label">{t('description')}</label>
                            <textarea rows={2} className="form-control" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} onBlur={autoSaveMeta} placeholder={t('descriptionPlaceholder')} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                              <label className="form-label">{t('plannedStart')}</label>
                              <input type="date" className="form-control" value={metaStartDate} onChange={e => { const v = e.target.value; setMetaStartDate(v); if (v && (!metaEndDate || metaEndDate <= v)) setMetaEndDate(nextDay(v)); }} onBlur={autoSaveMeta} />
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                              <label className="form-label">{t('plannedEnd')}</label>
                              <input type="date" className="form-control" min={metaStartDate ? nextDay(metaStartDate) : undefined} value={metaEndDate} onChange={e => setMetaEndDate(e.target.value)} onBlur={autoSaveMeta} />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem' }}>
                            <label className="form-label">{t('vatRate')}</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {['0', '5', '18', '27'].map(v => (
                                <button key={v} type="button" onClick={() => { setMetaTaxPercent(v); autoSaveMeta({ taxPercent: v }); }}
                                  style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: metaTaxPercent === v ? '#6D3FD1' : '#F4F5F8', color: metaTaxPercent === v ? '#fff' : '#5A5F68', border: `1px solid ${metaTaxPercent === v ? '#6D3FD1' : '#E8E9ED'}` }}>{v}%</button>
                              ))}
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">{t('client')}</label>
                            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <ClientSelect value={metaClientId} onChange={e => { const cid = e.target.value; setMetaClientId(cid); updateQuote(id, { client_id: cid || null }).catch(err => setAlertModal({ message: err.message })); }} clients={clients} />
                              </div>
                              <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <Plus size={14} /> {t('newClientButton')}
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('offerNumber')}</label>
                              <input type="text" className="form-control" value={metaOfferNumber} onChange={e => setMetaOfferNumber(e.target.value)} onBlur={autoSaveMeta} placeholder={t('offerNumberPlaceholder')} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('validUntil')}</label>
                              <input type="date" className="form-control" value={metaValidUntil} onChange={e => setMetaValidUntil(e.target.value)} onBlur={autoSaveMeta} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('paymentDeadline')} <span style={{ fontWeight: 400, color: '#8A8F98' }}>{t('paymentDeadlineUnit')}</span></label>
                              <input type="number" min="0" className="form-control" value={metaPaymentDays} onChange={e => setMetaPaymentDays(e.target.value)} onBlur={autoSaveMeta} placeholder="8" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('paymentMethod')}</label>
                              <input type="text" className="form-control" value={metaPaymentMethod} onChange={e => setMetaPaymentMethod(e.target.value)} onBlur={autoSaveMeta} placeholder={t('paymentMethodPlaceholder')} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('deposit')} <span style={{ fontWeight: 400, color: '#8A8F98' }}>(%)</span></label>
                              <input type="number" min="0" max="100" className="form-control" value={metaDepositPercent} onChange={e => setMetaDepositPercent(e.target.value)} onBlur={autoSaveMeta} placeholder="0" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">{t('warrantyMonths')}</label>
                              <input type="number" min="0" className="form-control" value={metaWarrantyMonths} onChange={e => setMetaWarrantyMonths(e.target.value)} onBlur={autoSaveMeta} placeholder="0" />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                            <label className="form-label">{t('otherTerms')} <span style={{ fontWeight: 400, color: '#8A8F98' }}>{t('otherTermsUnit')}</span></label>
                            <textarea className="form-control" rows={2} value={metaOfferTerms} onChange={e => setMetaOfferTerms(e.target.value)} onBlur={autoSaveMeta} placeholder={t('otherTermsPlaceholder')} style={{ resize: 'vertical', fontSize: '0.82rem' }} />
                          </div>
                          {creator && <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#8A8F98' }}>{t('createdBy')} <strong>{creator.display_name}</strong>{quote.created_at && ` · ${formatDate(quote.created_at)}`}</div>}
                        </>
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

                {/* Sections header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'rgba(255,255,255,.85)', letterSpacing: '-0.01em' }}>{t('items')}</h2>
                  {canEdit && (
                    <button type="button" onClick={() => setShowAddSection(true)} className="dk-btn dk-btn-g" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                      <Plus size={16} aria-hidden="true" /> {tc('add')}
                    </button>
                  )}
                </div>

                {sections.length === 0 && !showAddSection && (
                  <div className="dk-card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: '#5A5F68', fontSize: '0.875rem' }}>
                    <Home size={28} color="#D1D5DB" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                    <p style={{ marginBottom: canEdit ? '1rem' : 0 }}>{t('noRooms')}</p>
                    {canEdit && (
                      <button type="button" onClick={() => setShowAddSection(true)} className="dk-btn dk-btn-dark" style={{ display: 'inline-flex', height: 38, padding: '0 16px', fontSize: 13 }}>
                        <Plus size={14} /> {tc('add')}
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sections.map(s => renderSectionCard(s))}
                  {renderSectionCard(null)}
                </div>

                {canModify && <ClientComments quoteId={id} />}
                {quote.collective_id && !isDemoMode && <CollectiveChatSection collectiveId={quote.collective_id} quoteId={id} />}
              </div>

              {/* ── Right panel: totals + status + actions ───────────────── */}
              <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'flex-start' }}>

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
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('statusDraft').toUpperCase().includes('TERVEZ') ? 'Státusz' : 'Status'}</span>

                  {/* Status flow */}
                  {canModify && (isQuoteOwner || isKollektivOwner) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {!isLocked && quote.status !== 'sent' && (
                        <button className="dk-btn dk-btn-dark" onClick={() => handleStatusChange('sent')} style={{ width: '100%', justifyContent: 'center', background: '#1D4ED8', color: '#fff' }}>
                          <Send size={16} aria-hidden="true" /> {t('actionSend')}
                        </button>
                      )}
                      {!isLocked && (
                        <button className="dk-btn" onClick={() => handleStatusChange('accepted')} style={{ width: '100%', justifyContent: 'center', background: '#D1FAE5', color: '#065F46' }}>
                          <CheckCircle2 size={16} aria-hidden="true" /> {t('actionAccept')}
                        </button>
                      )}
                      {!isLocked && (
                        <button className="dk-btn" onClick={() => handleStatusChange('rejected')} style={{ width: '100%', justifyContent: 'center', background: '#FEE2E2', color: '#991B1B' }}>
                          <XCircle size={16} aria-hidden="true" /> {t('actionReject')}
                        </button>
                      )}
                      {quote.status === 'rejected' && (
                        <button className="dk-btn" onClick={handleResetToDraft} style={{ width: '100%', justifyContent: 'center', background: '#D1FAE5', color: '#065F46' }}>
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
          <div style={{ marginBottom: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--success-bg)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('entryPending', { count: pendingEntries.length })}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._tmpKey || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{fmt(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(pr => pr.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, display: 'flex' }}><X size={13} /></button>
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
              <MoreHorizontal size={13} /> {t('generalItems')}
            </div>
          );
        })()}

        {entryError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}

        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(ety => { const Icon = TYPE_ICONS[ety.id]; const tc2 = TYPE_COLORS[ety.id]; const active = entryForm.entry_type === ety.id; return (
            <button key={ety.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: ety.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc2.color : 'var(--border-subtle)'}`, background: active ? tc2.bg : '#fff', cursor: 'pointer' }}>
              <Icon size={18} color={active ? tc2.color : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc2.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{ety.label}</span>
            </button>
          ); })}
        </div>

        <div className="form-group">
          <label className="form-label">{t('entryName')}</label>
          <input type="text" className="form-control" autoFocus placeholder={entryForm.entry_type === 'material' ? t('entryNameMaterialPh') : entryForm.entry_type === 'labour' ? t('entryNameLabourPh') : t('entryNameOtherPh')} value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
        </div>
        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div className="qty-grid">
            <div>
              <label className="form-label">{t('entryQuantity')}</label>
              <input inputMode="decimal" type="number" min="0" step="0.01" className="form-control text-mono" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">{t('entryUnit')}</label>
              <select className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>
                {(entryForm.entry_type === 'labour' ? LABOUR_UNITS : QUANTITY_UNITS).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{t('entryUnitPrice')}</label>
              <input inputMode="decimal" type="number" min="0" className="form-control text-mono" placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
          </div>
        )}
        {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
          <div className="form-group"><label className="form-label">{t('entryAmount')}</label><input inputMode="decimal" type="number" min="1" className="form-control text-mono" placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} /></div>
        )}
        {previewAmount > 0 && <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Coins size={15} /> {t('entryItem')} <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(previewAmount)}</span></div>}

        <div className="form-group">
          <label className="form-label">{t('entryContractor')}</label>
          <select className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
            <option value={currentUser.id}>{t('entryMySelf', { name: currentUser.display_name })}</option>
            {users.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">{t('entryNotes')}</label>
          <input type="text" className="form-control" placeholder={t('entryNotesPh')} value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {!editingEntryId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAnother}>{t('entryAddAnother')}</button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry} disabled={savingEntry}>
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowConvertModal(false); setConvertedProject(null); }}>{tc('close')}</button>
              <button type="button" className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }} onClick={() => router.push(p(`/projektek/${convertedProject.id}`))}>
                <FolderKanban size={14} />{t('viewProject')}
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowConvertModal(false); setConvertError(null); }}>{tc('close')}</button>
              <button type="button" className="btn btn-sm" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }} onClick={handleConvert} disabled={isConverting}>
                {isConverting ? <><Loader2 size={14} className="animate-spin" />{t('convertInProgress')}</> : t('convertRetry')}
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
              <button type="button" onClick={handleConvert} disabled={isConverting} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
                {isConverting ? <><Loader2 size={14} className="animate-spin" />{t('convertInProgress')}</> : <><CheckCircle2 size={14} />{t('convertOk')}</>}
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
        <Modal isOpen={true} onClose={() => setShowSendConfirm(false)} title={t('sendTitle')}>
          {profileIncomplete && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--warning-text)' }}>
                <AlertCircle size={15} /> {t('profileIncomplete')}
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--warning-text)', lineHeight: 1.55 }}>{t('profileIncompleteDetail')}</p>
              <AppLink href={p('/profil')} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '0.15rem', fontSize: '0.8rem' }}>{t('profileFill')}</AppLink>
            </div>
          )}
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem' }}>{t('sendConfirm', { name: client?.name || '' })}</p>
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)' }}>{client?.email}</div>
          {termsPdfName && (
            <button type="button" onClick={() => setAttachTerms(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: attachTerms ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${attachTerms ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: attachTerms ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: attachTerms ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: attachTerms ? 'var(--success-text)' : 'var(--text-primary)' }}>{attachTerms ? t('sendTermsAttached') : t('sendTermsNotAttached')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{termsPdfName}</div>
              </div>
            </button>
          )}
          {isDemoMode && (
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span>{t('sendDemoNote')}</span>
              <AppLink href={p(`/ajanlatok/${id}/nyomtatas`)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Printer size={13} /> {t('sendPdfDownload')}
              </AppLink>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSendConfirm(false)}>{tc('cancel')}</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSendEmail}><Send size={14} /> {tc('send')}</button>
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
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">{t('duplicateNewName')}</label>
          <input type="text" className="form-control" autoFocus value={duplicateTitle} onChange={e => setDuplicateTitle(e.target.value)} placeholder={`${quote?.title} – ${t('duplicateSuffix')}`} />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('duplicateWhat')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1px solid ${duplicateWithClient ? 'var(--accent-border)' : 'var(--border-subtle)'}`, background: duplicateWithClient ? 'var(--accent-light)' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithClient} onChange={e => setDuplicateWithClient(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <div><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('duplicateWithClient')}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{client?.name || t('duplicateNoClient')}</div></div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1px solid ${duplicateWithSections ? 'var(--accent-border)' : 'var(--border-subtle)'}`, background: duplicateWithSections ? 'var(--accent-light)' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={duplicateWithSections} onChange={e => setDuplicateWithSections(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <div><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('duplicateWithSections')}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('duplicateSectionCount', { sections: sections.length, entries: entries.length })}</div></div>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDuplicateModal(false)}>{tc('cancel')}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? <><Loader2 size={13} className="animate-spin" />{tc('copying')}</> : <><Copy size={13} />{tc('copy')}</>}
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
            {history.map((entry, idx) => {
              const a = entry.action || '';
              const isCreate = a.includes('létrehozva'); const isSent = a.includes('elküldve');
              const isAccepted = a.includes('elfogadva'); const isRejected = a.includes('Elutasítva') || a.includes('rejected');
              const isDeleted = a.includes('törölve'); const isPdf = a.includes('PDF');
              const isDraft = a.includes('draft') || a.includes('Tervezet'); const isEdit = a.includes('módosítva') && !a.includes('Státusz');
              const iconColor = isCreate ? '#16a34a' : isAccepted ? '#16a34a' : isRejected ? '#ef4444' : isDeleted ? '#ef4444' : isSent ? '#2563eb' : isPdf ? '#475569' : isDraft ? '#94a3b8' : isEdit ? '#d97706' : '#2563eb';
              const iconBg = isCreate ? '#f0fdf4' : isAccepted ? '#f0fdf4' : isRejected ? '#fff1f2' : isDeleted ? '#fff1f2' : isSent ? '#eff6ff' : isPdf ? '#f1f5f9' : isDraft ? '#f8fafc' : isEdit ? '#fffbeb' : '#eff6ff';
              const Icon = isCreate ? Plus : isAccepted ? CheckCircle2 : isRejected ? XCircle : isDeleted ? Trash2 : isSent ? Send : isPdf ? Printer : isDraft ? RotateCcw : isEdit ? Edit3 : MessageSquare;
              const sub = [];
              if (entry.user_name) sub.push(entry.user_name);
              if (entry.details?.to) sub.push(`→ ${entry.details.to}`);
              if (entry.details?.project_name) sub.push(`${t('historyProject')} ${entry.details.project_name}`);
              if (entry.details?.work_description) sub.push(entry.details.work_description);
              if (entry.details?.amount_huf) sub.push(fmt(entry.details.amount_huf));
              if (entry.details?.name) sub.push(`„${entry.details.name}"`);
              if (entry.details?.changed_fields?.length) sub.push(entry.details.changed_fields.join(', '));
              return (
                <div key={entry.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem 0', borderBottom: idx < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Icon size={15} color={iconColor} strokeWidth={2} /></div>
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
