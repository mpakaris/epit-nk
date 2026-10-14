'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import { formatDate } from '@/lib/constants';
import {
  ArrowLeft, Globe, ShieldCheck, CheckCircle2, AlertCircle,
  Crown, Star, ExternalLink
} from 'lucide-react';

export default function SuperadminWebsitesPage() {
  const { isSuperAdmin, loading: appLoading } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [alertModal, setAlertModal] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/websites');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!appLoading && isSuperAdmin) fetchUsers();
  }, [appLoading, isSuperAdmin, fetchUsers]);

  const handleTogglePremium = async (user) => {
    setToggling(user.id);
    const next = !user.is_subscription_premium;
    try {
      const res = await fetch('/api/superadmin/websites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_subscription_premium: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_subscription_premium: next } : u));
      setSuccessMsg(`${user.display_name} — ${next ? 'Premium activated' : 'Premium removed'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setToggling(null);
    }
  };

  if (appLoading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
      </div>
    );
  }

  const premiumCount = users.filter(u => u.is_subscription_premium).length;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> Superadmin – Partner Websites
          </div>
          <h1 className="page-title">Websites</h1>
          <p className="page-subtitle">{users.length} partners · {premiumCount} premium</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Globe size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No partner websites yet</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Once a partner creates their page, it will appear here.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th className="hide-mobile">URL</th>
                <th>Status</th>
                <th className="hide-mobile">Published</th>
                <th style={{ textAlign: 'right' }}>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.display_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td className="hide-mobile">
                    <a
                      href={`/szakemberek/${u.website.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    >
                      {u.website.slug} <ExternalLink size={11} />
                    </a>
                  </td>
                  <td>
                    {u.website.status === 'published' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Published
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertCircle size={13} /> Draft
                      </span>
                    )}
                  </td>
                  <td className="hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {u.website.published_at ? formatDate(u.website.published_at) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleTogglePremium(u)}
                      disabled={toggling === u.id}
                      className={u.is_subscription_premium ? 'btn btn-sm' : 'btn btn-secondary btn-sm'}
                      style={u.is_subscription_premium ? {
                        background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                        color: '#fff',
                        border: 'none',
                        gap: '0.35rem',
                      } : { gap: '0.35rem' }}
                    >
                      {u.is_subscription_premium ? <Crown size={13} /> : <Star size={13} />}
                      {toggling === u.id ? '...' : (u.is_subscription_premium ? 'Premium' : 'Free')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
