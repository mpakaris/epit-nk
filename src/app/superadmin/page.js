'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { formatDate, formatHUF } from '@/lib/constants';
import {
  Building2, Plus, Users, FolderKanban, Eye, Trash2,
  ShieldAlert, AlertCircle, CheckCircle2, Edit3, ArrowUpRight,
  FileText, Receipt, Coins, Globe, CreditCard, Image, Mail, Loader2,
  Skull, Search, X, Wrench, LayoutDashboard, ClipboardList,
  BarChart3, Settings, BookOpen, Camera, MessageCircle,
} from 'lucide-react';

// ── Navigation cards definition ────────────────────────────────────────────
const NAV_CARDS = [
  { title: 'Audit Log',        desc: 'All system events and user actions',      icon: ClipboardList, href: '/superadmin/naplo',         color: '#0f766e' },
  { title: 'Subscriptions',    desc: 'Premium users and billing overview',       icon: CreditCard,    href: '/superadmin/subscriptions',   color: '#7c3aed' },
  { title: 'Pricing',          desc: 'Tiers, limits and pricing configuration',  icon: Coins,         href: '/superadmin/pricing',         color: '#d97706' },
  { title: 'All Projects',     desc: 'Every project across all users',           icon: FolderKanban,  href: '/superadmin/projektek',       color: '#2563eb' },
  { title: 'Websites',         desc: 'Szakember partner pages',                  icon: Globe,         href: '/superadmin/websites',        color: '#0891b2' },
  { title: 'Image Library',    desc: 'Platform hero and trade images',           icon: Image,         href: '/superadmin/image-library',   color: '#9333ea' },
  { title: 'About Photo',      desc: 'Portrait photo for the /about page',       icon: Camera,        href: '/superadmin/about',           color: '#64748b' },
  { title: 'Client Portals',   desc: 'All client portal links',                  icon: Users,         href: '/superadmin/portals',         color: '#059669' },
];

export default function SuperAdminPage() {
  const {
    isSuperAdmin, loading, entities, users, projects, invoices, quotes,
    createEntity, updateEntity, deleteEntity, startImpersonation, allMemberships
  } = useApp();

  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editingEntity, setEditingEntity]     = useState(null);
  const [entityName, setEntityName]           = useState('');
  const [formError, setFormError]             = useState('');
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [successMsg, setSuccessMsg]           = useState('');

  // Legacy entity picker
  const [pickerEntity, setPickerEntity] = useState(null);
  const [pickerAdmins, setPickerAdmins] = useState([]);

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal]     = useState(null);

  // Nav card search
  const [navSearch, setNavSearch] = useState('');

  // SMTP
  const [smtpPinging, setSmtpPinging] = useState(false);
  const [smtpStatus, setSmtpStatus]   = useState(null);

  // WhatsApp test
  const [waSending, setWaSending] = useState(false);
  const [waResult,  setWaResult]  = useState(null);

  // Auth repair
  const [repairEmail, setRepairEmail]   = useState('');
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  // Account deletion
  const [deletionEmail, setDeletionEmail]     = useState('');
  const [deletionRunning, setDeletionRunning] = useState(false);
  const [deletionResult, setDeletionResult]   = useState(null);

  // ── God Mode ──────────────────────────────────────────────────────────────
  const [godSearch, setGodSearch] = useState('');

  const doImpersonate = (userId) => {
    startImpersonation(userId).catch(err => setAlertModal({ message: err.message }));
  };

  // ── Total Recall + aggregate stats ───────────────────────────────────────
  const [recallUsers,    setRecallUsers]    = useState([]);
  const [recallLoading,  setRecallLoading]  = useState(false);
  const [recallSearch,   setRecallSearch]   = useState('');
  const [recallDeleting, setRecallDeleting] = useState(null);
  const [recallConfirm,  setRecallConfirm]  = useState(null);
  const [recallInput,    setRecallInput]    = useState('');
  const [recallResult,   setRecallResult]   = useState(null);
  const [saStats,        setSaStats]        = useState({ collectives: 0, surveys: 0 });

  useEffect(() => {
    fetch('/api/superadmin/total-recall')
      .then(r => r.json())
      .then(d => {
        setRecallUsers(d.users ?? []);
        if (d.stats) setSaStats(d.stats);
      })
      .catch(() => {});
  }, []);

  const handleTotalRecall = async (user) => {
    setRecallDeleting(user.email);
    setRecallResult(null);
    try {
      const res = await fetch('/api/superadmin/total-recall', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecallUsers(prev => prev.filter(u => u.email !== user.email));
        setRecallResult({ ok: true, email: user.email });
      } else {
        setRecallResult({ error: data.error });
      }
    } catch (e) {
      setRecallResult({ error: e.message });
    } finally {
      setRecallDeleting(null);
      setRecallConfirm(null);
      setRecallInput('');
    }
  };

  const handleExecuteDeletions = async (email) => {
    setDeletionRunning(true);
    setDeletionResult(null);
    try {
      const res = await fetch('/api/superadmin/execute-deletions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();
      setDeletionResult(data);
      if (email && data.ok) setDeletionEmail('');
    } catch (err) {
      setDeletionResult({ error: err.message });
    } finally {
      setDeletionRunning(false);
    }
  };

  const handleSmtpPing = async () => {
    setSmtpPinging(true);
    setSmtpStatus(null);
    try {
      const res = await fetch('/api/superadmin/email/ping', { method: 'POST' });
      const data = await res.json();
      setSmtpStatus(data);
    } catch (err) {
      setSmtpStatus({ ok: false, error: err.message });
    } finally {
      setSmtpPinging(false);
    }
  };

  const handleWaTest = async () => {
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await fetch('/api/superadmin/wa-test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setWaResult(data);
    } catch (err) {
      setWaResult({ ok: false, error: err.message });
    } finally {
      setWaSending(false);
    }
  };

  const handleRepairAuth = async () => {
    if (!repairEmail.trim()) return;
    setRepairLoading(true);
    setRepairResult(null);
    try {
      const res = await fetch('/api/superadmin/repair-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: repairEmail.trim() }),
      });
      const data = await res.json();
      setRepairResult(data);
    } catch (err) {
      setRepairResult({ error: err.message });
    } finally {
      setRepairLoading(false);
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
      </div>
    );
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const collectiveEntities = entities.filter(e => e.type !== 'personal');
  const totalUsers   = recallUsers.length;
  const basicCount   = recallUsers.filter(u => !u.is_subscription_premium && u.subscription_tier === 'basic').length;
  const trialCount   = recallUsers.filter(u => u.subscription_tier === 'trial').length;
  const premiumCount = recallUsers.filter(u => u.is_subscription_premium).length;
  const totalHUF     = invoices.reduce((s, i) => s + Number(i.value_huf || 0), 0);

  // ── Legacy entity helpers ─────────────────────────────────────────────────
  const openCreate = () => { setEntityName(''); setFormError(''); setEditingEntity(null); setShowEntityModal(true); };
  const openEdit   = (entity) => { setEntityName(entity.name); setFormError(''); setEditingEntity(entity); setShowEntityModal(true); };

  const handleEntitySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!entityName.trim()) { setFormError('Name is required!'); return; }
    setIsSubmitting(true);
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, { name: entityName.trim() });
        setSuccessMsg('Entity name updated.');
      } else {
        await createEntity({ name: entityName.trim() });
        setSuccessMsg(`"${entityName.trim()}" created.`);
      }
      setShowEntityModal(false);
    } catch (err) {
      setFormError(err.message || 'Error saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJump = (entity) => {
    const members = allMemberships
      .filter(m => m.entity_id === entity.id)
      .map(m => ({ id: m.user_id, display_name: m.display_name, email: m.email, role: m.role }));
    if (members.length === 0) { setAlertModal({ message: `"${entity.name}" has no members yet.` }); return; }
    if (members.length === 1) { startImpersonation(members[0].id).catch(err => setAlertModal({ message: err.message })); return; }
    setPickerEntity(entity);
    setPickerAdmins(members);
  };

  const handleDelete = (entity) => {
    const entityUsers    = users.filter(u => u.entity_id === entity.id).length;
    const entityProjects = projects.filter(p => p.entity_id === entity.id).length;
    setConfirmModal({
      message: `Are you sure you want to delete "${entity.name}"?\n${entityUsers} users and ${entityProjects} projects will also be deleted. This cannot be undone!`,
      onConfirm: async () => {
        try { await deleteEntity(entity.id); setSuccessMsg(`"${entity.name}" deleted.`); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const filteredNavCards = NAV_CARDS.filter(c => {
    if (!navSearch.trim()) return true;
    const q = navSearch.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
  });

  // ── Stat tile component ───────────────────────────────────────────────────
  const Stat = ({ label, value, sub, color = 'var(--text-primary)' }) => (
    <div className="card" style={{ padding: '0.9rem 1.1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
          <ShieldAlert size={15} /> Superadmin
        </div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">System overview, God Mode and tools</p>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '2rem' }}>
        <Stat label="Total Users"   value={totalUsers}               />
        <Stat label="Basic"         value={basicCount}    sub="free tier"     color="var(--text-muted)" />
        <Stat label="Trial"         value={trialCount}    sub="14-day trial"  color="#d97706" />
        <Stat label="Premium"       value={premiumCount}  sub="paid"          color="#059669" />
        <Stat label="Collectives"   value={saStats.collectives}               color="#2563eb" />
        <Stat label="Projects"      value={projects.length}                   />
        <Stat label="Quotes"        value={quotes.length}                     />
        <Stat label="Surveys"       value={saStats.surveys}                   />
        <Stat label="Invoices"      value={invoices.length} sub={formatHUF(totalHUF)} />
      </div>

      {/* ── Navigation cards ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Pages</h2>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Filter pages…"
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2rem', width: 200 }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem' }}>
          {filteredNavCards.map(card => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card card-interactive" style={{ padding: '1rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', height: '100%' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {card.title} <ArrowUpRight size={13} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── God Mode ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <Eye size={13} /> God Mode
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Enter any user's workspace</h2>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={godSearch}
              onChange={e => setGodSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2rem', width: 260 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.55rem' }}>
          {recallUsers
            .filter(u => {
              if (!godSearch.trim()) return true;
              const q = godSearch.toLowerCase();
              return (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
            })
            .map(u => {
              const initial    = (u.display_name || u.email || '?')[0].toUpperCase();
              const tierColor  = u.is_subscription_premium ? '#059669' : u.subscription_tier === 'trial' ? '#d97706' : 'var(--text-muted)';
              const tierLabel  = u.is_subscription_premium ? 'Premium' : u.subscription_tier === 'trial' ? 'Trial' : 'Basic';
              return (
                <div key={u.id} className="card" style={{ padding: '0.75rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name || u.email}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: tierColor, marginTop: '0.1rem' }}>
                      {tierLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => doImpersonate(u.id)}
                    style={{ flexShrink: 0, padding: '0.35rem 0.7rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Eye size={13} /> Enter
                  </button>
                </div>
              );
            })
          }
          {recallUsers.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>Loading users…</div>
          )}
        </div>
      </div>

      {/* ── Tools ── */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.85rem' }}>Tools</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>

        {/* Auth Repair */}
        <div className="card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
            <Wrench size={15} color="var(--warning)" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>Auth Repair</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.65rem', lineHeight: 1.5 }}>
            Recreates a missing Supabase Auth record for a profile — all data references stay intact.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="email" placeholder="user@example.com" value={repairEmail} onChange={e => { setRepairEmail(e.target.value); setRepairResult(null); }} className="form-control" style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleRepairAuth} disabled={repairLoading || !repairEmail.trim()}>
              {repairLoading ? <Loader2 size={13} className="animate-spin" /> : 'Repair'}
            </button>
          </div>
          {repairResult && (
            <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: repairResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${repairResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: repairResult.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
              {repairResult.ok ? <><CheckCircle2 size={14} /> {repairResult.message}</> : <><AlertCircle size={14} /> {repairResult.error}</>}
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
            <Trash2 size={15} color="var(--danger)" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>Delete Account</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.65rem', lineHeight: 1.5 }}>
            Delete by email (GDPR request), or run all pending scheduled deletions.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="email" placeholder="user@example.com (optional)" value={deletionEmail} onChange={e => { setDeletionEmail(e.target.value); setDeletionResult(null); }} className="form-control" style={{ flex: 1 }} />
            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleExecuteDeletions(deletionEmail.trim() || null)} disabled={deletionRunning}>
              {deletionRunning ? <Loader2 size={13} className="animate-spin" /> : deletionEmail.trim() ? 'Delete' : 'Run Pending'}
            </button>
          </div>
          {deletionResult && (
            <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: deletionResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${deletionResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: deletionResult.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
              {deletionResult.ok
                ? deletionResult.deleted === 0
                  ? <><CheckCircle2 size={14} /> No pending deletions.</>
                  : <><CheckCircle2 size={14} /> Deleted {deletionResult.deleted} of {deletionResult.total}.</>
                : <><AlertCircle size={14} /> {deletionResult.error}</>}
            </div>
          )}
        </div>

        {/* SMTP */}
        <div className="card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={15} color="var(--accent)" />
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>Email / SMTP</h3>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleSmtpPing} disabled={smtpPinging}>
              {smtpPinging ? <><Loader2 size={13} className="animate-spin" /> Testing…</> : 'Test Connection'}
            </button>
          </div>
          {!smtpStatus && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Gmail SMTP · smtp.gmail.com:587</p>}
          {smtpStatus && (
            <div style={{ padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: smtpStatus.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${smtpStatus.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: smtpStatus.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
              {smtpStatus.ok ? <><CheckCircle2 size={14} /> Connected — sending from <strong>{smtpStatus.from}</strong></> : <><AlertCircle size={14} /> {smtpStatus.error}</>}
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div className="card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
            <MessageCircle size={15} color="#25D366" />
            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>WhatsApp</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.65rem', lineHeight: 1.5 }}>
            Küld egy teszt üzenetet hogy ellenőrizd az asszisztenst. Bot: <code style={{ fontSize: '0.75rem' }}>{process.env.NEXT_PUBLIC_WHINSELF_BOT_PHONE || 'nincs beállítva'}</code>
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleWaTest}
            disabled={waSending}
          >
            {waSending ? <Loader2 size={13} className="animate-spin" /> : 'Teszt küldése'}
          </button>
          {waResult && (
            <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: waResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${waResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: waResult.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
              {waResult.ok
                ? <><CheckCircle2 size={14} /> Elküldve → {waResult.chatId}</>
                : <><AlertCircle size={14} /> {waResult.error || JSON.stringify(waResult.detail)}</>}
            </div>
          )}
        </div>

      </div>

      {/* ── Total Recall ── */}
      <div className="card" style={{ padding: '1.1rem', marginBottom: '2rem', border: '1.5px solid var(--danger-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Skull size={15} color="var(--danger)" />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, margin: 0 }}>Total Recall</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
          Permanently wipes every DB row, R2 media and auth record for a user. Irreversible.
        </p>
        <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Filter by email or name…" value={recallSearch} onChange={e => setRecallSearch(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {recallResult && (
          <div style={{ marginBottom: '0.65rem', padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: recallResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${recallResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: recallResult.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
            {recallResult.ok ? <><CheckCircle2 size={14} /> <strong>{recallResult.email}</strong> — fully wiped.</> : <><AlertCircle size={14} /> {recallResult.error}</>}
            <button type="button" onClick={() => setRecallResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={13} /></button>
          </div>
        )}
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          {recallUsers.filter(u => { const q = recallSearch.toLowerCase(); return !q || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q); }).map(u => {
            const tierColor = u.is_subscription_premium ? '#b45309' : u.subscription_tier === 'trial' ? '#1d4ed8' : 'var(--text-muted)';
            const tierLabel = u.is_subscription_premium ? '⭐ Premium' : u.subscription_tier === 'trial' ? '⏳ Trial' : 'Basic';
            const isDeleting = recallDeleting === u.email;
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', background: isDeleting ? 'var(--danger-bg)' : 'transparent' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {(u.display_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || '—'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', color: tierColor, border: '1px solid var(--border-subtle)', flexShrink: 0 }}>{tierLabel}</span>
                <button type="button" disabled={!!recallDeleting} onClick={() => { setRecallConfirm(u); setRecallInput(''); setRecallResult(null); }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 700, cursor: recallDeleting ? 'default' : 'pointer', opacity: recallDeleting ? 0.5 : 1 }}>
                  {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Skull size={11} />}
                  {isDeleting ? 'Wiping…' : 'Recall'}
                </button>
              </div>
            );
          })}
          {recallUsers.filter(u => { const q = recallSearch.toLowerCase(); return !q || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q); }).length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              {recallSearch ? 'No users match your search.' : 'No users found.'}
            </div>
          )}
        </div>
      </div>


      {/* ── Modals ── */}

      <Modal isOpen={!!recallConfirm} onClose={() => { setRecallConfirm(null); setRecallInput(''); }} title="⚠ Total Recall — Irreversible">
        {recallConfirm && (
          <div>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.6 }}>
              This will permanently destroy <strong>every record</strong> for <strong>{recallConfirm.email}</strong> — projects, quotes, collectives, subscriptions, R2 media, auth account. No undo.
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Type the email to confirm:</p>
            <input type="text" autoFocus className="form-control" placeholder={recallConfirm.email} value={recallInput} onChange={e => setRecallInput(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setRecallConfirm(null); setRecallInput(''); }}>Cancel</button>
              <button type="button" className="btn btn-danger btn-sm" disabled={recallInput !== recallConfirm.email || !!recallDeleting} onClick={() => handleTotalRecall(recallConfirm)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Skull size={13} /> Total Recall
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Delete Entity" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
