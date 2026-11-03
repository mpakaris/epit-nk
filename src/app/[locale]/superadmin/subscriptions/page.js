'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import { formatDate } from '@/lib/constants';
import {
  ArrowLeft, ShieldCheck, CheckCircle2, Crown, Star,
  Users, Search, RefreshCw, Building2, UserCheck
} from 'lucide-react';

function formatLastLogin(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(iso);
}

const ROLE_LABELS = { superadmin: 'Superadmin', admin: 'Admin', user: 'Member' };

export default function SuperadminSubscriptionsPage() {
  const { isSuperAdmin, loading: appLoading } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [updatingCollective, setUpdatingCollective] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [alertModal, setAlertModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPremium, setFilterPremium] = useState('all');

  // Inline seat editor state: { collectiveId, value }
  const [editingSeats, setEditingSeats] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/subscriptions');
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

  const handlePersonalToggle = async (user) => {
    setToggling(user.id);
    const next = !user.is_subscription_premium;
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, is_subscription_premium: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_subscription_premium: next } : u));
      setSuccessMsg(`${user.display_name} — personal: ${next ? 'Premium' : 'Basic'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setToggling(null);
    }
  };

  const handleCollectiveTypeToggle = async (collective, currentType) => {
    const nextType = currentType === 'premium' ? 'seats' : 'premium';
    setUpdatingCollective(collective.id);
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectiveId: collective.id,
          subscription_type: nextType,
          seat_count: collective.seat_count ?? 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => ({
        ...u,
        owned_collectives: u.owned_collectives.map(c =>
          c.id === collective.id ? { ...c, subscription_type: nextType } : c
        ),
      })));
      setSuccessMsg(`${collective.name} — type: ${nextType === 'premium' ? 'Premium' : 'Seats'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setUpdatingCollective(null);
    }
  };

  const handleSeatCountSave = async (collective, newCount) => {
    const seats = parseInt(newCount, 10);
    if (!seats || seats < 1) { setEditingSeats(null); return; }
    setUpdatingCollective(collective.id);
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectiveId: collective.id,
          subscription_type: 'seats',
          seat_count: seats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => ({
        ...u,
        owned_collectives: u.owned_collectives.map(c =>
          c.id === collective.id ? { ...c, seat_count: seats } : c
        ),
      })));
      setSuccessMsg(`${collective.name} — ${seats} seats saved`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setUpdatingCollective(null);
      setEditingSeats(null);
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

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.display_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchFilter =
      filterPremium === 'all' ||
      (filterPremium === 'premium' && u.is_subscription_premium) ||
      (filterPremium === 'free' && !u.is_subscription_premium) ||
      (filterPremium === 'collective' && u.owned_collectives?.length > 0);
    return matchSearch && matchFilter;
  });

  const premiumCount = users.filter(u => u.is_subscription_premium).length;
  const collectiveOwnerCount = users.filter(u => u.owned_collectives?.length > 0).length;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Superadmin
            </div>
            <h1 className="page-title">Subscriptions</h1>
            <p className="page-subtitle">{users.length} users · {premiumCount} premium · {collectiveOwnerCount} collective owners</p>
          </div>
          <button type="button" onClick={fetchUsers} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2rem', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'premium', label: 'Premium' },
            { key: 'free', label: 'Basic' },
            { key: 'collective', label: 'Collective' },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterPremium(f.key)}
              className={filterPremium === f.key ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No results</h4>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="hide-mobile">Role</th>
                <th className="hide-mobile">Last login</th>
                <th className="hide-mobile">Registered</th>
                <th style={{ textAlign: 'center' }}>Personal</th>
                <th style={{ textAlign: 'center' }}>Collective type</th>
                <th style={{ textAlign: 'center' }}>Seats</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const collective = u.owned_collectives?.[0] ?? null;
                const isUpdatingC = updatingCollective === collective?.id;

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{u.display_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td className="hide-mobile">
                      <span className={`role-tag ${u.role}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                    </td>
                    <td className="hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatLastLogin(u.last_sign_in_at)}
                    </td>
                    <td className="hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDate(u.created_at)}
                    </td>

                    {/* Personal subscription */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handlePersonalToggle(u)}
                        disabled={toggling === u.id || u.role === 'superadmin'}
                        className={u.is_subscription_premium ? 'btn btn-sm' : 'btn btn-secondary btn-sm'}
                        style={u.is_subscription_premium ? {
                          background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                          color: '#fff',
                          border: 'none',
                          gap: '0.35rem',
                          minWidth: '82px',
                        } : { gap: '0.35rem', minWidth: '82px' }}
                        title={u.role === 'superadmin' ? 'Cannot modify superadmin' : undefined}
                      >
                        {u.is_subscription_premium ? <Crown size={13} /> : <Star size={13} />}
                        {toggling === u.id ? '...' : (u.is_subscription_premium ? 'Premium' : 'Basic')}
                      </button>
                    </td>

                    {/* Collective subscription type */}
                    <td style={{ textAlign: 'center' }}>
                      {collective ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={collective.name}>
                            {collective.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCollectiveTypeToggle(collective, collective.subscription_type)}
                            disabled={isUpdatingC}
                            className={collective.subscription_type === 'seats' ? 'btn btn-sm' : 'btn btn-secondary btn-sm'}
                            style={collective.subscription_type === 'seats' ? {
                              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                              color: '#fff',
                              border: 'none',
                              gap: '0.35rem',
                              fontSize: '0.775rem',
                              minWidth: '80px',
                            } : { gap: '0.35rem', fontSize: '0.775rem', minWidth: '80px' }}
                          >
                            <Building2 size={12} />
                            {isUpdatingC ? '...' : (collective.subscription_type === 'seats' ? 'Seats' : 'Premium')}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>

                    {/* Seats */}
                    <td style={{ textAlign: 'center' }}>
                      {collective && collective.subscription_type === 'seats' ? (
                        editingSeats?.collectiveId === collective.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={editingSeats.value}
                              onChange={e => setEditingSeats(s => ({ ...s, value: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSeatCountSave(collective, editingSeats.value);
                                if (e.key === 'Escape') setEditingSeats(null);
                              }}
                              autoFocus
                              style={{ width: 52, padding: '0.2rem 0.35rem', fontSize: '0.82rem', textAlign: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)' }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                              onClick={() => handleSeatCountSave(collective, editingSeats.value)}
                              disabled={isUpdatingC}
                            >
                              <UserCheck size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingSeats({ collectiveId: collective.id, value: String(collective.seat_count ?? 1) })}
                            style={{ background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 700 }}
                            title="Click to edit"
                          >
                            {collective.seat_count ?? 1}
                          </button>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
