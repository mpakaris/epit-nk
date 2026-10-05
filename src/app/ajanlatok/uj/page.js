'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { AlertModal } from '@/components/Modal';
import { formatHUF, QUOTE_ENTRY_TYPES, QUANTITY_UNITS } from '@/lib/constants';
import {
  ArrowLeft, AlertCircle, Check, Loader2, Plus, Trash2,
  Edit3, Package, Hammer, Wrench, Truck, MoreHorizontal,
  User, Coins
} from 'lucide-react';

const TYPE_ICONS = {
  material:  Package,
  labour:    Hammer,
  equipment: Wrench,
  transport: Truck,
  other:     MoreHorizontal
};

const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
};

function calcAmount(entryType, qty, unitPrice, flatAmount) {
  if ((entryType === 'material' || entryType === 'labour') && qty && unitPrice) {
    return Math.round(parseFloat(qty) * parseInt(unitPrice, 10));
  }
  return parseInt(flatAmount, 10) || 0;
}

const EMPTY_ENTRY = {
  entry_type: 'material',
  work_description: '',
  quantity: '',
  unit: 'db',
  unit_price: '',
  flat_amount: '',
  notes: '',
  user_id: ''
};

export default function NewQuotePage() {
  const router = useRouter();
  const { clients, users, createQuote, createQuoteEntry, createClient, currentUser } = useApp();

  // Header fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [taxPercent, setTaxPercent] = useState('27');
  const [sharedWith, setSharedWith] = useState([]);

  // Positions
  const [positions, setPositions] = useState([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [entryError, setEntryError] = useState('');

  // Inline client creation
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  if (!currentUser) return null;

  const memberUsers = users;

  // ---- Entry modal helpers ----
  const openAddModal = () => {
    setEntryForm({ ...EMPTY_ENTRY, user_id: currentUser.id });
    setEditingIdx(null);
    setEntryError('');
    setShowEntryModal(true);
  };

  const openEditModal = (idx) => {
    const p = positions[idx];
    setEntryForm({
      entry_type: p.entry_type,
      work_description: p.work_description,
      quantity: p.quantity != null ? String(p.quantity) : '',
      unit: p.unit || 'db',
      unit_price: p.unit_price != null ? String(p.unit_price) : '',
      flat_amount: p.unit_price == null ? String(p.amount_huf) : '',
      notes: p.notes || '',
      user_id: p.user_id || currentUser.id
    });
    setEditingIdx(idx);
    setEntryError('');
    setShowEntryModal(true);
  };

  const previewAmount = calcAmount(
    entryForm.entry_type,
    entryForm.quantity,
    entryForm.unit_price,
    entryForm.flat_amount
  );

  const handleSaveEntry = () => {
    setEntryError('');
    if (!entryForm.work_description.trim()) {
      setEntryError('A megnevezés megadása kötelező!');
      return;
    }
    if (previewAmount <= 0) {
      setEntryError('Az összeg nem lehet nulla!');
      return;
    }

    const useQuantity = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    const saved = {
      entry_type: entryForm.entry_type,
      work_description: entryForm.work_description.trim(),
      quantity: useQuantity && entryForm.quantity ? parseFloat(entryForm.quantity) : null,
      unit: useQuantity && entryForm.unit ? entryForm.unit : null,
      unit_price: useQuantity && entryForm.unit_price ? parseInt(entryForm.unit_price, 10) : null,
      amount_huf: previewAmount,
      notes: entryForm.notes.trim(),
      user_id: entryForm.user_id || currentUser.id
    };

    if (editingIdx !== null) {
      const updated = [...positions];
      updated[editingIdx] = saved;
      setPositions(updated);
    } else {
      setPositions(prev => [...prev, saved]);
    }
    setShowEntryModal(false);
  };

  const removePosition = (idx) => {
    setPositions(prev => prev.filter((_, i) => i !== idx));
  };

  // ---- Inline client creation ----
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setIsCreatingClient(true);
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        address: newClientAddress.trim()
      });
      setClientId(newClient.id);
      setShowNewClientModal(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setIsCreatingClient(false);
    }
  };

  // ---- Final submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Az ajánlat neve kötelező!'); return; }

    setIsSubmitting(true);
    try {
      const quote = await createQuote({
        title: title.trim(),
        location: location.trim(),
        workType: workType.trim(),
        description: description.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        clientId: clientId || null,
        sharedWith,
        taxPercent: Number(taxPercent) || 0,
      });

      for (const p of positions) {
        await createQuoteEntry({
          quoteId: quote.id,
          userId: p.user_id,
          workDescription: p.work_description,
          amountHuf: p.amount_huf,
          notes: p.notes,
          entryType: p.entry_type,
          quantity: p.quantity,
          unit: p.unit,
          unitPrice: p.unit_price
        });
      }

      router.push(`/ajanlatok/${quote.id}`);
    } catch (err) {
      setError(err.message || 'Hiba az ajánlat mentésekor');
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);
  const totalValue = positions.reduce((s, p) => s + p.amount_huf, 0);

  return (
    <div className="container" style={{ maxWidth: '720px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/ajanlatok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlatokhoz
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="page-title">Új ajánlat</h1>
        <p className="page-subtitle">Töltse ki az alapadatokat, majd adja hozzá a tételeket</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* HEADER CARD */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Alapadatok
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="q-title">Ajánlat neve *</label>
            <input id="q-title" type="text" className="form-control" required value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felújítás" />
          </div>

          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-location">Helyszín</label>
              <input id="q-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. 8600 Siófok, Fő utca 12." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-type">Munka típusa</label>
              <input id="q-type" type="text" className="form-control" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Tetőfelújítás" />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="q-desc">Leírás / Megjegyzés</label>
            <textarea id="q-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Részletes munkaleírás…" />
          </div>

          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-start">Tervezett kezdés</label>
              <input id="q-start" type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-end">Tervezett befejezés</label>
              <input id="q-end" type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label" htmlFor="q-tax">ÁFA kulcs</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {['0', '5', '18', '27'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTaxPercent(v)}
                  style={{
                    padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.1s',
                    background: taxPercent === v ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: taxPercent === v ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${taxPercent === v ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {v}%
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <input
                  id="q-tax"
                  type="number" min="0" max="100" step="0.5"
                  className="form-control text-mono"
                  style={{ width: '80px' }}
                  value={taxPercent}
                  onChange={e => setTaxPercent(e.target.value)}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* CLIENT CARD */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
            Megrendelő
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" htmlFor="q-client">Ügyfél</label>
              <select id="q-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">– Ügyfél nélkül –</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.discount_percent > 0 ? ` (${c.discount_percent}% kedv.)` : ''}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', marginBottom: '0' }}>
              <Plus size={14} /> Új ügyfél
            </button>
          </div>
          {selectedClient && (
            <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              <User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {selectedClient.name}
              {selectedClient.phone && ` · ${selectedClient.phone}`}
              {selectedClient.discount_percent > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--warning-text)' }}>{selectedClient.discount_percent}% kedvezmény</span>}
            </div>
          )}
        </div>

        {/* SHARED MEMBERS CARD */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
            Meghívott tagok
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            A meghívott tagok látják az ajánlatot és hozzáadhatják saját tételeiket.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {memberUsers.filter(u => u.id !== currentUser.id).map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: sharedWith.includes(u.id) ? 'var(--accent-light)' : '#fff', transition: 'all 0.12s ease' }}>
                <input
                  type="checkbox"
                  checked={sharedWith.includes(u.id)}
                  onChange={e => setSharedWith(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.display_name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* POSITIONS CARD */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Tételek ({positions.length})
            </div>
            <button type="button" onClick={openAddModal} className="btn btn-secondary btn-sm">
              <Plus size={14} /> Új tétel
            </button>
          </div>

          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Még nincsenek tételek. Kattintson az „Új tétel" gombra.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {positions.map((p, idx) => {
                  const Icon = TYPE_ICONS[p.entry_type] || MoreHorizontal;
                  const tc = TYPE_COLORS[p.entry_type] || TYPE_COLORS.other;
                  const contributor = users.find(u => u.id === p.user_id);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}>
                        <Icon size={16} color={tc.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.work_description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <span style={{ padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.7rem' }}>
                            {QUOTE_ENTRY_TYPES.find(t => t.id === p.entry_type)?.label}
                          </span>
                          {p.quantity != null && p.unit && (
                            <span>{p.quantity} {p.unit}{p.unit_price ? ` × ${formatHUF(p.unit_price)}` : ''}</span>
                          )}
                          {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={11} />{contributor.display_name}</span>}
                          {p.notes && <span style={{ fontStyle: 'italic' }}>{p.notes}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(p.amount_huf)}</span>
                        <button type="button" onClick={() => openEditModal(idx)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
                          <Edit3 size={13} />
                        </button>
                        <button type="button" onClick={() => removePosition(idx)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Összesen:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Coins size={16} color="var(--accent)" />{formatHUF(totalValue)}
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Link href="/ajanlatok" className="btn btn-secondary">Mégse</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Mentés...</> : <><Check size={16} />Ajánlat létrehozása</>}
          </button>
        </div>
      </form>

      {/* ===== ENTRY MODAL ===== */}
      <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} title={editingIdx !== null ? 'Tétel szerkesztése' : 'Új tétel'}>
        {entryError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{entryError}</span>
          </div>
        )}

        {/* Type selector */}
        <div className=\"entry-type-grid\">
          {QUOTE_ENTRY_TYPES.map(t => {
            const Icon = TYPE_ICONS[t.id];
            const tc = TYPE_COLORS[t.id];
            const active = entryForm.entry_type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`,
                  background: active ? tc.bg : '#fff',
                  cursor: 'pointer', transition: 'all 0.12s ease'
                }}
              >
                <Icon size={18} color={active ? tc.color : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="e-desc">Megnevezés *</label>
          <input
            id="e-desc" type="text" className="form-control" autoFocus
            placeholder={entryForm.entry_type === 'material' ? 'pl. Gipszkarton lap 12,5mm' : entryForm.entry_type === 'labour' ? 'pl. Gipszkarton szerelés' : 'pl. Állványzat bérlés'}
            value={entryForm.work_description}
            onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))}
          />
        </div>

        {/* Material / Labour: quantity × unit × unit_price */}
        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 2fr', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label" htmlFor="e-qty">{entryForm.entry_type === 'labour' ? 'Munkaórák' : 'Mennyiség'}</label>
              <input
                id="e-qty" type="number" min="0" step="0.01" className="form-control text-mono"
                placeholder="0"
                value={entryForm.quantity}
                onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="e-unit">Egység</label>
              {entryForm.entry_type === 'labour' ? (
                <div className="form-control" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>h</div>
              ) : (
                <select id="e-unit" className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>
                  {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="e-uprice">{entryForm.entry_type === 'labour' ? 'Órabér (Ft/h)' : 'Egységár (Ft)'}</label>
              <input
                id="e-uprice" type="number" min="0" className="form-control text-mono"
                placeholder="0"
                value={entryForm.unit_price}
                onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Equipment / Transport / Other: flat amount */}
        {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
          <div className="form-group">
            <label className="form-label" htmlFor="e-flat">Összeg (Ft) *</label>
            <input
              id="e-flat" type="number" min="1" className="form-control text-mono"
              placeholder="0"
              value={entryForm.flat_amount}
              onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))}
            />
          </div>
        )}

        {/* Live total preview */}
        {previewAmount > 0 && (
          <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Coins size={15} /> Tétel összege: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(previewAmount)}</span>
          </div>
        )}

        {/* Contributor */}
        <div className="form-group">
          <label className="form-label" htmlFor="e-user">Kivitelező</label>
          <select id="e-user" className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
            <option value={currentUser.id}>Saját magam ({currentUser.display_name})</option>
            {memberUsers.filter(u => u.id !== currentUser.id).map(u => (
              <option key={u.id} value={u.id}>{u.display_name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="e-notes">Megjegyzés (opcionális)</label>
          <input id="e-notes" type="text" className="form-control" placeholder="pl. Anyaggal együtt, 2. emelet" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEntryModal(false)}>Mégse</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry}>
            {editingIdx !== null ? 'Módosítás' : 'Tétel hozzáadása'}
          </button>
        </div>
      </Modal>

      {/* Inline new client modal */}
      <Modal isOpen={showNewClientModal} onClose={() => setShowNewClientModal(false)} title="Új ügyfél">
        {newClientError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{newClientError}</span>
          </div>
        )}
        <form onSubmit={handleCreateClient}>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-name">Név *</label>
            <input id="nc-name" type="text" className="form-control" required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Horváth Béla" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="nc-phone">Telefon</label>
              <input id="nc-phone" type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="nc-email">E-mail</label>
              <input id="nc-email" type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="email@…" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="nc-addr">Cím</label>
            <input id="nc-addr" type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Irányítószám, Város, utca" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewClientModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isCreatingClient}>
              {isCreatingClient ? 'Mentés...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </Modal>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
