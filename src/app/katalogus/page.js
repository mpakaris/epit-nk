'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Check, Loader2, ChevronDown, Package } from 'lucide-react';
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

function ItemForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('A tétel neve kötelező'); return; }
    if (!form.unit.trim()) { setError('A mértékegység kötelező'); return; }
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
          <label className="form-label">Szakma / Kategória</label>
          <select className="form-control" value={form.trade} onChange={e => set('trade', e.target.value)}>
            <option value="">– Válassz –</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Mértékegység *</label>
          <input type="text" className="form-control" placeholder="m², db, fm, óra…" value={form.unit} onChange={e => set('unit', e.target.value)} required />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Tétel neve *</label>
        <input autoFocus type="text" className="form-control" placeholder="pl. Csempe rakás, Festés" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Munkadíj (Ft / egység)</label>
        <input type="number" min="0" step="1" className="form-control" placeholder="pl. 8500" value={form.labour_price} onChange={e => set('labour_price', e.target.value)} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Megjegyzés</label>
        <input type="text" className="form-control" placeholder="Opcionális" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />Mentés…</> : <><Check size={13} />{initial ? 'Módosítás' : 'Hozzáadás'}</>}
        </button>
      </div>
    </form>
  );
}

function TradeGroup({ trade, items, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', cursor: 'pointer', marginBottom: '0.35rem' }}>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.18s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{trade || 'Egyéb'}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{items.length} db</span>
      </button>
      {open && (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Név</th>
                <th style={{ textAlign: 'center', padding: '0.45rem 0.5rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', width: 60 }}>Egység</th>
                <th style={{ textAlign: 'right', padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', width: 100 }}>Munkadíj</th>
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
    if (!window.confirm(`Biztosan törli: „${item.name}"?`)) return;
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

  // Group by trade
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
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>Árkatalógus <WorkspaceBadge /></h1>
            <p className="page-subtitle">Munkadíjak és tételek — az ajánlatokban és felméréseknél auto-kitölthetők</p>
          </div>
          <button type="button" onClick={() => { setShowAdd(true); setEditing(null); }} className="btn btn-primary btn-sm">
            <Plus size={14} /> Új tétel
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>Új tétel</span>
            <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <ItemForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Edit drawer */}
      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'auto', padding: '1.25rem 1.25rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>Tétel szerkesztése</span>
              <button type="button" onClick={() => setEditing(null)} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <ItemForm
              initial={{ trade: editing.trade || '', name: editing.name, unit: editing.unit, labour_price: editing.labour_price ?? '', notes: editing.notes || '' }}
              onSave={handleEdit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAdd && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Package size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Nincs még tétel a katalógusban</p>
          <p style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>Vedd fel munkadíjaidat — ezek auto-kitöltik az ajánlatokat és felméréseket.</p>
          <button type="button" onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Első tétel hozzáadása
          </button>
        </div>
      )}

      {/* Trade groups */}
      {sortedTrades.map(trade => (
        <TradeGroup
          key={trade || '__none__'}
          trade={trade}
          items={groups[trade]}
          onEdit={item => { setEditing(item); setShowAdd(false); }}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
