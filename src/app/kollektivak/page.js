'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import { formatDate } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import {
  Users, Plus, Crown, UserCheck, Trash2, UserMinus,
  Mail, AlertCircle, CheckCircle2, Loader2, X, Ban, ShieldCheck, RefreshCw, AlertTriangle,
  Building2, ChevronRight, MoreHorizontal, Pencil, Check, Lock, Zap,
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
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
  },
  {
    key: 'medium',
    name: 'Közepes kollektíva',
    seats: 6,
    addonPrice: '€30',
    addonPriceHuf: '≈ 11 999 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
  },
  {
    key: 'large',
    name: 'Nagy kollektíva',
    seats: 9,
    addonPrice: '€45',
    addonPriceHuf: '≈ 17 999 Ft',
    addonProductId: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
  },
];

export default function KollektivakPage() {
  const router = useRouter();
  const { currentUser, loading, dataReady, refreshCollectives } = useApp();

  const [collectives, setCollectives] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [myInvitations, setMyInvitations] = useState([]); // invitations received by this user
  const [respondingInvId, setRespondingInvId] = useState(null);

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
  const [seatLimitModal, setSeatLimitModal] = useState(null); // collective object

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
    setAlertModal({ variant: 'success', title: action === 'block' ? 'Tag kitiltva' : 'Tiltás feloldva',
      message: action === 'block'
        ? `${member.display_name} többé nem fér hozzá a kollektívához.`
        : `${member.display_name} hozzáférése visszaállítva.` });
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
    setAlertModal({ variant: 'success', title: 'Meghívó újraküldve', message: <><strong>{inv.email}</strong> részére új meghívót küldtünk ki.</> });
    fetchCollectives();
  };

  const handleRetractInvitation = async (inv) => {
    setRetractingId(inv.id);
    const res = await fetch(`/api/collectives/invitations/${inv.id}`, { method: 'DELETE' });
    const data = await res.json();
    setRetractingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setAlertModal({ variant: 'success', title: 'Meghívó visszavonva', message: 'A meghívó érvénytelenítve. A link nem fogadható el többé.' });
    fetchCollectives();
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const handleRespondToInvitation = async (inv, action) => {
    setRespondingInvId(inv.id);
    try {
      const res = await fetch(`/api/invitations/${inv.token}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAlertModal({ message: data.error || 'Hiba történt.' });
      } else {
        setMyInvitations(prev => prev.filter(i => i.id !== inv.id));
        if (action === 'accept') {
          setAlertModal({ variant: 'success', title: 'Csatlakozás sikeres', message: `Mostantól tagja vagy a(z) „${inv.collective_name}" kollektívának.` });
          fetchCollectives();
          refreshCollectives();
        }
      }
    } catch {
      setAlertModal({ message: 'Hálózati hiba. Próbáld újra.' });
    } finally {
      setRespondingInvId(null);
    }
  };

  const fetchCollectives = async () => {
    const [colRes, invRes, myInvRes] = await Promise.all([
      fetch('/api/collectives'),
      fetch('/api/collectives/invitations'),
      fetch('/api/collectives/my-invitations'),
    ]);
    const colData = await colRes.json();
    const invData = invRes.ok ? await invRes.json() : { invitations: [] };
    const myInvData = myInvRes.ok ? await myInvRes.json() : { invitations: [] };

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


  useEffect(() => {
    if (!kollektivaResult) return;
    const t = setTimeout(() => { localStorage.removeItem('creem_kollektiva_result'); setKollektivaResult(null); }, 6000);
    return () => clearTimeout(t);
  }, [kollektivaResult]);

  const openCreateModal = () => {
    setCreateName('');
    setCreateError('');
    setCreateTier(null);
    // Non-premium users see the upgrade gate (step 0) first
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
    const productId = createTier.addonProductId;

    if (!productId) {
      setCreateError('Hiányzó termék azonosító. Kérjük, vedd fel a kapcsolatot az üzemeltetővel.');
      return;
    }

    const isMobile = window.innerWidth < 768;
    const pendingName = createName.trim();
    const pendingTier = createTier.key;

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
        setAlertModal({ variant: 'success', title: 'Előfizetés lemondva',
          message: endStr
            ? `A(z) „${name}" kollektíva előfizetése lemondva. Elérhető marad ${endStr}-ig.`
            : `A(z) „${name}" kollektíva előfizetése lemondva. A jelenlegi számlázási időszak végéig elérhető marad.` });
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
    const targetProductId = isPaidPremium ? tierObj?.addonProductId : tierObj?.bundleProductId;
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
        const isUpgrade = ['small','medium','large'].indexOf(targetTier) > ['small','medium','large'].indexOf(collective.collective_tier);
        setAlertModal({ variant: 'success', title: isUpgrade ? 'Csomag bővítve' : 'Csomag csökkentve',
          message: `Mostantól a(z) ${newTierName} csomagon vagy. Az arányos díjkülönbözet azonnal terhelésre / jóváírásra kerül.` });
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
        setAlertModal({ variant: 'success', title: 'Előfizetés visszaállítva',
          message: `A(z) „${collective.name}" kollektíva előfizetése aktív — a számlázás az eredeti ütemezés szerint folytatódik.` });
      } else {
        const needsPremium = res.status === 403 && data.error?.includes('Prémium');
        setAlertModal({
          message: data.error || 'Visszaállítás sikertelen. Kérjük, próbáld újra.',
          ...(needsPremium && { action: { label: 'Prémium visszaállítása →', href: '/profil' } }),
        });
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
    setAlertModal({ variant: 'success', title: 'Meghívó elküldve', message: <><strong>{inviteEmail.trim()}</strong> részére meghívót küldtünk. A meghívott a linkre kattintva csatlakozhat a kollektívához.</> });
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
    if (res.ok) { setAlertModal({ variant: 'success', title: 'Kollektíva átnevezve', message: `A kollektíva neve sikeresen frissítve.` }); fetchCollectives(); refreshCollectives(); }
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
        setAlertModal({ variant: 'success', title: isSelf ? 'Kilépés sikeres' : 'Tag eltávolítva',
          message: isSelf ? `Kilépett a(z) „${collective.name}" kollektívából.` : `${member.display_name} eltávolítva a kollektívából.` });
        fetchCollectives();
      },
    });
  };

  const handleDeleteCollective = async (collective) => {
    if (collective.is_inclusive) {
      setAlertModal({ variant: 'warning', title: 'Nem törölhető', message: 'Az inkluzív kollektíva nem törölhető — ez az előfizetésedhez tartozó ingyenes csapatmunkaterület.' });
      return;
    }
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

    if (dbStatus === 'scheduled_cancel' && periodEnd && periodEnd > now) {
      // Subscription is canceled but paid period hasn't ended yet — warn, then allow
      setConfirmModal({
        title: 'Kollektíva törlése',
        message: (
          <span>
            Az előfizetés lemondva, de a fizetett időszak <strong>{periodEnd.toLocaleDateString('hu-HU')}</strong>-ig tart.
            Ha most törlöd, a fennmaradó időszak elvész. Biztosan törlöd?
          </span>
        ),
        confirmLabel: 'Igen, törlöm',
        onConfirm: () => { setDeleteInput(''); setDeleteModal(collective); },
      });
      return;
    }

    // canceled / expired / scheduled_cancel → allow
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
    setAlertModal({ variant: 'success', title: 'Kollektíva törölve', message: `A(z) „${deleteModal.name}" kollektíva és minden hozzá tartozó adat véglegesen törölve.` });
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
  const isPremium = isPaidPremium; // keep for tier display (addon vs bundle pricing)
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
              title: 'Tiltás feloldása',
              message: <span><strong>{member.display_name}</strong> ismét hozzáférhet a kollektívához és annak összes tartalmához.</span>,
              confirmLabel: 'Feloldás',
              onConfirm: () => handleBlockMember(collective, member, 'unblock'),
            })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isWorking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={13} />} Feloldás
          </button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking}
            onClick={() => setConfirmModal({
              title: 'Tag kitiltása',
              message: <span><strong>{member.display_name}</strong> (<strong>{member.email}</strong>) elveszíti hozzáférését a kollektívához. A tiltás bármikor feloldható.</span>,
              confirmLabel: 'Kitiltás',
              onConfirm: () => handleBlockMember(collective, member, 'block'),
            })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isWorking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={13} />} Tiltás
          </button>
        )}
        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <UserMinus size={13} /> Eltávolítás
        </button>
      </div>
    ) : !isOwnerViewing && isSelf ? (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <UserMinus size={13} /> Kilépés
      </button>
    ) : null;

    return (
      <div key={member.user_id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)', background: isBlocked ? 'var(--danger-bg)' : 'transparent', opacity: isBlocked ? 0.7 : 1 }}>
        {/* Avatar + info */}
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
              {isSelf && <span style={{ fontSize: '0.58rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>én</span>}
              <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', fontSize: '0.58rem' }}>{ROLE_LABEL[member.role]}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{member.email}</div>
          </div>
        </div>
        {actions && <div style={{ display: 'flex', marginLeft: 'auto' }}>{actions}</div>}
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
    const isOwner        = collective.my_role === 'owner';
    const isInclusive    = collective.is_inclusive ?? false;
    const activeMembers  = (collective.members || []).filter(m => m.status === 'active');
    const blockedMembers = (collective.members || []).filter(m => m.status === 'blocked');
    const pendingInvs    = collective.pending_invitations  || [];
    const declinedInvs   = collective.declined_invitations || [];

    // Seats used = active non-owner members + pending invitations (owner doesn't count)
    const usedSeats = activeMembers.filter(m => m.role !== 'owner').length + pendingInvs.length;
    const tier      = TIER_DISPLAY[collective.collective_tier] ?? null;
    const subStatus = collective.subscription_status ?? 'active';
    const periodEnd = collective.subscription_period_end
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

    // Trial end date for inclusive collective header
    const trialEndStr = isOnTrial && currentUser?.trial_ends_at
      ? new Date(currentUser.trial_ends_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    const isInclusiveFrozen = isInclusive && (subStatus === 'canceled' || subStatus === 'expired');

    return (
      <div key={collective.id} className="card" style={{ marginBottom: '1rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
          {/* Avatar */}
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: isInclusive ? '#f0fdf4' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Users size={19} color={isInclusive ? '#16a34a' : 'var(--accent)'} />
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
                style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isOwner ? 'text' : 'default', marginBottom: '0.15rem', flexWrap: 'wrap' }}
                title={isOwner ? 'Kattints az átnevezéshez' : undefined}
              >
                {collective.name}
                {isInclusive && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', letterSpacing: '0.04em' }}>
                    INKLUZÍV
                  </span>
                )}
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
                    }, <Mail size={14} />, 'Meghívás')}
                    {isActive && divider}

                    {/* Tier change — paid collectives only, active + has sub + known tier */}
                    {!isInclusive && isActive && s !== 'scheduled_cancel' && hasSub && collective.collective_tier && menuItem(() => { setOpenMenuId(null); setUpgradeModal(collective); }, <Users size={14} />, 'Csomag módosítása', 'var(--accent)')}
                    {!isInclusive && isActive && s !== 'scheduled_cancel' && hasSub && collective.collective_tier && divider}

                    {/* Cancel — paid collectives only, active + has sub */}
                    {!isInclusive && isActive && hasSub && menuItem(() => { setOpenMenuId(null); setCancelModal(collective); }, <X size={14} />, 'Előfizetés lemondása', 'var(--warning-text)')}
                    {!isInclusive && isActive && hasSub && divider}

                    {/* Resume — paid collectives only, scheduled_cancel */}
                    {!isInclusive && isScheduledCancel && menuItem(
                      () => {
                        setOpenMenuId(null);
                        setConfirmModal({
                          title: 'Előfizetés visszaállítása',
                          message: <span>A(z) <strong>„{collective.name}"</strong> kollektíva előfizetése visszaáll — a számlázás az eredeti ütemezés szerint folytatódik, és a tagok ismét teljes hozzáférést kapnak.</span>,
                          confirmLabel: 'Visszaállítás',
                          onConfirm: () => handleResume(collective),
                        });
                      },
                      resumingId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />,
                      resumingId === collective.id ? 'Visszaállítás…' : 'Előfizetés visszaállítása',
                      'var(--success-text)'
                    )}
                    {!isInclusive && isScheduledCancel && divider}

                    {/* New checkout — paid collectives only, fully canceled */}
                    {!isInclusive && (isInactive || (!hasSub && !isActive)) && menuItem(() => { setOpenMenuId(null); setReactivateModal(collective); }, <RefreshCw size={14} />, 'Kollektíva újraindítása', 'var(--accent)')}
                    {!isInclusive && (isInactive || (!hasSub && !isActive)) && divider}

                    {/* Delete — paid collectives only */}
                    {!isInclusive && menuItem(() => { setOpenMenuId(null); handleDeleteCollective(collective); },
                      checkingDeleteId === collective.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />,
                      checkingDeleteId === collective.id ? 'Ellenőrzés…' : 'Kollektíva törlése',
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
                      ✕ Felfüggesztve
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)' }}>Prémium szükséges a folytatáshoz</span>
                    <a href="/elofizetes" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-light)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-border)' }}>
                      <Zap size={11} /> Prémium visszaállítása →
                    </a>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      ● Aktív
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a' }}>Inkluzív</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <strong>{activeMembers.length}</strong>/3 hely
                    </span>
                    {trialEndStr && (
                      <>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                        <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 600 }}>
                          Próba {trialEndStr}-ig
                        </span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: badge.color }}>
                  {badge.label}{subStatus === 'scheduled_cancel' && periodEnd ? ` — ${periodEnd}-ig` : ''}
                </span>
                {tier && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)' }}>{tier.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>·</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <strong>{usedSeats}</strong>/{tier.seats} hely · {tier.price}/hó
                    </span>
                  </>
                )}
                {/* Downgrade nudge */}
                {tier?.seats && usedSeats < tier.seats && (() => {
                  const TIER_ORDER = ['small', 'medium', 'large'];
                  const currentIdx = TIER_ORDER.indexOf(collective.collective_tier);
                  const lowerTier = currentIdx > 0 ? TIER_DISPLAY[TIER_ORDER[currentIdx - 1]] : null;
                  if (!lowerTier || usedSeats > lowerTier.seats) return null;
                  return (
                    <span onClick={() => setUpgradeModal(collective)} style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#15803d', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Csomag módosítása">
                      💡 Kisebb csomag is elég
                    </span>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── People ── */}
        {(activeMembers.length > 0 || (isOwner && (blockedMembers.length > 0 || pendingInvs.length > 0 || declinedInvs.length > 0))) && (
          <div style={{ marginTop: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>

            {/* Active members */}
            {activeMembers.length > 0 && activeMembers.map(m => renderMemberRow(collective, m))}

            {/* Pending invitations */}
            {isOwner && pendingInvs.length > 0 && (
              <>
                {activeMembers.length > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />}
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning-text)', padding: '0.25rem 0.6rem 0.1rem' }}>Meghívók</div>
                {pendingInvs.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mail size={12} color="var(--warning-text)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.3 }}>{inv.email}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--warning-text)' }}>Elküldve · {formatDate(inv.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id}
                        onClick={() => setConfirmModal({
                          title: 'Meghívó újraküldése',
                          message: <span>A korábbi meghívó link érvénytelenné válik, és <strong>{inv.email}</strong> részére egy új meghívót küldünk ki.</span>,
                          confirmLabel: 'Újraküldés',
                          onConfirm: () => handleReInvite(collective.id, inv),
                        })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {reInvitingId === inv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />} Újraküldés
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" disabled={retractingId === inv.id} onClick={() => setConfirmModal({ message: <span>Biztosan visszavonod a <strong>{inv.email}</strong> címre küldött meghívót? A link érvénytelenné válik.</span>, onConfirm: () => handleRetractInvitation(inv) })} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {retractingId === inv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} Visszavonás
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Blocked members */}
            {isOwner && blockedMembers.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', padding: '0.25rem 0.6rem 0.1rem' }}>Tiltott tagok</div>
                {blockedMembers.map(m => renderMemberRow(collective, m))}
              </>
            )}

            {/* Declined invitations */}
            {isOwner && declinedInvs.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.25rem 0.6rem 0.1rem' }}>Visszautasított meghívók</div>
                {declinedInvs.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-md)', opacity: 0.65 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={12} color="var(--danger)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.3 }}>{inv.email}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>Visszautasítva · {formatDate(inv.created_at)}</div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }} title="Újra meghívás">
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

      {/* Basic user — locked inclusive collective placeholder */}
      {isBasic && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Inkluzív Kollektíva
          </div>
          <div className="card" style={{ opacity: 0.75, border: '2px dashed var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Inkluzív Kollektíva
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', letterSpacing: '0.04em' }}>
                    ZÁROLT
                  </span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Prémium előfizetéssel 1 ingyenes kollektívát kapsz — max. 3 taggal.
                </div>
              </div>
            </div>
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Prémium szükséges a feloldáshoz</span>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                <Zap size={13} /> Prémium — Feloldás →
              </a>
            </div>
          </div>
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

      {/* Pending invitations received by this user */}
      {myInvitations.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Beérkező meghívók</span>
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
              {myInvitations.length}
            </span>
          </div>
          {myInvitations.map(inv => (
            <div key={inv.id} className="card" style={{ marginBottom: '0.75rem', border: '1px solid var(--accent-border, #bfdbfe)', background: 'var(--accent-light, #eff6ff)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.15rem' }}>{inv.collective_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Meghívta: <strong>{inv.inviter_name || 'Ismeretlen'}</strong>
                    {' · '}
                    {new Date(inv.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={respondingInvId === inv.id}
                    onClick={() => handleRespondToInvitation(inv, 'decline')}
                    style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                  >
                    {respondingInvId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    Visszautasítás
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={respondingInvId === inv.id}
                    onClick={() => handleRespondToInvitation(inv, 'accept')}
                  >
                    {respondingInvId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Elfogadás
                  </button>
                </div>
              </div>
            </div>
          ))}
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

      {collectives.length === 0 && myInvitations.length === 0 && !kollektivaResult && !isBasic && (
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

      {/* ── Create modal (3-step + premium gate) ── */}
      <Modal isOpen={showCreate} onClose={closeCreateModal} title={
        createStep === 0 ? 'Prémium szükséges' :
        createStep === 1 ? 'Új kollektíva — Név' :
        createStep === 2 ? 'Új kollektíva — Csomag' :
        'Fizetés megerősítése'
      }>
        {createError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{createError}</span>
          </div>
        )}

        {/* Step 0: premium gate — non-premium users see this first */}
        {createStep === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
              <Crown size={18} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.825rem', color: '#7c2d12', lineHeight: 1.55 }}>
                <strong>Prémium előfizetés szükséges</strong>
                <p style={{ margin: '0.35rem 0 0' }}>
                  A kollektívák — közös projektek, meghívott csapattagok, megosztott ajánlatok — Prémium funkció.
                  Először aktiváld a Prémiumot, majd térj vissza a kollektíva létrehozásához.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeCreateModal}>Bezárás</button>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }} onClick={closeCreateModal}>
                <Zap size={13} /> Prémium aktiválása →
              </a>
            </div>
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

        {/* Step 2: tier selection (only reachable by effective premium users) */}
        {createStep === 2 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="var(--success-text)" style={{ flexShrink: 0 }} />
              Prémium előfizetésed aktív — az alábbi árak kiegészítő díjak.
            </div>

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
                    {/* Left: name + seats + price */}
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
                          {tier.addonPrice}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hó + ÁFA</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({tier.addonPriceHuf})</span>
                      </div>
                      <div style={{ marginTop: '0.3rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          fontSize: '0.68rem', fontWeight: 600,
                          padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                          background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
                        }}>
                          Kiegészítő a Prémiumhoz
                        </span>
                      </div>
                    </div>

                    {/* Right: arrow */}
                    <ChevronRight size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                  </button>
              ))}
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
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{createTier.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Kollektíva neve: <strong style={{ color: 'var(--text-primary)' }}>{createName}</strong></div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)' }}>{createTier.addonPrice}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hó + ÁFA</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({createTier.addonPriceHuf})</span>
              </div>
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

      {/* ── Seat limit modal ── */}
      <Modal isOpen={!!seatLimitModal} onClose={() => setSeatLimitModal(null)} title="Férőhely-korlát elérve">
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
                    Az <strong>inkluzív kollektíva</strong> maximum <strong>3 tagot</strong> támogat (te + 2 közreműködő),
                    és mind a(z) <strong>{usedSeats}</strong> hely foglalt (aktív tagok + függőben lévő meghívók).
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                    Ha több munkatársat szeretnél bevonni, hozz létre fizetős kollektívát, vagy vonj vissza egy meglévő meghívót.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeatLimitModal(null)}>Bezárás</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>
                    A(z) <strong>„{seatLimitModal.name}"</strong> kollektíva jelenleg a{' '}
                    <strong>{tier?.name ?? seatLimitModal.collective_tier}</strong> csomagon van,
                    amely <strong>{tier?.seats} férőhelyet</strong> tartalmaz — és mind a(z) <strong>{usedSeats}</strong> már foglalt
                    (aktív tagok + függőben lévő meghívók).
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                    Ha több munkatárssal szeretnél együttdolgozni, válts egy nagyobb csomagra — vagy vonj vissza egy meglévő meghívót, hogy helyet szabadíts fel.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeatLimitModal(null)}>Bezárás</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { setSeatLimitModal(null); setUpgradeModal(seatLimitModal); }}>
                      Csomag bővítése →
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
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


      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title ?? 'Megerősítés'} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} cancelLabel={confirmModal?.cancelLabel} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant ?? 'error'} title={alertModal?.title} action={alertModal?.action} />

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
                  const tierObj = CREEM_TIERS.find(t => t.key === tier);
                  const productId = tierObj?.addonProductId;
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
      <Modal isOpen={!!upgradeModal} onClose={() => !upgradingTier && setUpgradeModal(null)} title="Csomag módosítása">
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
                Jelenlegi csomag: <strong>{TIER_DISPLAY[currentTier]?.name ?? 'Ismeretlen'}</strong> · <strong>{currentUsedSeats}</strong> foglalt hely.
                Az arányos különbözet azonnal kerül terhelésre / jóváírásra.
              </p>

              {['small', 'medium', 'large'].filter(k => k !== currentTier).map(key => {
                const tier = CREEM_TIERS.find(t => t.key === key);
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
                        title: isUpgrade ? 'Csomag bővítése' : 'Csomag csökkentése',
                        message: <span>Mostantól a(z) <strong>{tier.name}</strong> csomagra vált ({tier.seats} hely, {tier.addonPrice}/hó). Az arányos díjkülönbözet azonnal terhelésre / jóváírásra kerül.</span>,
                        confirmLabel: isUpgrade ? 'Bővítés' : 'Csökkentés',
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
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{tier.name}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: isUpgrade ? 'var(--accent-light)' : 'var(--bg-subtle)', color: isUpgrade ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${isUpgrade ? 'var(--accent-border)' : 'var(--border-subtle)'}` }}>
                          {isUpgrade ? '▲ Bővítés' : '▼ Csökkentés'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tier.seats} extra tag · {tier.addonPrice}/hó + ÁFA
                      </div>
                      {blocked && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.2rem' }}>
                          Nem lehetséges — {currentUsedSeats} foglalt hely van, ez a csomag csak {seatLimit}-et enged
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
