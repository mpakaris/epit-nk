'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import { formatDate } from '@/lib/constants';
import {
  Users, Plus, Crown, UserCheck, Trash2, UserMinus,
  Mail, AlertCircle, CheckCircle2, Loader2, X, Ban, ShieldCheck, RefreshCw, AlertTriangle,
  Building2, ChevronRight, MoreHorizontal, Pencil, Check,
} from 'lucide-react';

const ROLE_LABEL = { owner: 'Tulajdonos', admin: 'Admin', contributor: 'Közreműködő' };
const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--success-text)' };
const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--success-bg)' };

const CREEM_TIERS = [
  {
    key: 'small',
    name: 'Kis kollektíva',
    seats: 3,
    addonPrice: '€15',
    addonPriceHuf: '≈ 5 999 Ft',
    bundlePrice: '€32.50',
    bundlePriceHuf: '≈ 12 998 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
    bundleProductId: process.env.NEXT_PUBLIC_CREEM_BUNDLE_SMALL_PRODUCT_ID,
  },
  {
    key: 'medium',
    name: 'Közepes kollektíva',
    seats: 6,
    addonPrice: '€30',
    addonPriceHuf: '≈ 11 999 Ft',
    bundlePrice: '€47.50',
    bundlePriceHuf: '≈ 18 998 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
    bundleProductId: process.env.NEXT_PUBLIC_CREEM_BUNDLE_MEDIUM_PRODUCT_ID,
  },
  {
    key: 'large',
    name: 'Nagy kollektíva',
    seats: 9,
    addonPrice: '€45',
    addonPriceHuf: '≈ 17 999 Ft',
    bundlePrice: '€62.50',
    bundlePriceHuf: '≈ 24 998 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
    bundleProductId: process.env.NEXT_PUBLIC_CREEM_BUNDLE_LARGE_PRODUCT_ID,
  },
];

export default function KollektivakPage() {
  const router = useRouter();
  const { currentUser, loading, dataReady, refreshCollectives } = useApp();

  const [collectives, setCollectives] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Create modal — 3-step flow (name → tier → confirm)
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createName, setCreateName] = useState('');
  const [createTier, setCreateTier] = useState(null);   // full tier object from CREEM_TIERS
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [tierLoading, setTierLoading] = useState(false);

  // Creem iframe checkout
  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);

  // Creem redirect result
  const [kollektivaResult, setKollektivaResult] = useState(null); // { status:'success'|'error', name }

  // Portal (cancel/manage subscription)
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(null); // collective object
  const [checkingDeleteId, setCheckingDeleteId] = useState(null);

  // Upgrade modal
  const [upgradeModal, setUpgradeModal] = useState(null); // collective object
  const [upgradingTier, setUpgradingTier] = useState(null);

  // Reactivation
  const [resumingId, setResumingId] = useState(null);
  const [reactivateModal, setReactivateModal] = useState(null); // collective (for canceled → new checkout)

  const [inviteCollectiveId, setInviteCollectiveId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Inline name editing
  const [editingNameId, setEditingNameId]     = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingNameId, setSavingNameId]       = useState(null);

  // 3-dot dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close menu on outside click
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
    toast(action === 'block'
      ? `${member.display_name} kitiltva a kollektívából.`
      : `${member.display_name} hozzáférése visszaállítva.`
    );
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
    toast(`Meghívó újraküldve: ${inv.email}`);
    fetchCollectives();
  };

  const handleRetractInvitation = async (inv) => {
    setRetractingId(inv.id);
    const res = await fetch(`/api/collectives/invitations/${inv.id}`, { method: 'DELETE' });
    const data = await res.json();
    setRetractingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    toast('Meghívó visszavonva.');
    fetchCollectives();
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const fetchCollectives = async () => {
    const [colRes, invRes] = await Promise.all([
      fetch('/api/collectives'),
      fetch('/api/collectives/invitations'),
    ]);
    const colData = await colRes.json();
    const invData = invRes.ok ? await invRes.json() : { invitations: [] };

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

      // Note: kollektivaResult banner is dismissed manually by the user (× button)
    }
    setFetching(false);
  };

  // Handle Creem redirect after collective checkout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check sessionStorage for already-processed result
    const stored = localStorage.getItem('creem_kollektiva_result');
    if (stored) {
      try { setKollektivaResult(JSON.parse(stored)); } catch {}
      return;
    }

    // Handle fresh Creem redirect
    const params = new URLSearchParams(window.location.search);
    if (!params.has('kollektiva_upgraded')) return;

    // Clean URL immediately
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

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500); };

  useEffect(() => {
    if (!kollektivaResult) return;
    const t = setTimeout(() => { localStorage.removeItem('creem_kollektiva_result'); setKollektivaResult(null); }, 6000);
    return () => clearTimeout(t);
  }, [kollektivaResult]);

  const openCreateModal = () => {
    setCreateName('');
    setCreateError('');
    setCreateStep(1);
    setCreateTier(null);
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
    if (!createName.trim()) { setCreateError('A kollektíva neve kötelező'); return; }
    setCreateStep(2);
  };

  const handleTierSelect = (tier) => {
    // Go to confirmation step instead of immediately launching checkout
    setCreateTier(tier);
    setCreateStep(3);
  };

  const handleConfirmCheckout = async () => {
    if (!createTier) return;
    const isPremiumUser = currentUser?.is_subscription_premium ?? false;
    const productId = isPremiumUser ? createTier.addonProductId : createTier.bundleProductId;

    if (!productId) {
      setCreateError('Hiányzó termék azonosító. Kérjük, vedd fel a kapcsolatot az üzemeltetővel.');
      return;
    }

    const isMobile = window.innerWidth < 768;
    const pendingName = createName.trim();
    const pendingTier = createTier.key;

    // Store name/tier before opening checkout (needed by the return handler)
    localStorage.setItem('creem_kollektiva_pending', JSON.stringify({ name: pendingName, tier: pendingTier }));

    setTierLoading(true);

    const successUrl = isMobile
      ? '/checkout-popup-success?checkout_type=kollektiva'   // iframe → storage event
      : '/kollektivak?kollektiva_upgraded=1';                // new tab → redirect back

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
        setCreateError(data.error || 'Hiba a fizetési folyamat indításakor.');
        setCreateStep(2);
        setTierLoading(false);
        return;
      }
      checkoutUrl = data.checkoutUrl;
    } catch {
      localStorage.removeItem('creem_kollektiva_pending');
      setCreateError('Hiba a fizetési folyamat indításakor. Kérjük, próbáld újra.');
      setCreateStep(2);
      setTierLoading(false);
      return;
    }

    setShowCreate(false);

    if (isMobile) {
      // Mobile: show Creem in bottom sheet drawer, handle result via storage event
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
      // Desktop: open new tab, Creem redirects back to /kollektivak?kollektiva_upgraded=1
      // The useEffect on that page handles activation automatically
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setTierLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelModal) return;
    const { creem_subscription_id, id: collectiveId, name } = cancelModal;

    if (!creem_subscription_id) {
      setAlertModal({ message: 'Ehhez a kollektívához nincs tárolt előfizetés-azonosító. Kérjük, vedd fel a kapcsolatot az üzemeltetővel.' });
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
        // Update local state immediately — badge reflects new status + end date without reload
        setCollectives(prev => prev.map(c =>
          c.id === collectiveId
            ? { ...c, subscription_status: 'scheduled_cancel', subscription_period_end: data.subscription_period_end ?? null }
            : c
        ));
        const endStr = data.subscription_period_end
          ? new Date(data.subscription_period_end).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
          : null;
        toast(`A(z) „${name}" kollektíva előfizetése lemondva.${endStr ? ` Elérhető marad: ${endStr}-ig.` : ' A jelenlegi számlázási időszak végéig elérhető marad.'}`);
      } else {
        setAlertModal({ message: data.error || 'Lemondás sikertelen. Kérjük, próbáld újra.' });
      }
    } catch {
      setCancelModal(null);
      setAlertModal({ message: 'Hiba a kapcsolódás során. Kérjük, próbáld újra.' });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (collective, targetTier) => {
    if (!collective.creem_subscription_id) {
      setAlertModal({ message: 'Ehhez a kollektívához nincs tárolt előfizetés-azonosító.' });
      return;
    }
    const tierObj = CREEM_TIERS.find(t => t.key === targetTier);
    const isPremiumUser = currentUser?.is_subscription_premium ?? false;
    const targetProductId = isPremiumUser ? tierObj?.addonProductId : tierObj?.bundleProductId;
    if (!targetProductId) {
      setAlertModal({ message: 'Hiányzó termék azonosító. Kérjük, vedd fel a kapcsolatot az üzemeltetővel.' });
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
        toast(`Csomag bővítve: ${newTierName}. Az arányos díjkülönbözet azonnal terhelésre kerül.`);
      } else {
        setAlertModal({ message: data.error || 'Bővítés sikertelen. Kérjük, próbáld újra.' });
      }
    } catch {
      setAlertModal({ message: 'Hiba a kapcsolódás során. Kérjük, próbáld újra.' });
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
        toast(`A(z) „${collective.name}" kollektíva előfizetése visszaállítva — ismét aktív.`);
      } else {
        setAlertModal({ message: data.error || 'Visszaállítás sikertelen. Kérjük, próbáld újra.' });
      }
    } catch {
      setAlertModal({ message: 'Hiba a kapcsolódás során. Kérjük, próbáld újra.' });
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
    if (!res.ok) { setInviteError(data.error || 'Hiba a meghívásnál'); return; }
    setInviteCollectiveId(null);
    setInviteEmail('');
    toast('Meghívó elküldve e-mailben.');
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
    if (res.ok) { toast('Kollektíva átnevezve.'); fetchCollectives(); refreshCollectives(); }
    else { const d = await res.json(); setAlertModal({ message: d.error || 'Hiba az átnevezésnél' }); }
  };

  const handleRemoveMember = (collective, member) => {
    const isSelf = member.user_id === currentUser?.id;
    setConfirmModal({
      message: isSelf
        ? `Biztosan ki szeretne lépni a(z) „${collective.name}" kollektívából?`
        : `Biztosan eltávolítja „${member.display_name}" tagot a(z) „${collective.name}" kollektívából?`,
      onConfirm: async () => {
        const res = await fetch(`/api/collectives/${collective.id}/members/${member.user_id}`, { method: 'DELETE' });
        const data = await res.json();
        setConfirmModal(null);
        if (!res.ok) { setAlertModal({ message: data.error }); return; }
        toast(isSelf ? 'Kilépett a kollektívából.' : 'Tag eltávolítva.');
        fetchCollectives();
      },
    });
  };

  const handleDeleteCollective = async (collective) => {
    if (!collective.creem_subscription_id) {
      setDeleteInput(''); setDeleteModal(collective); return;
    }

    const dbStatus = collective.subscription_status ?? 'active';
    const periodEnd = collective.subscription_period_end ? new Date(collective.subscription_period_end) : null;
    const now = new Date();

    if (dbStatus === 'active' || dbStatus === 'trialing' || dbStatus === 'paused' || dbStatus === 'past_due') {
      setAlertModal({ variant: 'warning', message: `A(z) „${collective.name}" kollektíva előfizetése még aktív. A törlés előtt mondj le az előfizetésről (⋯ → Előfizetés lemondása).` });
      return;
    }

    if (dbStatus === 'scheduled_cancel') {
      if (!periodEnd || periodEnd > now) {
        setAlertModal({ variant: 'warning', message: `A lemondás feldolgozás alatt van. A kollektíva a számlázási időszak lejárta után (${periodEnd ? periodEnd.toLocaleDateString('hu-HU') : '—'}) törölhető.` });
        return;
      }
      // Period has ended — allow delete
    }

    // canceled / expired / scheduled_cancel past period end → allow
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
    toast('Kollektíva törölve.');
    fetchCollectives();
    refreshCollectives();
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const isPremium = currentUser?.is_subscription_premium ?? false;
  const myCollectives       = collectives.filter(c => c.my_role === 'owner');
  const invitedCollectives  = collectives.filter(c => c.my_role !== 'owner');

  const renderMemberRow = (collective, member) => {
    const isOwnerViewing = collective.my_role === 'owner';
    const isSelf         = member.user_id === currentUser?.id;
    const isBlocked      = member.status === 'blocked';
    const isThisOwner    = member.role === 'owner';
    const isWorking      = blockingId === member.user_id;

    return (
      <div key={member.user_id} style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem', opacity: isBlocked ? 0.55 : 1 }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isBlocked ? 'var(--danger-bg)' : isThisOwner ? 'var(--accent-light)' : 'var(--bg-subtle)',
            border: `1px solid ${isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
          }}>
            {isBlocked    ? <Ban size={13} color="var(--danger)" />
             : isThisOwner ? <Crown size={13} color="var(--accent)" />
             : <UserCheck size={13} color="var(--text-muted)" />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              {member.display_name}
              {isSelf      && <span style={{ fontSize: '0.6rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>én</span>}
              {isBlocked   && <span style={{ fontSize: '0.6rem', background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>Tiltott</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{member.email}</span>
              <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: 'var(--radius-pill)', fontSize: '0.6rem' }}>{ROLE_LABEL[member.role]}</span>
              {member.joined_at && <span>· Csatlakozott: {formatDate(member.joined_at)}</span>}
            </div>
          </div>
        </div>

        {/* Buttons */}
        {isOwnerViewing && !isThisOwner && (
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            {isBlocked ? (
              <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking} onClick={() => handleBlockMember(collective, member, 'unblock')} style={{ gap: '0.3rem' }}>
                {isWorking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={12} />} Tiltás feloldása
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking} onClick={() => handleBlockMember(collective, member, 'block')} style={{ gap: '0.3rem' }}>
                {isWorking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={12} />} Tiltás
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ gap: '0.3rem' }}>
              <UserMinus size={12} /> Eltávolítás
            </button>
          </div>
        )}
        {!isOwnerViewing && isSelf && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ gap: '0.3rem' }}>
              <UserMinus size={12} /> Kilépés
            </button>
          </div>
        )}
      </div>
    );
  };

  const TIER_DISPLAY = {
    small:      { name: 'Kis kollektíva',    seats: 3, price: '€15' },
    medium:     { name: 'Közepes kollektíva', seats: 6, price: '€30' },
    large:      { name: 'Nagy kollektíva',   seats: 9, price: '€45' },
    enterprise: { name: 'Vállalati',         seats: null, price: 'Egyedi' },
  };

  const renderCollective = (collective) => {
    const isOwner       = collective.my_role === 'owner';
    const activeMembers = (collective.members || []).filter(m => m.status === 'active');
    const blockedMembers= (collective.members || []).filter(m => m.status === 'blocked');
    const pendingInvs   = collective.pending_invitations  || [];
    const declinedInvs  = collective.declined_invitations || [];
    const tier          = TIER_DISPLAY[collective.collective_tier] ?? null;
    const subStatus     = collective.subscription_status ?? 'active';
    const periodEnd     = collective.subscription_period_end
      ? new Date(collective.subscription_period_end).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    const STATUS_BADGE = {
      active:           { label: '● Aktív',           bg: 'var(--success-bg)',   color: 'var(--success-text)',  border: 'var(--success-border)' },
      scheduled_cancel: { label: '🕐 Lemondva',        bg: '#fef9c3',             color: '#854d0e',               border: '#fde047' },
      canceled:         { label: '✕ Lemondva',         bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' },
      expired:          { label: '✕ Lejárt',           bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' },
      paused:           { label: '⏸ Szüneteltetve',    bg: 'var(--bg-subtle)',    color: 'var(--text-muted)',     border: 'var(--border-subtle)' },
      past_due:         { label: '⚠ Fizetési hiba',   bg: '#fff7ed',             color: '#c2410c',               border: '#fed7aa' },
    };
    const badge = STATUS_BADGE[subStatus] ?? STATUS_BADGE.active;

    return (
      <div key={collective.id} className="card" style={{ marginBottom: '1rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
          {/* Avatar */}
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Users size={19} color="var(--accent)" />
          </div>

          {/* Name + meta — flex-grow */}
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
                title={isOwner ? 'Kattints az átnevezéshez' : undefined}
              >
                {collective.name}
                {isOwner && <Pencil size={12} color="var(--text-muted)" style={{ opacity: 0.5, flexShrink: 0 }} />}
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontWeight: 700, padding: '0.05rem 0.45rem', borderRadius: 'var(--radius-pill)', fontSize: '0.65rem' }}>
                {ROLE_LABEL[collective.my_role]}
              </span>
              <span><strong>{activeMembers.length}</strong> aktív tag</span>
              {pendingInvs.length > 0 && <span>· {pendingInvs.length} függőben lévő meghívó</span>}
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
                    {/* Invite — active only */}
                    {isActive && menuItem(() => { setOpenMenuId(null); setInviteCollectiveId(collective.id); setInviteEmail(''); setInviteError(''); }, <Mail size={14} />, 'Meghívás')}
                    {isActive && divider}

                    {/* Upgrade — active + not largest tier */}
                    {isActive && collective.collective_tier !== 'large' && hasSub && menuItem(() => { setOpenMenuId(null); setUpgradeModal(collective); }, <Users size={14} />, 'Csomag bővítése', 'var(--accent)')}
                    {isActive && collective.collective_tier !== 'large' && hasSub && divider}

                    {/* Cancel — active only */}
                    {isActive && hasSub && menuItem(() => { setOpenMenuId(null); setCancelModal(collective); }, <X size={14} />, 'Előfizetés lemondása', 'var(--warning-text)')}
                    {isActive && hasSub && divider}

                    {/* Resume — scheduled_cancel only */}
                    {isScheduledCancel && menuItem(
                      () => { setOpenMenuId(null); handleResume(collective); },
                      resumingId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />,
                      resumingId === collective.id ? 'Visszaállítás…' : 'Előfizetés visszaállítása',
                      'var(--success-text)'
                    )}
                    {isScheduledCancel && divider}

                    {/* New checkout — fully canceled */}
                    {(isInactive || (!hasSub && !isActive)) && menuItem(() => { setOpenMenuId(null); setReactivateModal(collective); }, <RefreshCw size={14} />, 'Kollektíva újraindítása', 'var(--accent)')}
                    {(isInactive || (!hasSub && !isActive)) && divider}

                    {/* Delete — always shown, logic in handler */}
                    {menuItem(() => { setOpenMenuId(null); handleDeleteCollective(collective); },
                      checkingDeleteId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />,
                      checkingDeleteId === collective.id ? 'Ellenőrzés…' : 'Kollektíva törlése',
                      'var(--danger)')}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Subscription info (owner only) ── */}
        {isOwner && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', marginBottom: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Status */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              {badge.label}
              {subStatus === 'scheduled_cancel' && periodEnd && (
                <span style={{ fontWeight: 600 }}>— {periodEnd}-ig</span>
              )}
            </span>
            {subStatus === 'scheduled_cancel' && !periodEnd && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 600, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>
                lejárat folyamatban
              </span>
            )}

            {/* Tier + price */}
            {tier ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 600, background: 'var(--accent-light, #eff6ff)', color: 'var(--accent)', border: '1px solid var(--accent-border, #bfdbfe)' }}>
                  {tier.name}{tier.seats ? ` · ${tier.seats} tag` : ''}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 600, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {tier.price} / hó + ÁFA
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Csomag adatok nem elérhetők (migráció szükséges)
              </span>
            )}

            {/* Purchase date */}
            {collective.created_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 600, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                📅 {new Date(collective.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* ── Active members ── */}
        {activeMembers.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tagok</div>
            {activeMembers.map(m => renderMemberRow(collective, m))}
          </div>
        )}

        {/* ── Blocked members (owner only) ── */}
        {isOwner && blockedMembers.length > 0 && (
          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: '0.35rem' }}>Tiltott tagok</div>
            {blockedMembers.map(m => renderMemberRow(collective, m))}
          </div>
        )}

        {/* ── Pending invitations (owner only) ── */}
        {isOwner && pendingInvs.length > 0 && (
          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning-text)', marginBottom: '0.35rem' }}>Függőben lévő meghívók</div>
            {pendingInvs.map(inv => (
              <div key={inv.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={13} color="var(--warning-text)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 600 }}>Meghívó elküldve · {formatDate(inv.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ gap: '0.3rem' }}>
                    {reInvitingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={12} />} Újraküldés
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={retractingId === inv.id} onClick={() => handleRetractInvitation(inv)} style={{ gap: '0.3rem' }}>
                    {retractingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />} Visszavonás
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Declined invitations (owner only) ── */}
        {isOwner && declinedInvs.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: '0.35rem' }}>Visszautasított meghívók</div>
            {declinedInvs.map(inv => (
              <div key={inv.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem', opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} color="var(--danger)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>Visszautasítva · {formatDate(inv.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ gap: '0.3rem' }}>
                    {reInvitingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={12} />} Újra meghívás
                  </button>
                </div>
              </div>
            ))}
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
            <h1 className="page-title">Kollektívák</h1>
            <p className="page-subtitle">Megosztott csapatmunkaterületek kezelése</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchCollectives} disabled={fetching} title="Frissítés">
              <RefreshCw size={13} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <Plus size={15} /> Új kollektíva
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
              ? `A(z) „${kollektivaResult.name}" kollektíva sikeresen aktiválva!`
              : 'Hiba a kollektíva létrehozásakor. Kérjük, vedd fel a kapcsolatot az üzemeltetővel.'}
          </div>
          <button type="button" onClick={() => { localStorage.removeItem('creem_kollektiva_result'); setKollektivaResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', lineHeight: 1 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />{successMsg}
        </div>
      )}

      {/* My collectives (owner) */}
      {myCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Általam létrehozva
          </div>
          {myCollectives.map(renderCollective)}
        </div>
      )}

      {/* Invited collectives */}
      {invitedCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Meghívottként
          </div>
          {invitedCollectives.map(renderCollective)}
        </div>
      )}

      {collectives.length === 0 && !kollektivaResult && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>Még nincsenek kollektívák</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Hozz létre egy kollektívát, vagy várj, amíg valaki meghív.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={15} /> Új kollektíva
          </button>
        </div>
      )}

      {/* ── Create modal (3-step) ── */}
      <Modal isOpen={showCreate} onClose={closeCreateModal} title={createStep === 1 ? 'Új kollektíva — Név' : createStep === 2 ? 'Új kollektíva — Csomag' : 'Fizetés megerősítése'}>
        {createError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{createError}</span>
          </div>
        )}

        {/* Step 1: name */}
        {createStep === 1 && (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Kollektíva neve *</label>
              <input type="text" required autoFocus className="form-control" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="pl. Kovács és Társai" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateModal}>Mégse</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!createName.trim()}>Tovább →</button>
            </div>
          </form>
        )}

        {/* Step 2: tier selection */}
        {createStep === 2 && (
          <div>
            {isPremium ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={14} color="var(--success-text)" style={{ flexShrink: 0 }} />
                Prémium előfizetésed aktív — az alábbi árak kiegészítő díjak.
              </div>
            ) : (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#1e3a8a', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <Crown size={14} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Nincs aktív Prémium előfizetésed — az alábbi csomagok tartalmazzák azt is.</span>
              </div>
            )}

            {/* Subscription condition pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[['📅', 'Havi'], ['⏸', 'Szüneteltethető'], ['✕', 'Lemondható']].map(([icon, label]) => (
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
              {CREEM_TIERS.map(tier => {
                const isBundle = !isPremium;
                const displayPrice = isBundle ? tier.bundlePrice : tier.addonPrice;
                const displayPriceHuf = isBundle ? tier.bundlePriceHuf : tier.addonPriceHuf;
                return (
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
                    {/* Left: name + seats + badge */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{tier.name}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700,
                          padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                          background: 'var(--accent-light, #eff6ff)', color: 'var(--accent)',
                          border: '1px solid var(--accent-border, #bfdbfe)',
                        }}>
                          {tier.seats} extra tag
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                          {displayPrice}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hó + ÁFA</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({displayPriceHuf})</span>
                      </div>
                      <div style={{ marginTop: '0.35rem' }}>
                        {isBundle ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            fontSize: '0.68rem', fontWeight: 700,
                            padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                            background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                          }}>
                            ⭐ Prémium is benne van
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            fontSize: '0.68rem', fontWeight: 600,
                            padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
                          }}>
                            Kiegészítő a Prémiumhoz
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: arrow */}
                    <ChevronRight size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCreateStep(1); setCreateError(''); }}>← Vissza</button>
            </div>
          </div>
        )}

        {/* Step 3: confirm before checkout */}
        {createStep === 3 && createTier && (
          <div>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{createTier.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Kollektíva neve: <strong style={{ color: 'var(--text-primary)' }}>{createName}</strong></div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)' }}>
                {isPremium ? createTier.addonPrice : createTier.bundlePrice}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.3rem' }}>/ hó + ÁFA</span>
              </div>
              {!isPremium && <div style={{ fontSize: '0.72rem', color: '#1d4ed8', marginTop: '0.2rem' }}>Prémium is benne van</div>}
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              A „Tovább a fizetéshez" gombra kattintva átirányítunk a Creem biztonságos fizetési oldalára egy <strong>új böngészőfülön</strong>. A fizetés elvégzése után automatikusan létrehozzuk a kollektívát.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[['🔒', 'Titkosított'], ['📅', 'Havi'], ['⏸', 'Szüneteltethető'], ['✕', 'Lemondható']].map(([icon, label]) => (
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
              <button type="button" className="btn btn-secondary btn-sm" disabled={tierLoading} onClick={() => { setCreateStep(2); setCreateError(''); }}>← Vissza</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={tierLoading} onClick={handleConfirmCheckout}>
                {tierLoading ? <><Loader2 size={13} className="animate-spin" /> Megnyitás…</> : 'Tovább a fizetéshez →'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invite modal */}
      <Modal isOpen={!!inviteCollectiveId} onClose={() => setInviteCollectiveId(null)} title="Tag meghívása">
        {inviteError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">Meghívott e-mail címe *</label>
            <input type="email" required autoFocus className="form-control" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pelda@email.hu" />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Meghívó e-mailt kap. Még nem regisztrált tagok is meghívhatók.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInviteCollectiveId(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>{inviting ? 'Meghívás...' : 'Meghívás'}</button>
          </div>
        </form>
      </Modal>


      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant ?? 'error'} title={alertModal?.title} />

      {/* Cancel subscription confirm modal */}
      {/* ── Reactivate modal (canceled → new checkout) ── */}
      <Modal isOpen={!!reactivateModal} onClose={() => setReactivateModal(null)} title="Kollektíva újraindítása">
        {reactivateModal && (() => {
          const tier = TIER_DISPLAY[reactivateModal.collective_tier];
          return (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                A(z) <strong>„{reactivateModal.name}"</strong> kollektíva előfizetése lejárt.
                Új előfizetést indíthatsz az alábbi gombbal — az összes meglévő adat megmarad.
              </p>
              {tier && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tier.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tier.seats} extra tag</div>
                  </div>
                  <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', fontSize: '1.1rem' }}>
                    {CREEM_TIERS.find(t => t.key === reactivateModal.collective_tier)?.addonPrice ?? '—'}
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>/hó</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReactivateModal(null)}>Mégse</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={async () => {
                  const tier = reactivateModal.collective_tier ?? 'small';
                  const isPremiumUser = currentUser?.is_subscription_premium ?? false;
                  const tierObj = CREEM_TIERS.find(t => t.key === tier);
                  const productId = isPremiumUser ? tierObj?.addonProductId : tierObj?.bundleProductId;
                  if (!productId) return;
                  localStorage.setItem('creem_kollektiva_pending', JSON.stringify({ name: reactivateModal.name, tier, collectiveId: reactivateModal.id }));
                  setReactivateModal(null);
                  const res = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, successUrl: window.innerWidth < 768 ? '/checkout-popup-success?checkout_type=kollektiva' : '/kollektivak?kollektiva_upgraded=1' }),
                  });
                  const data = await res.json();
                  if (data.checkoutUrl) {
                    if (window.innerWidth < 768) setCheckoutIframeUrl(data.checkoutUrl);
                    else window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setAlertModal({ message: data.error || 'Hiba a fizetési folyamat indításakor.' });
                  }
                }}>
                  Előfizetés újraindítása →
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Upgrade modal ── */}
      <Modal isOpen={!!upgradeModal} onClose={() => !upgradingTier && setUpgradeModal(null)} title="Csomag bővítése">
        {upgradeModal && (() => {
          const currentTier = upgradeModal.collective_tier;
          const TIER_ORDER = ['small', 'medium', 'large'];
          const currentIdx = TIER_ORDER.indexOf(currentTier);
          const available = CREEM_TIERS.filter((_, i) => i > currentIdx);
          return (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Jelenlegi csomag: <strong>{TIER_DISPLAY[currentTier]?.name ?? 'Ismeretlen'}</strong>.
                Az arányos díjkülönbözet azonnal terhelésre kerül, az új szék-kapacitás azonnal elérhetővé válik.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {available.map(tier => (
                  <button
                    key={tier.key}
                    type="button"
                    disabled={!!upgradingTier}
                    onClick={() => handleUpgrade(upgradeModal, tier.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', cursor: upgradingTier ? 'default' : 'pointer',
                      border: '1.5px solid var(--accent-border, #bfdbfe)', background: 'var(--bg-card, #fff)',
                      textAlign: 'left', opacity: upgradingTier && upgradingTier !== tier.key ? 0.5 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{tier.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tier.seats} extra tag · {tier.addonPrice}/hó + ÁFA
                      </div>
                    </div>
                    {upgradingTier === tier.key
                      ? <Loader2 size={16} className="animate-spin" color="var(--accent)" />
                      : <ChevronRight size={16} color="var(--accent)" />}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUpgradeModal(null)} disabled={!!upgradingTier}>Mégse</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!cancelModal} onClose={() => !portalLoading && setCancelModal(null)} title="Előfizetés lemondása">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Ez a művelet lemondja a(z) <strong>„{cancelModal?.name}"</strong> kollektíva előfizetését.
          Ha lemondod, a jelenlegi számlázási időszak lejártával már nem tudsz tovább dolgozni a kollektívában — az adatok olvashatók maradnak.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelModal(null)} disabled={portalLoading}>
            Mégse
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleCancelSubscription} disabled={portalLoading}>
            {portalLoading
              ? <><Loader2 size={13} className="animate-spin" /> Lemondás…</>
              : 'Előfizetés lemondása'}
          </button>
        </div>
      </Modal>

      {/* Collective delete — typed-name confirmation */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleteConfirming && setDeleteModal(null)} title="Kollektíva törlése">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.5 }}>
            <strong>Ez a művelet nem vonható vissza.</strong> A kollektíva törlésével az összes hozzá tartozó tartalom véglegesen törlődik:
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
              <li>Projektek és naplóbejegyzések</li>
              <li>Számlák és munkabejegyzések</li>
              <li>Felmérések és médiatartalmak</li>
              <li>Ajánlatok</li>
            </ul>
          </div>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          A megerősítéshez írja be a kollektíva nevét: <strong>{deleteModal?.name}</strong>
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
            Mégse
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={deleteInput !== deleteModal?.name || deleteConfirming}
            onClick={executeDeleteCollective}
          >
            {deleteConfirming ? <><Loader2 size={13} className="animate-spin" /> Törlés...</> : <><Trash2 size={13} /> Kollektíva törlése</>}
          </button>
        </div>
      </Modal>

      {/* ── Creem checkout — mobile bottom sheet ── */}
      {checkoutIframeUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        }}>
          {/* Tap backdrop to close */}
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
            {/* Drag handle + header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1rem 0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-subtle)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                🔒 Biztonságos fizetés – Creem
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
              title="Creem fizetési felület"
            />
          </div>
        </div>
      )}
    </div>
  );
}
