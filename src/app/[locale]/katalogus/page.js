'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Check, Loader2, ChevronDown, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatHUF } from '@/lib/constants';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceBadge from '@/components/WorkspaceBadge';

const TRADES = [
  'általános',
  'burkoló / csempés',
  'festő / mázoló',
  'gipszkartonos',
  'kőműves',
  'villanyszerelő',
  'vízszerelő',
  'ács',
  'kertész',
  'egyéb',
];

const EMPTY_FORM = { trade: '', name: '', unit: 'm²', labour_price: '', notes: '' };

function ItemForm({ initial, onSave, onCancel, t }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('errorNameRequired')); return; }
    if (!form.unit.trim()) { setError(t('errorUnitRequired')); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        trade:        form.trade?.trim() || null,
        name:         form.name.trim(),
        unit:         form.unit.trim(),
        labour_price: form.labour_price ? Number(form.labour_price) : null,
        notes:        form.notes?.trim() || null,
      });
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('formTradeLabel')}</label>
          <select className="form-control" value={form.trade} onChange={e => set('trade', e.target.value)}>
            <option value="">{t('formTradeSelect')}</option>
            {TRADES.map(trade => <option key={trade} value={trade}>{trade}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('formUnitLabel')}</label>
          <input type="text" className="form-control" placeholder={t('formUnitPlaceholder')} value={form.unit} onChange={e => set('unit', e.target.value)} required />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">{t('formNameLabel')}</label>
        <input autoFocus type="text" className="form-control" placeholder={t('formNamePlaceholder')} value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">{t('formLabourLabel')}</label>
        <input type="number" min="0" step="1" className="form-control" placeholder={t('formLabourPlaceholder')} value={form.labour_price} onChange={e => set('labour_price', e.target.value)} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">{t('formNotesLabel')}</label>
        <input type="text" className="form-control" placeholder={t('formNotesPlaceholder')} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>{t('formCancelBtn')}</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />{t('formSavingBtn')}</> : <><Check size={13} />{initial ? t('formUpdateBtn') : t('formAddBtn')}</>}
        </button>
      </div>
    </form>
  );
}

function TradeGroup({ trade, items, onEdit, onDelete, t }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', cursor: 'pointer', marginBottom: '0.35rem' }}>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.18s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{trade || t('groupOther')}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('groupItemCount', { count: items.length })}</span>
      </button>
      {open && (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>{t('colName')}</th>
                <th style={{ textAlign: 'center', padding: '0.45rem 0.5rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', width: 60 }}>{t('colUnit')}</th>
                <th style={{ textAlign: 'right', padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', width: 100 }}>{t('colLabour')}</th>
                <th style={{ width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '0.55rem 0.75rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                    {item.notes && <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block' }}>{item.notes}</span>}
                  </td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{item.unit}</td>
                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.labour_price ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: item.labour_price ? 700 : 400 }}>
                    {item.labour_price ? formatHUF(item.labour_price) : '–'}
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => onEdit(item)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}>
                        <Edit3 size={12} />
                      </button>
                      <button type="button" onClick={() => onDelete(item)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function KatalogusPage() {
  const t = useTranslations('katalogus');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogue');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (fields) => {
    const res = await fetch('/api/catalogue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setItems(prev => [...prev, data.item]);
    setShowAdd(false);
  };

  const handleEdit = async (fields) => {
    const res = await fetch(`/api/catalogue/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setItems(prev => prev.map(i => i.id === editing.id ? data.item : i));
    setEditing(null);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(t('deleteConfirm', { name: item.name }))) return;
    setDeleting(item.id);
    try {
      const res = await fetch(`/api/catalogue/${item.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const groups = {};
  for (const item of items) {
    const key = item.trade || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  const sortedTrades = Object.keys(groups).sort((a, b) => {
    if (!a) return 1; if (!b) return -1;
    return a.localeCompare(b, 'hu');
  });

  if (loading) return <PageSpinner />;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>{t('pageTitle')} <WorkspaceBadge /></h1>
            <p className="page-subtitle">{t('pageSubtitle')}</p>
          </div>
          <button type="button" onClick={() => { setShowAdd(true); setEditing(null); }} aria-label={t('addBtnAriaLabel')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {showAdd && (
        <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>{t('addFormTitle')}</span>
            <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <ItemForm t={t} onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'auto', padding: '1.25rem 1.25rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>{t('editFormTitle')}</span>
              <button type="button" onClick={() => setEditing(null)} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <ItemForm
              t={t}
              initial={{ trade: editing.trade || '', name: editing.name, unit: editing.unit, labour_price: editing.labour_price ?? '', notes: editing.notes || '' }}
              onSave={handleEdit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </>
      )}

      {items.length === 0 && !showAdd && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Package size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ marginBottom: '0.5rem', fontWeight: 700 }}>{t('emptyTitle')}</p>
          <p style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>{t('emptySubtitle')}</p>
          <button type="button" onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> {t('emptyAddBtn')}
          </button>
        </div>
      )}

      {sortedTrades.map(trade => (
        <TradeGroup
          key={trade || '__none__'}
          trade={trade}
          items={groups[trade]}
          t={t}
          onEdit={item => { setEditing(item); setShowAdd(false); }}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
