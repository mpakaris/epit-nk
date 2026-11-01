'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import {
  Mail, ShieldAlert, ArrowLeft, Send, CheckCircle2,
  AlertCircle, Loader2, KeyRound, Users, UserMinus,
  UserX, UserCheck, FileText, LogOut,
} from 'lucide-react';

const EMAIL_TYPES = [
  {
    type:  'password_reset',
    icon:  KeyRound,
    color: '#dc2626',
    title: 'Password Reset',
    desc:  'Token-based reset link email',
  },
  {
    type:  'collective_invitation',
    icon:  Users,
    color: '#2563eb',
    title: 'Collective Invitation',
    desc:  'Invitation email for existing users',
  },
  {
    type:  'member_left',
    icon:  LogOut,
    color: '#d97706',
    title: 'Member Left',
    desc:  'Notification to collective owner',
  },
  {
    type:  'member_removed',
    icon:  UserMinus,
    color: '#7c3aed',
    title: 'Member Removed',
    desc:  'Notification to the removed member',
  },
  {
    type:  'member_blocked',
    icon:  UserX,
    color: '#0f172a',
    title: 'Member Blocked',
    desc:  'Notification to the blocked member',
  },
  {
    type:  'invitation_accepted',
    icon:  UserCheck,
    color: '#059669',
    title: 'Invitation Accepted',
    desc:  'Notification to inviter (owner)',
  },
  {
    type:  'invitation_declined',
    icon:  UserX,
    color: '#64748b',
    title: 'Invitation Declined',
    desc:  'Notification to inviter (owner)',
  },
  {
    type:  'offer_sent',
    icon:  FileText,
    color: '#0891b2',
    title: 'Offer Sent',
    desc:  'Full offer with line items table (no PDF)',
  },
  {
    type:  'collective_created',
    icon:  Users,
    color: '#059669',
    title: 'Collective Created',
    desc:  'Owner confirmation on collective creation',
  },
  {
    type:  'collective_renamed',
    icon:  FileText,
    color: '#2563eb',
    title: 'Collective Renamed',
    desc:  'Member notification when collective is renamed',
  },
  {
    type:  'collective_deleted',
    icon:  UserX,
    color: '#dc2626',
    title: 'Collective Deleted',
    desc:  'Member notification when collective is deleted',
  },
  {
    type:  'member_unblocked',
    icon:  UserCheck,
    color: '#16a34a',
    title: 'Member Unblocked',
    desc:  'Notification to member when access is restored',
  },
];

export default function EmailTestPage() {
  const { isSuperAdmin, loading } = useApp();

  const [to, setTo]           = useState('');
  const [statuses, setStatuses] = useState({});
  const [alertModal, setAlertModal] = useState(null);

  const setStatus = (type, val) => setStatuses(prev => ({ ...prev, [type]: val }));

  const handleSend = async (type) => {
    const recipient = to.trim();
    if (!recipient) {
      setAlertModal({ message: 'Please enter a recipient email address above.' });
      return;
    }
    setStatus(type, { loading: true });
    try {
      const res = await fetch('/api/superadmin/email/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, to: recipient }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(type, { error: data.error || 'Ismeretlen hiba' });
      } else {
        setStatus(type, { ok: true });
      }
    } catch (err) {
      setStatus(type, { error: err.message });
    }
  };

  if (loading) return (
    <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );

  if (!isSuperAdmin) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
    </div>
  );

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>

      {/* Header */}
      <div className="page-header">
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
          <ArrowLeft size={13} /> Back to dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
          <ShieldAlert size={15} /> Superadmin
        </div>
        <h1 className="page-title">Email Tests</h1>
        <p className="page-subtitle">Send test emails for all templates — Brevo SMTP</p>
      </div>

      {/* Recipient input */}
      <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '1.75rem' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Mail size={14} /> Recipient email address
        </label>
        <input
          type="email"
          className="form-control"
          placeholder="tester@example.com"
          value={to}
          onChange={e => setTo(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
          All test emails go to this address. Emails are marked with <strong>[TEST]</strong>.
        </p>
      </div>

      {/* Email type grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '0.75rem' }}>
        {EMAIL_TYPES.map(({ type, icon: Icon, color, title, desc }) => {
          const status = statuses[type];
          return (
            <div key={type} className="card" style={{ padding: '1rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>{desc}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSend(type)}
                  disabled={!!status?.loading}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {status?.loading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <><Send size={13} /> Send</>}
                </button>
              </div>

              {status && !status.loading && (
                <div style={{ marginTop: '0.65rem', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: status.ok ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${status.ok ? 'var(--success-border)' : 'var(--danger-border)'}`, color: status.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>
                  {status.ok
                    ? <><CheckCircle2 size={13} /> Sent → <strong>{to}</strong></>
                    : <><AlertCircle size={13} /> {status.error}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
