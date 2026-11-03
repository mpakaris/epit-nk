'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import useMobile from '@/hooks/useMobile';
import PageSpinner from '@/components/PageSpinner';
import { formatDate } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { useTranslations } from 'next-intl';
import {
  Users, Plus, Crown, UserCheck, Trash2, UserMinus,
  Mail, AlertCircle, CheckCircle2, Loader2, X, Ban, ShieldCheck, RefreshCw, AlertTriangle,
  Building2, ChevronRight, MoreHorizontal, Pencil, Check, Lock, Zap, ArrowUpRight, FileText,
} from 'lucide-react';

const CREEM_TIERS = [
  {
    key: 'small',
    seats: 3,
    addonPrice: '€15',
    addonPriceHuf: '≈ 5 999 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
  },
  {
    key: 'medium',
    seats: 6,
    addonPrice: '€30',
    addonPriceHuf: '≈ 11 999 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
  },
  {
    key: 'large',
    seats: 9,
    addonPrice: '€45',
    addonPriceHuf: '≈ 17 999 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
  },
];

export default function KollektivakPage() {
  const t = useTranslations('collectives');
  const isMobile = useMobile();
  const router = useRouter();
  const { currentUser, loading, dataReady, refreshCollectives, refreshSupabaseData } = useApp();

  const ROLE_LABEL = { owner: t('owner'), admin: t('admin'), contributor: t('contributor') };
  const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--success-text)' };
  const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--success-bg)' };

  const TIER_DISPLAY = {
    small:      { name: t('tierSmall'),    seats: 3, price: '€15' },
    medium:     { name: t('tierMedium'),   seats: 6, price: '€30' },
    large:      { name: t('tierLarge'),    seats: 9, price: '€45' },
    enterprise: { name: t('tierEnterprise'), seats: null, price: '—' },
  };

  const [collectives, setCollectives] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [myInvitations, setMyInvitations] = useState([]);
  const [respondingInvId, setRespondingInvId] = useState(null);
  const [respondingInvAction, setRespondingInvAction] = useState(null);
  const [transferRequests, setTransferRequests] = useState([]);
  const [respondingTransferId, setRespondingTransferId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createName, setCreateName] = useState('');
  const [createTier, setCreateTier] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [tierLoading, setTierLoading] = useState(false);

  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);
  const [kollektivaResult, setKollektivaResult] = useState(null);

  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [checkingDeleteId, setCheckingDeleteId] = useState(null);

  const [upgradeModal, setUpgradeModal] = useState(null);
  const [upgradingTier, setUpgradingTier] = useState(null);
  const [seatLimitModal, setSeatLimitModal] = useState(null);

  const [resumingId, setResumingId] = useState(null);
  const [reactivateModal, setReactivateModal] = useState(null);

  const [inviteCollectiveId, setInviteCollectiveId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [editingNameId, setEditingNameId]     = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingNameId, setSavingNameId]       = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = (e) => {
      if (!e.target.closest('[data-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenuId]);

  const [retractingId, setRetractingId]   = useState(null);
  const [reInvitingId, setReInvitingId]   = useState(null);
  const [blockingId, setBlockingId]       = useState(null);

  const handleBlockMember = async (collective, member, action) => {
    setBlockingId(member.user_id);
    const res = await fetch(`/api/collectives/${collective.id}/members/${member.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBlockingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setAlertModal({
      variant: 'success',
      title: action === 'block' ? t('blockSuccess') : t('unblockSuccess'),
      message: action === 'block'
        ? t('blockSuccessMsg', { name: member.display_name })
        : t('unblockSuccessMsg', { name: member.display_name }),
    });
    fetchCollectives();
  };

  const handleReInvite = async (collectiveId, inv) => {
    setReInvitingId(inv.id);
    const res  = await fetch(`/api/collectives/${collectiveId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inv.email }),
    });
    const data = await res.json();
    setReInvitingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setAlertModal({ variant: 'success', title: t('reInviteSuccess'), message: t('reInviteSentMsg', { email: inv.email }) });
    fetchCollectives();
  };

  const handleRetractInvitation = async (inv) => {
    setRetractingId(inv.id);
    const res = await fetch(`/api/collectives/invitations/${inv.id}`, { method: 'DELETE' });
    const data = await res.json();
    setRetractingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setAlertModal({ variant: 'success', title: t('retractSuccess'), message: t('retractSuccessMsg') });
    fetchCollectives();
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const handleRespondToInvitation = async (inv, action) => {
    setRespondingInvId(inv.id);
    setRespondingInvAction(action);
    try {
      const res = await fetch(`/api/invitations/${inv.token}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAlertModal({ message: data.error || t('errorGeneric') });
      } else {
        setMyInvitations(prev => prev.filter(i => i.id !== inv.id));
        if (action === 'accept') {
          setAlertModal({ variant: 'success', title: t('joinSuccess'), message: t('joinSuccessMsg', { name: inv.collective_name }) });
          fetchCollectives();
          refreshCollectives();
        }
      }
    } catch {
      setAlertModal({ message: t('errorNetwork') });
    } finally {
      setRespondingInvId(null);
      setRespondingInvAction(null);
    }
  };

  const fetchCollectives = async () => {
    const [colRes, invRes, myInvRes, transferRes] = await Promise.all([
      fetch('/api/collectives', { cache: 'no-store' }),
      fetch('/api/collectives/invitations', { cache: 'no-store' }),
      fetch('/api/collectives/my-invitations', { cache: 'no-store' }),
      fetch('/api/transfer-requests', { cache: 'no-store' }),
    ]);
    const colData      = await colRes.json();
    const invData      = invRes.ok ? await invRes.json() : { invitations: [] };
    const myInvData    = myInvRes.ok ? await myInvRes.json() : { invitations: [] };
    const transferData = transferRes.ok ? await transferRes.json() : { requests: [] };

    if (colRes.ok) {
      const pendingBy  = {};
      const declinedBy = {};
      for (const inv of (invData.invitations || [])) {
        if (inv.status === 'pending') {
          if (!pendingBy[inv.collective_id])  pendingBy[inv.collective_id]  = [];
          pendingBy[inv.collective_id].push(inv);
        } else if (inv.status === 'declined') {
          if (!declinedBy[inv.collective_id]) declinedBy[inv.collective_id] = [];
          declinedBy[inv.collective_id].push(inv);
        }
      }
      setCollectives((colData.collectives || []).map(c => ({
        ...c,
        pending_invitations:  pendingBy[c.id]  || [],
        declined_invitations: declinedBy[c.id] || [],
      })));
    }

    setMyInvitations(myInvData.invitations || []);
    setTransferRequests(transferData.requests || []);
    setFetching(false);
  };

  const handleTransferResponse = async (req, action) => {
    setRespondingTransferId(req.id);
    try {
      const res = await fetch(`/api/transfer-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertModal({ message: data.error || t('errorGeneric') });
      } else {
        setTransferRequests(prev => prev.filter(r => r.id !== req.id));
        const docRoute = { project: '/projektek', quote: '/ajanlatok', survey: '/felmeres' };
        if (action === 'accept') {
          refreshSupabaseData();
          setAlertModal({
            variant: 'success',
            title: t('transferAcceptedTitle'),
            message: t('transferAcceptedMsg', { name: req.document_title }),
            action: { href: `${docRoute[req.document_type] || ''}/${req.document_id}`, label: t('viewBtn') },
          });
        } else {
          setAlertModal({ variant: 'warning', title: t('transferRejectedTitle'), message: `${req.document_title}` });
        }
      }
    } catch {
      setAlertModal({ message: t('errorNetwork') });
    } finally {
      setRespondingTransferId(null);
    }
  };

  // Handle Creem redirect after collective checkout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('creem_kollektiva_result');
    if (stored) {
      try { setKollektivaResult(JSON.parse(stored)); } catch {}
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has('kollektiva_upgraded')) return;

    window.history.replaceState({}, '', '/kollektivak');

    const subscriptionId = params.get('subscription_id');
    const pending = localStorage.getItem('creem_kollektiva_pending');
    let pendingData = null;
    try { pendingData = pending ? JSON.parse(pending) : null; } catch {}
    localStorage.removeItem('creem_kollektiva_pending');

    if (!subscriptionId || !pendingData?.name) {
      localStorage.setItem('creem_kollektiva_result', JSON.stringify({ status: 'error', name: pendingData?.name || '' }));
      window.location.replace('/kollektivak');
      return;
    }

    fetch('/api/collectives/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        collectiveName: pendingData.name,
        collectiveTier: pendingData.tier,
      }),
    })
      .then(res => {
        localStorage.setItem('creem_kollektiva_result', JSON.stringify({ status: res.ok ? 'success' : 'error', name: pendingData.name }));
        window.location.replace('/kollektivak');
      })
      .catch(() => {
        localStorage.setItem('creem_kollektiva_result', JSON.stringify({ status: 'error', name: pendingData.name }));
        window.location.replace('/kollektivak');
      });
  }, []);

  useEffect(() => { if (dataReady) fetchCollectives(); }, [dataReady]);

  useEffect(() => {
    if (!kollektivaResult) return;
    const t2 = setTimeout(() => { localStorage.removeItem('creem_kollektiva_result'); setKollektivaResult(null); }, 6000);
    return () => clearTimeout(t2);
  }, [kollektivaResult]);

  const openCreateModal = () => {
    setCreateName('');
    setCreateError('');
    setCreateTier(null);
    setCreateStep((isPaidPremium || isOnTrial) ? 1 : 0);
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateStep(1);
    setCreateName('');
    setCreateError('');
    setCreateTier(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) { setCreateError(t('nameRequired')); return; }
    setCreateStep(2);
  };

  const handleTierSelect = (tier) => {
    setCreateTier(tier);
    setCreateStep(3);
  };

  const handleConfirmCheckout = async () => {
    if (!createTier) return;
    const productId = createTier.addonProductId;

    if (!productId) {
      setCreateError(t('errorMissingProductId'));
      return;
    }

    const pendingName = createName.trim();
    const pendingTier = createTier.key;

    localStorage.setItem('creem_kollektiva_pending', JSON.stringify({ name: pendingName, tier: pendingTier }));

    setTierLoading(true);

    const successUrl = isMobile
      ? '/checkout-popup-success?checkout_type=kollektiva'
      : '/kollektivak?kollektiva_upgraded=1';

    let checkoutUrl;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, successUrl }),
      });
      const data = await res.json();
      if (!data.checkoutUrl) {
        localStorage.removeItem('creem_kollektiva_pending');
        setCreateError(data.error || t('errorCheckout'));
        setCreateStep(2);
        setTierLoading(false);
        return;
      }
      checkoutUrl = data.checkoutUrl;
    } catch {
      localStorage.removeItem('creem_kollektiva_pending');
      setCreateError(t('errorCheckoutRetry'));
      setCreateStep(2);
      setTierLoading(false);
      return;
    }

    setShowCreate(false);

    if (isMobile) {
      const handleSuccess = async (subscriptionId) => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('message', onMessage);
        setCheckoutIframeUrl(null);
        localStorage.removeItem('creem_kollektiva_pending');
        localStorage.removeItem('creem_checkout_done');
        try {
          const res = await fetch('/api/collectives/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId, collectiveName: pendingName, collectiveTier: pendingTier }),
          });
          setKollektivaResult({ status: res.ok ? 'success' : 'error', name: pendingName });
          if (res.ok) { fetchCollectives(); refreshCollectives(); }
        } catch {
          setKollektivaResult({ status: 'error', name: pendingName });
        }
        setTierLoading(false);
      };

      const onStorage = (e) => {
        if (e.key !== 'creem_checkout_done') return;
        let data; try { data = JSON.parse(e.newValue); } catch { return; }
        if (data?.checkoutType !== 'kollektiva') return;
        handleSuccess(data.subscriptionId);
      };
      const onMessage = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== 'creem_checkout_success') return;
        if (e.data?.checkoutType !== 'kollektiva') return;
        handleSuccess(e.data.subscriptionId);
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener('message', onMessage);
      setCheckoutIframeUrl(checkoutUrl);
    } else {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setTierLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelModal) return;
    const { creem_subscription_id, id: collectiveId, name } = cancelModal;

    if (!creem_subscription_id) {
      setAlertModal({ message: t('errorMissingSub') });
      setCancelModal(null);
      return;
    }

    setPortalLoading(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: creem_subscription_id, collectiveId }),
      });
      const data = await res.json();
      setCancelModal(null);
      if (res.ok) {
        setCollectives(prev => prev.map(c =>
          c.id === collectiveId
            ? { ...c, subscription_status: 'scheduled_cancel', subscription_period_end: data.subscription_period_end ?? null }
            : c
        ));
        const endStr = data.subscription_period_end
          ? new Date(data.subscription_period_end).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
          : null;
        setAlertModal({
          variant: 'success',
          title: t('cancelSuccess'),
          message: endStr
            ? t('cancelSuccessMsgWithDate', { name, date: endStr })
            : t('cancelSuccessMsgNoDate', { name }),
        });
      } else {
        setAlertModal({ message: data.error || t('cancelError') });
      }
    } catch {
      setCancelModal(null);
      setAlertModal({ message: t('connectionError') });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (collective, targetTier) => {
    if (!collective.creem_subscription_id) {
      setAlertModal({ message: t('errorMissingSubShort') });
      return;
    }
    const tierObj = CREEM_TIERS.find(t2 => t2.key === targetTier);
    const targetProductId = isPaidPremium ? tierObj?.addonProductId : tierObj?.bundleProductId;
    if (!targetProductId) {
      setAlertModal({ message: t('errorMissingProductId') });
      return;
    }
    setUpgradingTier(targetTier);
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: collective.creem_subscription_id,
          collectiveId: collective.id,
          targetTier,
          productId: targetProductId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollectives(prev => prev.map(c =>
          c.id === collective.id ? { ...c, collective_tier: targetTier } : c
        ));
        setUpgradeModal(null);
        const newTierName = TIER_DISPLAY[targetTier]?.name ?? targetTier;
        const isUpgrade = ['small','medium','large'].indexOf(targetTier) > ['small','medium','large'].indexOf(collective.collective_tier);
        setAlertModal({
          variant: 'success',
          title: isUpgrade ? t('upgradeSuccess') : t('downgradeSuccess'),
          message: t('tierChangeSuccessMsg', { name: newTierName }),
        });
      } else {
        setAlertModal({ message: data.error || t('upgradeError') });
      }
    } catch {
      setAlertModal({ message: t('connectionError') });
    } finally {
      setUpgradingTier(null);
    }
  };

  const handleResume = async (collective) => {
    setResumingId(collective.id);
    try {
      const res = await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: collective.creem_subscription_id, collectiveId: collective.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollectives(prev => prev.map(c =>
          c.id === collective.id ? { ...c, subscription_status: 'active', subscription_period_end: null } : c
        ));
        setAlertModal({ variant: 'success', title: t('resumeSuccess'), message: t('resumeSuccessMsg', { name: collective.name }) });
      } else {
        const needsPremium = res.status === 403 && data.error?.includes('Prémium');
        setAlertModal({
          message: data.error || t('resumeError'),
          ...(needsPremium && { action: { label: t('restorePremiumBtn'), href: '/profil' } }),
        });
      }
    } catch {
      setAlertModal({ message: t('connectionError') });
    } finally {
      setResumingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true); setInviteError('');
    const res = await fetch(`/api/collectives/${inviteCollectiveId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { setInviteError(data.error || t('inviteErrorMsg')); return; }
    setInviteCollectiveId(null);
    setInviteEmail('');
    setAlertModal({ variant: 'success', title: t('inviteSuccessTitle'), message: t('inviteSentMsg', { email: inviteEmail.trim() }) });
    fetchCollectives();
  };

  const handleInlineSave = async (collectiveId) => {
    const name = editingNameValue.trim();
    if (!name) { setEditingNameId(null); return; }
    setSavingNameId(collectiveId);
    const res = await fetch(`/api/collectives/${collectiveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSavingNameId(null);
    setEditingNameId(null);
    if (res.ok) { setAlertModal({ variant: 'success', title: t('renameSuccess'), message: t('renameSuccessMsg') }); fetchCollectives(); refreshCollectives(); }
    else { const d = await res.json(); setAlertModal({ message: d.error || t('renameError') }); }
  };

  const handleRemoveMember = (collective, member) => {
    const isSelf = member.user_id === currentUser?.id;
    setConfirmModal({
      message: isSelf
        ? t('leaveConfirmMsg', { collective: collective.name })
        : t('removeConfirmMsg', { member: member.display_name, collective: collective.name }),
      onConfirm: async () => {
        const res = await fetch(`/api/collectives/${collective.id}/members/${member.user_id}`, { method: 'DELETE' });
        const data = await res.json();
        setConfirmModal(null);
        if (!res.ok) { setAlertModal({ message: data.error }); return; }
        setAlertModal({
          variant: 'success',
          title: isSelf ? t('leaveSuccess') : t('removeSuccess'),
          message: isSelf ? t('leaveSuccessMsg', { name: collective.name }) : t('removeSuccessMsg', { name: member.display_name }),
        });
        fetchCollectives();
      },
    });
  };

  const handleDeleteCollective = async (collective) => {
    if (collective.is_inclusive) {
      setAlertModal({ variant: 'warning', title: t('cantDeleteInclusiveTitle'), message: t('cantDeleteInclusiveMsg') });
      return;
    }
    if (!collective.creem_subscription_id) {
      setDeleteInput(''); setDeleteModal(collective); return;
    }

    const dbStatus = collective.subscription_status ?? 'active';
    const periodEnd = collective.subscription_period_end ? new Date(collective.subscription_period_end) : null;
    const now = new Date();

    if (dbStatus === 'active' || dbStatus === 'trialing' || dbStatus === 'paused' || dbStatus === 'past_due') {
      setAlertModal({ variant: 'warning', message: t('deleteBlockedActiveMsg', { name: collective.name }) });
      return;
    }

    if (dbStatus === 'scheduled_cancel' && periodEnd && periodEnd > now) {
      setConfirmModal({
        title: t('deleteTitle'),
        message: t('deletePaidPeriodMsg', { date: periodEnd.toLocaleDateString('hu-HU') }),
        confirmLabel: t('deletePaidPeriodConfirm'),
        onConfirm: () => { setDeleteInput(''); setDeleteModal(collective); },
      });
      return;
    }

    setDeleteInput(''); setDeleteModal(collective);
  };

  const executeDeleteCollective = async () => {
    if (!deleteModal) return;
    setDeleteConfirming(true);
    const res = await fetch(`/api/collectives/${deleteModal.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleteConfirming(false);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setDeleteModal(null);
    setAlertModal({ variant: 'success', title: t('deleteSuccess'), message: t('deleteSuccessMsg', { name: deleteModal.name }) });
    fetchCollectives();
    refreshCollectives();
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const isPaidPremium = currentUser?.is_subscription_premium ?? false;
  const isOnTrial = !isPaidPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const isBasic = !isPaidPremium && currentUser?.subscription_tier === 'basic';
  const isPremium = isPaidPremium;
  const myCollectives       = collectives.filter(c => c.my_role === 'owner');
  const invitedCollectives  = collectives.filter(c => c.my_role !== 'owner');

  const renderMemberRow = (collective, member) => {
    const isOwnerViewing = collective.my_role === 'owner';
    const isSelf         = member.user_id === currentUser?.id;
    const isBlocked      = member.status === 'blocked';
    const isThisOwner    = member.role === 'owner';
    const isWorking      = blockingId === member.user_id;

    const actions = isOwnerViewing && !isThisOwner ? (
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {isBlocked ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking}
            onClick={() => setConfirmModal({
              title: t('unblockTitle'),
              message: t('unblockSuccessMsg', { name: member.display_name }),
              confirmLabel: t('unblockConfirmLabel'),
              onConfirm: () => handleBlockMember(collective, member, 'unblock'),
            })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isWorking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={13} />} {t('unblockConfirmLabel')}
          </button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking}
            onClick={() => setConfirmModal({
              title: t('blockTitle'),
              message: `${member.display_name} (${member.email})`,
              confirmLabel: t('blockConfirmLabel'),
              onConfirm: () => handleBlockMember(collective, member, 'block'),
            })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isWorking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={13} />} {t('blockedLabel')}
          </button>
        )}
        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <UserMinus size={13} /> {t('removeFromCollective')}
        </button>
      </div>
    ) : !isOwnerViewing && isSelf ? (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <UserMinus size={13} /> {t('leaveCollective')}
      </button>
    ) : null;

    return (
      <div key={member.user_id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)', background: isBlocked ? 'var(--danger-bg)' : 'transparent', opacity: isBlocked ? 0.7 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-light)' : 'var(--bg-card)',
            border: `1px solid ${isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
          }}>
            {isBlocked ? <Ban size={12} color="var(--danger)" /> : isThisOwner ? <Crown size={12} color="var(--accent)" /> : <UserCheck size={12} color="var(--text-muted)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', lineHeight: 1.3 }}>
              {member.display_name}
              {isSelf && <span style={{ fontSize: '0.58rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>{t('selfBadge')}</span>}
              <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', fontSize: '0.58rem' }}>{ROLE_LABEL[member.role]}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{member.email}</div>
          </div>
        </div>
        {actions && <div style={{ display: 'flex', marginLeft: 'auto' }}>{actions}</div>}
      </div>
    );
  };

  const renderCollective = (collective) => {
    const isOwner          = collective.my_role === 'owner';
    const isInclusive      = collective.is_inclusive ?? false;
    const activeMembers    = (collective.members || []).filter(m => m.status === 'active');
    const blockedMembers   = (collective.members || []).filter(m => m.status === 'blocked');
    const pendingInvs      = collective.pending_invitations  || [];
    const declinedInvs     = collective.declined_invitations || [];
    const pendingTransfers = transferRequests.filter(r => r.collective_id === collective.id);

    const usedSeats = activeMembers.filter(m => m.role !== 'owner').length + pendingInvs.length;
    const tier      = TIER_DISPLAY[collective.collective_tier] ?? null;
    const subStatus = collective.subscription_status ?? 'active';
    const periodEnd = collective.subscription_period_end
      ? new Date(collective.subscription_period_end).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    const STATUS_BADGE = {
      active:           { label: t('statusActive'),           bg: 'var(--success-bg)',   color: 'var(--success-text)',  border: 'var(--success-border)' },
      scheduled_cancel: { label: t('statusScheduledCancel'),  bg: '#fef9c3',             color: '#854d0e',               border: '#fde047' },
      canceled:         { label: t('statusCanceled'),         bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' },
      expired:          { label: t('statusExpired'),          bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' },
      paused:           { label: t('statusPaused'),           bg: 'var(--bg-subtle)',    color: 'var(--text-muted)',     border: 'var(--border-subtle)' },
      past_due:         { label: t('statusPastDue'),          bg: '#fff7ed',             color: '#c2410c',               border: '#fed7aa' },
    };
    const badge = STATUS_BADGE[subStatus] ?? STATUS_BADGE.active;

    const trialEndStr = isOnTrial && currentUser?.trial_ends_at
      ? new Date(currentUser.trial_ends_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    const isInclusiveFrozen = isInclusive && (subStatus === 'canceled' || subStatus === 'expired');

    return (
      <div key={collective.id} className="card" style={{ marginBottom: '1rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: isInclusive ? '#f0fdf4' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Users size={19} color={isInclusive ? '#16a34a' : 'var(--accent)'} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isOwner && editingNameId === collective.id ? (
              <form
                onSubmit={e => { e.preventDefault(); handleInlineSave(collective.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}
              >
                <input
                  autoFocus
                  className="form-control"
                  value={editingNameValue}
                  onChange={e => setEditingNameValue(e.target.value)}
                  onBlur={() => handleInlineSave(collective.id)}
                  onKeyDown={e => e.key === 'Escape' && setEditingNameId(null)}
                  style={{ fontSize: '1rem', fontWeight: 800, padding: '0.2rem 0.5rem', height: 'auto' }}
                  disabled={savingNameId === collective.id}
                />
                <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-text)', padding: '0.2rem', display: 'flex' }}>
                  {savingNameId === collective.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                </button>
              </form>
            ) : (
              <div
                onClick={() => isOwner && (setEditingNameId(collective.id), setEditingNameValue(collective.name))}
                style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isOwner ? 'text' : 'default', marginBottom: '0.15rem' }}
                title={isOwner ? t('renameTooltip') : undefined}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collective.name}</span>
                {isOwner && <Pencil size={12} color="var(--text-muted)" style={{ opacity: 0.5, flexShrink: 0 }} />}
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isOwner && (
                <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontWeight: 700, padding: '0.05rem 0.45rem', borderRadius: 'var(--radius-pill)', fontSize: '0.65rem' }}>
                  {ROLE_LABEL[collective.my_role]}
                </span>
              )}
              <span><strong>{activeMembers.length}</strong> {t('activeCount', { count: activeMembers.length }).replace(String(activeMembers.length) + ' ', '')}</span>
              {pendingInvs.length > 0 && <span>· {t('pendingCount', { count: pendingInvs.length })}</span>}
            </div>
          </div>

          {/* 3-dot menu (owner only) */}
          {isOwner && (
            <div style={{ position: 'relative', flexShrink: 0 }} data-menu>
              <button
                type="button"
                data-menu
                onClick={() => setOpenMenuId(openMenuId === collective.id ? null : collective.id)}
                style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
              >
                <MoreHorizontal size={16} />
              </button>

              {openMenuId === collective.id && (() => {
                const s = collective.subscription_status ?? 'active';
                const hasSub = !!collective.creem_subscription_id;
                const isActive = s === 'active' || s === 'trialing';
                const isScheduledCancel = s === 'scheduled_cancel';
                const isInactive = s === 'canceled' || s === 'expired';
                const menuItem = (onClick, icon, label, color = 'var(--text-primary)') => (
                  <button type="button" data-menu onClick={onClick}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color, textAlign: 'left' }}>
                    {icon} {label}
                  </button>
                );
                const divider = <div style={{ height: 1, background: 'var(--border-subtle)' }} />;
                return (
                  <div data-menu style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 50, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden' }}>
                    {isActive && menuItem(() => {
                      setOpenMenuId(null);
                      const seatCap = isInclusive ? 2 : TIER_DISPLAY[collective.collective_tier]?.seats;
                      const used = (collective.members || []).filter(m => m.status === 'active' && m.role !== 'owner').length
                        + (collective.pending_invitations || []).length;
                      if (seatCap !== undefined && used >= seatCap) {
                        setSeatLimitModal(collective);
                        return;
                      }
                      setInviteCollectiveId(collective.id); setInviteEmail(''); setInviteError('');
                    }, <Mail size={14} />, t('menuInvite'))}
                    {isActive && divider}

                    {!isInclusive && isActive && s !== 'scheduled_cancel' && hasSub && collective.collective_tier && menuItem(() => { setOpenMenuId(null); setUpgradeModal(collective); }, <Users size={14} />, t('menuChangePlan'), 'var(--accent)')}
                    {!isInclusive && isActive && s !== 'scheduled_cancel' && hasSub && collective.collective_tier && divider}

                    {!isInclusive && isActive && hasSub && menuItem(() => { setOpenMenuId(null); setCancelModal(collective); }, <X size={14} />, t('menuCancelSub'), 'var(--warning-text)')}
                    {!isInclusive && isActive && hasSub && divider}

                    {!isInclusive && isScheduledCancel && menuItem(
                      () => {
                        setOpenMenuId(null);
                        setConfirmModal({
                          title: t('resumeMenuTitle'),
                          message: t('resumeMenuConfirmMsg', { name: collective.name }),
                          confirmLabel: t('resumeConfirmLabel'),
                          onConfirm: () => handleResume(collective),
                        });
                      },
                      resumingId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />,
                      resumingId === collective.id ? t('resumingLabel') : t('resumeMenuTitle'),
                      'var(--success-text)'
                    )}
                    {!isInclusive && isScheduledCancel && divider}

                    {!isInclusive && (isInactive || (!hasSub && !isActive)) && menuItem(() => { setOpenMenuId(null); setReactivateModal(collective); }, <RefreshCw size={14} />, t('menuReactivate'), 'var(--accent)')}
                    {!isInclusive && (isInactive || (!hasSub && !isActive)) && divider}

                    {!isInclusive && menuItem(() => { setOpenMenuId(null); handleDeleteCollective(collective); },
                      checkingDeleteId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />,
                      checkingDeleteId === collective.id ? t('menuChecking') : t('menuDelete'),
                      'var(--danger)')}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Subscription strip (owner only) ── */}
        {isOwner && (
          <div style={{ background: isInclusiveFrozen ? 'var(--danger-bg)' : 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isInclusive ? (
              <>
                {isInclusiveFrozen ? (
                  <>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {t('suspendedLabel')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)' }}>{t('premiumNeeded')}</span>
                    <a href="/elofizetes" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-light)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-border)' }}>
                      <Zap size={11} /> {t('restorePremiumLink')}
                    </a>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {t('statusActive')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a' }}>{t('inclusiveLabel')}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {t('inclusiveSeats', { count: activeMembers.length })}
                    </span>
                    {trialEndStr && (
                      <>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                        <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 600 }}>
                          {t('trialUntil', { date: trialEndStr })}
                        </span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: badge.color }}>
                  {subStatus === 'scheduled_cancel' && periodEnd ? t('scheduledCancelUntil', { status: badge.label, date: periodEnd }) : badge.label}
                </span>
                {tier && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)' }}>{tier.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {t('seatsInfo', { used: usedSeats, total: tier.seats, price: tier.price })}
                    </span>
                  </>
                )}
                {tier?.seats && usedSeats < tier.seats && (() => {
                  const TIER_ORDER = ['small', 'medium', 'large'];
                  const currentIdx = TIER_ORDER.indexOf(collective.collective_tier);
                  const lowerTier = currentIdx > 0 ? TIER_DISPLAY[TIER_ORDER[currentIdx - 1]] : null;
                  if (!lowerTier || usedSeats > lowerTier.seats) return null;
                  return (
                    <span onClick={() => setUpgradeModal(collective)} style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#15803d', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={t('menuChangePlan')}>
                      {t('downgradeSuggestion')}
                    </span>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── People ── */}
        {(activeMembers.length > 0 || (isOwner && (blockedMembers.length > 0 || pendingInvs.length > 0 || declinedInvs.length > 0 || pendingTransfers.length > 0))) && (
          <div style={{ marginTop: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>

            {activeMembers.length > 0 && activeMembers.map(m => renderMemberRow(collective, m))}

            {isOwner && pendingInvs.length > 0 && (
              <>
                {activeMembers.length > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />}
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning-text)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('pendingInvitationsSection')}</div>
                {pendingInvs.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mail size={12} color="var(--warning-text)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.3 }}>{inv.email}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--warning-text)' }}>{t('inviteSentDate', { date: formatDate(inv.created_at) })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id}
                        onClick={() => setConfirmModal({
                          title: t('resendInviteTitle'),
                          message: t('reInviteSentMsg', { email: inv.email }),
                          confirmLabel: t('resendConfirmLabel'),
                          onConfirm: () => handleReInvite(collective.id, inv),
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {reInvitingId === inv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />} {t('resendBtn')}
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" disabled={retractingId === inv.id} onClick={() => setConfirmModal({ message: inv.email, onConfirm: () => handleRetractInvitation(inv) })} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {retractingId === inv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} {t('retractBtn')}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {isOwner && pendingTransfers.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', padding: '0.25rem 0.6rem 0.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {t('transferRequests')}
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.6rem', fontWeight: 800, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {pendingTransfers.length}
                  </span>
                </div>
                {pendingTransfers.map(req => {
                  const DOC_LABEL = { project: t('docTypeProject'), quote: t('docTypeQuote'), survey: t('docTypeSurvey') };
                  const DOC_ROUTE = { project: '/projektek', quote: '/ajanlatok', survey: '/felmeres' };
                  const TYPE_PILL = {
                    project: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
                    quote:   { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
                    survey:  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                  };
                  return (
                    <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ArrowUpRight size={12} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.35rem' }}>
                            {req.document_title || t('unnamed')}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {(() => {
                              const pill = TYPE_PILL[req.document_type];
                              return pill ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>
                                  {DOC_LABEL[req.document_type]}
                                </span>
                              ) : null;
                            })()}
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                              {req.requester?.display_name || req.requester?.email || t('unknown')}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                              {formatDate(req.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={respondingTransferId === req.id}
                          onClick={() => setConfirmModal({
                            title: t('rejectTransferTitle'),
                            message: `${req.requester?.display_name || t('unknown')} — ${req.document_title}`,
                            confirmLabel: t('rejectTransferLabel'),
                            onConfirm: () => handleTransferResponse(req, 'reject'),
                          })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                        >
                          {respondingTransferId === req.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
                          {t('rejectTransferLabel')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={respondingTransferId === req.id}
                          onClick={() => setConfirmModal({
                            title: t('acceptTransferTitle'),
                            message: `${req.document_title} — ${DOC_LABEL[req.document_type] || ''}`,
                            confirmLabel: t('acceptTransferConfirmLabel'),
                            onConfirm: () => handleTransferResponse(req, 'accept'),
                            confirmStyle: { background: 'var(--success-text)', color: '#fff' },
                          })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {respondingTransferId === req.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={13} />}
                          {t('accept')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {isOwner && blockedMembers.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('blockedMembers')}</div>
                {blockedMembers.map(m => renderMemberRow(collective, m))}
              </>
            )}

            {isOwner && declinedInvs.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('declinedInvitations')}</div>
                {declinedInvs.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-md)', opacity: 0.65 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={12} color="var(--danger)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.3 }}>{inv.email}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>{t('inviteDeclinedDate', { date: formatDate(inv.created_at) })}</div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }} title={t('resendBtn')}>
                      {reInvitingId === inv.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={11} />}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t('pageTitle')}</h1>
            <p className="page-subtitle">{t('subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchCollectives} disabled={fetching} title={t('refresh')}>
              <RefreshCw size={13} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              title={t('new')}
              style={{
                width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Activation result banner */}
      {kollektivaResult && (
        <div style={{
          background: kollektivaResult.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${kollektivaResult.status === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          color: kollektivaResult.status === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {kollektivaResult.status === 'success'
              ? <CheckCircle2 size={16} />
              : <AlertCircle size={16} />}
            {kollektivaResult.status === 'success'
              ? t('activateSuccess', { name: kollektivaResult.name })
              : t('activateError')}
          </div>
          <button type="button" onClick={() => { localStorage.removeItem('creem_kollektiva_result'); setKollektivaResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', lineHeight: 1 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Basic user — locked inclusive collective placeholder */}
      {isBasic && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t('inclusiveCollective')}
          </div>
          <div className="card" style={{ opacity: 0.75, border: '2px dashed var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t('inclusiveCollective')}
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', letterSpacing: '0.04em' }}>
                    {t('inclusiveLockedBadge')}
                  </span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {t('inclusiveLockedText')}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{t('premiumRequiredToUnlock')}</span>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                <Zap size={13} /> {t('premiumActivateBtn')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* My collectives (owner) */}
      {myCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t('createdByMe')}
          </div>
          {myCollectives.map(renderCollective)}
        </div>
      )}

      {/* Pending invitations received by this user */}
      {myInvitations.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{t('pendingInvitations')}</span>
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
              {myInvitations.length}
            </span>
          </div>
          {myInvitations.map(inv => (
            <div key={inv.id} className="card" style={{ marginBottom: '0.75rem', border: '1px solid var(--accent-border, #bfdbfe)', background: 'var(--accent-light, #eff6ff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.15rem' }}>{inv.collective_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t('invitedBy')} <strong>{inv.inviter_name || t('unknown')}</strong>
                    {' · '}
                    {new Date(inv.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={respondingInvId === inv.id} onClick={() => handleRespondToInvitation(inv, 'decline')} style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                      {respondingInvId === inv.id && respondingInvAction === 'decline' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                      {t('decline')}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={respondingInvId === inv.id} onClick={() => handleRespondToInvitation(inv, 'accept')}>
                      {respondingInvId === inv.id && respondingInvAction === 'accept' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {t('accept')}
                    </button>
                  </div>
                )}
              </div>
              {isMobile && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.65rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={respondingInvId === inv.id} onClick={() => handleRespondToInvitation(inv, 'decline')} style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                    {respondingInvId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    {t('decline')}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={respondingInvId === inv.id} onClick={() => handleRespondToInvitation(inv, 'accept')}>
                    {respondingInvId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    {t('accept')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invited collectives */}
      {invitedCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t('invitedTo')}
          </div>
          {invitedCollectives.map(renderCollective)}
        </div>
      )}

      {collectives.length === 0 && myInvitations.length === 0 && !kollektivaResult && !isBasic && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>{t('emptyTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            {t('emptyText')}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={15} /> {t('new')}
          </button>
        </div>
      )}

      {/* ── Create modal (3-step + premium gate) ── */}
      <Modal isOpen={showCreate} onClose={closeCreateModal} title={
        createStep === 0 ? t('premiumGateTitle') :
        createStep === 1 ? t('createStep1Title') :
        createStep === 2 ? t('createStep2Title') :
        t('createStep3Title')
      }>
        {createError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{createError}</span>
          </div>
        )}

        {createStep === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
              <Crown size={18} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.825rem', color: '#7c2d12', lineHeight: 1.55 }}>
                <strong>{t('premiumGateTitle')}</strong>
                <p style={{ margin: '0.35rem 0 0' }}>
                  {t('premiumGateText')}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateModal}>{t('close')}</button>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }} onClick={closeCreateModal}>
                <Zap size={13} /> {t('premiumActivateBtn')}
              </a>
            </div>
          </div>
        )}

        {createStep === 1 && (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">{t('collectiveName')}</label>
              <input type="text" required autoFocus className="form-control" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="pl. Kovács és Társai" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateModal}>{t('cancel')}</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!createName.trim()}>{t('next')}</button>
            </div>
          </form>
        )}

        {createStep === 2 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="var(--success-text)" style={{ flexShrink: 0 }} />
              {t('premiumActiveText')}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[['📅', t('pillMonthly')], ['⏸', t('pillPausable')], ['✕', t('pillCancellable')]].map(([icon, label]) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.28rem 0.7rem', borderRadius: 'var(--radius-pill)',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
                }}>
                  {icon} {label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {CREEM_TIERS.map(tier => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => handleTierSelect(tier)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.9rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-card, #fff)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{TIER_DISPLAY[tier.key]?.name}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700,
                          padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                          background: 'var(--accent-light, #eff6ff)', color: 'var(--accent)',
                          border: '1px solid var(--accent-border, #bfdbfe)',
                        }}>
                          {t('extraSeats', { seats: tier.seats })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                          {tier.addonPrice}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('perMonthVat')}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({tier.addonPriceHuf})</span>
                      </div>
                      <div style={{ marginTop: '0.3rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          fontSize: '0.68rem', fontWeight: 600,
                          padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                          background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
                        }}>
                          {t('addonToPremium')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                  </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCreateStep(1); setCreateError(''); }}>{t('back')}</button>
            </div>
          </div>
        )}

        {createStep === 3 && createTier && (
          <div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{TIER_DISPLAY[createTier.key]?.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t('collectiveNameLabel')} <strong style={{ color: 'var(--text-primary)' }}>{createName}</strong></div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)' }}>{createTier.addonPrice}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('perMonthVat')}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({createTier.addonPriceHuf})</span>
              </div>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {t('checkoutExplanation')}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[['🔒', t('pillEncrypted')], ['📅', t('pillMonthly')], ['⏸', t('pillPausable')], ['✕', t('pillCancellable')]].map(([icon, label]) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.28rem 0.7rem', borderRadius: 'var(--radius-pill)',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
                }}>
                  {icon} {label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={tierLoading} onClick={() => { setCreateStep(2); setCreateError(''); }}>{t('back')}</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={tierLoading} onClick={handleConfirmCheckout}>
                {tierLoading ? <><Loader2 size={13} className="animate-spin" /> {t('loadingCheckout')}</> : t('proceedToPayment')}
              </button>
            </div>
          </div>
        )}

      </Modal>

      {/* ── Seat limit modal ── */}
      <Modal isOpen={!!seatLimitModal} onClose={() => setSeatLimitModal(null)} title={t('seatLimitTitle')}>
        {seatLimitModal && (() => {
          const isIncl = seatLimitModal.is_inclusive ?? false;
          const tier = TIER_DISPLAY[seatLimitModal.collective_tier];
          const usedSeats = (seatLimitModal.members || []).filter(m => m.status === 'active' && m.role !== 'owner').length
            + (seatLimitModal.pending_invitations || []).length;
          return (
            <div>
              {isIncl ? (
                <>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>
                    {t('seatLimitInclusiveMsg1', { seats: usedSeats })}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                    {t('seatLimitInclusiveMsg2')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeatLimitModal(null)}>{t('close')}</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>
                    {t('seatLimitPaidMsg1', { name: seatLimitModal.name, tier: tier?.name ?? seatLimitModal.collective_tier, seats: tier?.seats, used: usedSeats })}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                    {t('seatLimitPaidMsg2')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeatLimitModal(null)}>{t('close')}</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { setSeatLimitModal(null); setUpgradeModal(seatLimitModal); }}>
                      {t('seatLimitUpgradeBtn')}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Invite modal */}
      <Modal isOpen={!!inviteCollectiveId} onClose={() => setInviteCollectiveId(null)} title={t('inviteTitle')}>
        {inviteError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">{t('inviteEmail')}</label>
            <input type="email" required autoFocus className="form-control" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pelda@email.hu" />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{t('inviteEmailHint')}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInviteCollectiveId(null)}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>{inviting ? t('inviting') : t('invite')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title ?? t('confirmation')} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} cancelLabel={confirmModal?.cancelLabel} confirmStyle={confirmModal?.confirmStyle} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant ?? 'error'} title={alertModal?.title} action={alertModal?.action} />

      {/* ── Reactivate modal ── */}
      <Modal isOpen={!!reactivateModal} onClose={() => setReactivateModal(null)} title={t('reactivateTitle')}>
        {reactivateModal && (() => {
          const tier = TIER_DISPLAY[reactivateModal.collective_tier];
          return (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                {t('reactivateExpiredMsg', { name: reactivateModal.name })}
              </p>
              {tier && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tier.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('extraSeats', { seats: tier.seats })}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', fontSize: '1.1rem' }}>
                    {CREEM_TIERS.find(t2 => t2.key === reactivateModal.collective_tier)?.addonPrice ?? '—'}
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{t('perMonth')}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReactivateModal(null)}>{t('cancel')}</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={async () => {
                  const tierKey = reactivateModal.collective_tier ?? 'small';
                  const tierObj = CREEM_TIERS.find(t2 => t2.key === tierKey);
                  const productId = tierObj?.addonProductId;
                  if (!productId) return;
                  localStorage.setItem('creem_kollektiva_pending', JSON.stringify({ name: reactivateModal.name, tier: tierKey, collectiveId: reactivateModal.id }));
                  setReactivateModal(null);
                  const res = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, successUrl: isMobile ? '/checkout-popup-success?checkout_type=kollektiva' : '/kollektivak?kollektiva_upgraded=1' }),
                  });
                  const data = await res.json();
                  if (data.checkoutUrl) {
                    if (isMobile) setCheckoutIframeUrl(data.checkoutUrl);
                    else window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setAlertModal({ message: data.error || t('errorCheckout') });
                  }
                }}>
                  {t('reactivateBtn')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Upgrade modal ── */}
      <Modal isOpen={!!upgradeModal} onClose={() => !upgradingTier && setUpgradeModal(null)} title={t('upgradeTitle')}>
        {upgradeModal && (() => {
          const currentTier = upgradeModal.collective_tier;
          const TIER_ORDER = ['small', 'medium', 'large'];
          const currentIdx = TIER_ORDER.indexOf(currentTier);
          const currentUsedSeats = (() => {
            const activeNonOwner = (upgradeModal.members || []).filter(m => m.status === 'active' && m.role !== 'owner').length;
            const pending = (upgradeModal.pending_invitations || []).length;
            return activeNonOwner + pending;
          })();

          return (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                {t('currentPlanInfo', { name: TIER_DISPLAY[currentTier]?.name ?? t('unknown'), seats: currentUsedSeats })}
              </p>

              {['small', 'medium', 'large'].filter(k => k !== currentTier).map(key => {
                const tier = CREEM_TIERS.find(t2 => t2.key === key);
                if (!tier) return null;
                const tierIdx = TIER_ORDER.indexOf(key);
                const isUpgrade = tierIdx > currentIdx;
                const seatLimit = TIER_DISPLAY[key]?.seats ?? 0;
                const blocked = !isUpgrade && currentUsedSeats > seatLimit;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!!upgradingTier || blocked}
                    onClick={() => {
                      if (blocked) return;
                      setUpgradeModal(null);
                      setConfirmModal({
                        title: isUpgrade ? t('upgradePlanTitle') : t('downgradePlanTitle'),
                        message: `${TIER_DISPLAY[key]?.name} — ${tier.seats} ${t('extraSeats', { seats: '' }).trim()}, ${tier.addonPrice}${t('perMonth')}`,
                        confirmLabel: isUpgrade ? t('upgradeConfirmLabel') : t('downgradeConfirmLabel'),
                        onConfirm: () => handleUpgrade(upgradeModal, key),
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem',
                      cursor: (upgradingTier || blocked) ? 'default' : 'pointer',
                      border: `1.5px solid ${isUpgrade ? 'var(--accent-border, #bfdbfe)' : 'var(--border-subtle)'}`,
                      background: blocked ? 'var(--bg-subtle)' : 'var(--bg-card, #fff)',
                      textAlign: 'left',
                      opacity: (upgradingTier && upgradingTier !== key) ? 0.4 : blocked ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{TIER_DISPLAY[key]?.name}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: isUpgrade ? 'var(--accent-light)' : 'var(--bg-subtle)', color: isUpgrade ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${isUpgrade ? 'var(--accent-border)' : 'var(--border-subtle)'}` }}>
                          {isUpgrade ? t('upgradePillLabel') : t('downgradePillLabel')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tier.seats} {t('extraSeats', { seats: '' }).trim()} · {tier.addonPrice}{t('perMonth')} + ÁFA
                      </div>
                      {blocked && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.2rem' }}>
                          {t('upgradeBlockedMsg', { used: currentUsedSeats, max: seatLimit })}
                        </div>
                      )}
                    </div>
                    {upgradingTier === key
                      ? <Loader2 size={16} className="animate-spin" color="var(--accent)" />
                      : <ChevronRight size={16} color={blocked ? 'var(--text-muted)' : isUpgrade ? 'var(--accent)' : 'var(--text-secondary)'} />}
                  </button>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUpgradeModal(null)} disabled={!!upgradingTier}>{t('cancel')}</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!cancelModal} onClose={() => !portalLoading && setCancelModal(null)} title={t('cancelSubscription')}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {t('cancelConfirm', { name: cancelModal?.name })}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelModal(null)} disabled={portalLoading}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleCancelSubscription} disabled={portalLoading}>
            {portalLoading
              ? <><Loader2 size={13} className="animate-spin" /> {t('cancelLoading')}</>
              : t('cancelConfirmLabel')}
          </button>
        </div>
      </Modal>

      {/* Collective delete — typed-name confirmation */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleteConfirming && setDeleteModal(null)} title={t('deleteTitle')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.5 }}>
            <strong>{t('deleteIrreversible')}</strong>
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
              <li>{t('deleteContentItem1')}</li>
              <li>{t('deleteContentItem2')}</li>
              <li>{t('deleteContentItem3')}</li>
              <li>{t('deleteContentItem4')}</li>
            </ul>
          </div>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          {t('deleteConfirmPrompt')} <strong>{deleteModal?.name}</strong>
        </p>
        <input
          type="text"
          className="form-control"
          placeholder={deleteModal?.name}
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          disabled={deleteConfirming}
          autoFocus
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeleteModal(null)} disabled={deleteConfirming}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={deleteInput !== deleteModal?.name || deleteConfirming}
            onClick={executeDeleteCollective}
          >
            {deleteConfirming ? <><Loader2 size={13} className="animate-spin" /> {t('deleting')}</> : <><Trash2 size={13} /> {t('deleteButton')}</>}
          </button>
        </div>
      </Modal>

      {/* ── Creem checkout — mobile bottom sheet ── */}
      {checkoutIframeUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => {
            setCheckoutIframeUrl(null);
            localStorage.removeItem('creem_kollektiva_pending');
            localStorage.removeItem('creem_checkout_done');
            setTierLoading(false);
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '92vh',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
            background: '#fff',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1rem 0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-subtle)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {t('securePayment')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCheckoutIframeUrl(null);
                  localStorage.removeItem('creem_kollektiva_pending');
                  localStorage.removeItem('creem_checkout_done');
                  setTierLoading(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            <iframe
              src={checkoutIframeUrl}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title={t('securePayment')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
