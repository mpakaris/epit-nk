'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import { ArrowLeft, ShieldCheck, RefreshCw, CheckCircle2, Edit3, X, Check } from 'lucide-react';

const KEY_ORDER = [
  'premium_monthly_huf',
  'seat_monthly_huf',
  'basic_max_surveys',
  'basic_max_quotes',
  'basic_max_projects',
  'trial_days',
];

export default function SuperadminPricingPage() {
  const { isSuperAdmin, loading: appLoading } = useApp();
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { key, value }
  const [saving, setSaving] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [alertModal, setAlertModal] = useState(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/pricing');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const sorted = KEY_ORDER
        .map(k => data.config.find(c => c.key === k))
        .filter(Boolean)
        .concat(data.config.filter(c => !KEY_ORDER.includes(c.key)));
      setConfig(sorted);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!appLoading && isSuperAdmin) fetchConfig();
  }, [appLoading, isSuperAdmin, fetchConfig]);

  const handleSave = async () => {
    if (!editing) return;
    const val = parseFloat(editing.value);
    if (isNaN(val) || val < 0) { setAlertModal({ message: 'Érvényes számot adj meg.' }); return; }
    setSaving(editing.key);
    try {
      const res = await fetch('/api/superadmin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editing.key, value: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(prev => prev.map(c => c.key === editing.key ? { ...c, value: val, updated_at: new Date().toISOString() } : c));
      setSuccessMsg(`${editing.key} mentve`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditing(null);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setSaving(null);
    }
  };

  if (appLoading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!isSuperAdmin) return <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}><h2 style={{ color: 'var(--danger)' }}>Access Denied</h2></div>;

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Superadmin
            </div>
            <h1 className="page-title">Árazás & Limitek</h1>
            <p className="page-subtitle">Előfizetési díjak és Bázis csomag korlátai</p>
          </div>
          <button type="button" onClick={fetchConfig} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Kulcs</th>
                <th>Leírás</th>
                <th style={{ textAlign: 'right' }}>Érték</th>
                <th style={{ textAlign: 'center', width: 80 }}>Szerk.</th>
              </tr>
            </thead>
            <tbody>
              {config.map(row => {
                const isEditing = editing?.key === row.key;
                const isSaving = saving === row.key;
                return (
                  <tr key={row.key}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.key}</td>
                    <td style={{ fontSize: '0.875rem' }}>{row.label ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={editing.value}
                          onChange={e => setEditing(s => ({ ...s, value: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          autoFocus
                          style={{ width: 90, padding: '0.2rem 0.4rem', fontSize: '0.9rem', textAlign: 'right', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)', fontFamily: 'var(--font-mono)' }}
                        />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Number(row.value).toLocaleString('hu-HU')}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button type="button" className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.45rem' }} onClick={handleSave} disabled={isSaving}>
                            <Check size={13} />
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem' }} onClick={() => setEditing(null)} disabled={isSaving}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem' }} onClick={() => setEditing({ key: row.key, value: String(row.value) })}>
                          <Edit3 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
        Változtatások azonnal érvénybe lépnek az API-ban. A landing page árai kódban vannak — azokat külön kell frissíteni.
      </p>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
