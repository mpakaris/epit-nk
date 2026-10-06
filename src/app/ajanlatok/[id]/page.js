'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES, QUOTE_ENTRY_TYPES, QUANTITY_UNITS } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, MapPin, Calendar, Coins, Plus, Trash2, User,
  CheckCircle2, XCircle, Send, FolderKanban, AlertCircle,
  Edit3, Loader2, Package, Hammer, Wrench, Truck, MoreHorizontal
} from 'lucide-react';

const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
};
const STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',    color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent:     { bg: 'var(--warning-bg)',   color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)',   color: 'var(--success-text)',   border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' }
};

function calcAmount(entryType, qty, unitPrice, flatAmount) {
  if ((entryType === 'material' || entryType === 'labour') && qty && unitPrice) {
    return Math.round(parseFloat(qty) * parseInt(unitPrice, 10));
  }
  return parseInt(flatAmount, 10) || 0;
}

const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '', user_id: '' };

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    currentUser, isAdmin, quotes, quoteEntries, clients, users, projects,
    updateQuote, updateQuoteStatus, deleteQuote,
    createQuoteEntry, updateQuoteEntry, deleteQuoteEntry,
    convertQuoteToProject, shareQuoteWith, unshareQuoteWith
  } = useApp();

  const [showEditHeader, setShowEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [headerError, setHeaderError] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMembers, setConvertMembers] = useState([]);
  const [isConverting, setIsConverting] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const quote = quotes.find(q => q.id === id);
  if (!quote) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Az ajánlat nem található</h2>
        <Link href="/ajanlatok" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const client = clients.find(c => c.id === quote.client_id);
  const entries = quoteEntries.filter(e => e.quote_id === id);
  const netTotal  = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate   = Number(quote.tax_percent ?? 27);
  const taxAmount = Math.round(netTotal * taxRate / 100);
  const grossTotal = netTotal + taxAmount;
  const canModify = quote.created_by === currentUser?.id || isAdmin;
  const isLocked = quote.status === 'accepted' || quote.status === 'rejected';
  const sc = STATUS_COLORS[quote.status] || STATUS_COLORS.draft;
  const linkedProject = quote.project_id ? projects.find(p => p.id === quote.project_id) : null;
  const memberUsers = users;

  // ---- Header edit ----
  const openEditHeader = () => {
    setHeaderForm({
      title: quote.title,
      location: quote.location || '',
      work_type: quote.work_type || '',
      description: quote.description || '',
      start_date: quote.start_date || '',
      end_date: quote.end_date || '',
      client_id: quote.client_id || '',
      tax_percent: String(quote.tax_percent ?? 27),
    });
    setHeaderError('');
    setShowEditHeader(true);
  };

  const handleSaveHeader = async (e) => {
    e.preventDefault();
    if (!headerForm.title?.trim()) { setHeaderError('A cím nem lehet üres!'); return; }
    setIsSavingHeader(true);
    try {
      await updateQuote(id, {
        title: headerForm.title.trim(),
        location: headerForm.location.trim(),
        work_type: headerForm.work_type.trim(),
        description: headerForm.description.trim(),
        start_date: headerForm.start_date || null,
        end_date: headerForm.end_date || null,
        client_id: headerForm.client_id || null,
        tax_percent: Number(headerForm.tax_percent) || 0,
      });
      setShowEditHeader(false);
    } catch (err) {
      setHeaderError(err.message || 'Hiba a mentésekor');
    } finally {
      setIsSavingHeader(false);
    }
  };

  // ---- Entry modal ----
  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);

  const openAddEntry = () => {
    setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: currentUser.id });
    setEditingEntryId(null);
    setEntryError('');
    setShowEntryModal(true);
  };

  const openEditEntry = (entry) => {
    const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
    setEntryForm({
      entry_type: entry.entry_type || 'other',
      work_description: entry.work_description || '',
      quantity: entry.quantity != null ? String(entry.quantity) : '',
      unit: entry.unit || 'db',
      unit_price: entry.unit_price != null ? String(entry.unit_price) : '',
      flat_amount: !useQty ? String(entry.amount_huf) : '',
      notes: entry.notes || '',
      user_id: entry.user_id || currentUser.id
    });
    setEditingEntryId(entry.id);
    setEntryError('');
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    setEntryError('');
    if (!entryForm.work_description.trim()) { setEntryError('A megnevezés kötelező!'); return; }
    if (previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }

    const useQty = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    const fields = {
      entry_type: entryForm.entry_type,
      work_description: entryForm.work_description.trim(),
      quantity: useQty && entryForm.quantity ? parseFloat(entryForm.quantity) : null,
      unit: useQty && entryForm.unit ? (entryForm.entry_type === 'labour' ? 'h' : entryForm.unit) : null,
      unit_price: useQty && entryForm.unit_price ? parseInt(entryForm.unit_price, 10) : null,
      amount_huf: previewAmount,
      notes: entryForm.notes.trim(),
      user_id: entryForm.user_id || currentUser.id
    };

    setIsSavingEntry(true);
    try {
      if (editingEntryId) {
        await updateQuoteEntry(editingEntryId, fields);
      } else {
        await createQuoteEntry({ quoteId: id, ...fields, workDescription: fields.work_description, amountHuf: fields.amount_huf, entryType: fields.entry_type, unitPrice: fields.unit_price, userId: fields.user_id });
      }
      setShowEntryModal(false);
    } catch (err) {
      setEntryError(err.message || 'Hiba a mentésekor');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = (entryId) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a tételt?',
      onConfirm: async () => {
        try { await deleteQuoteEntry(entryId); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  // ---- Status actions ----
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') {
      setConvertMembers(memberUsers.map(u => u.id));
      setShowConvertModal(true);
      return;
    }
    try { await updateQuoteStatus(id, newStatus); }
    catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const proj = await convertQuoteToProject(id, convertMembers);
      setShowConvertModal(false);
      router.push(`/projektek/${proj.id}`);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteQuote = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${quote.title}" ajánlatot?`,
      onConfirm: async () => {
        try { await deleteQuote(id); router.push('/ajanlatok'); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/ajanlatok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlatokhoz
        </Link>
      </div>

      {/* Header row */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{quote.title}</h1>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {QUOTE_STATUSES.find(s => s.id === quote.status)?.label}
              </span>
            </div>
            {quote.description && <p className="page-subtitle">{quote.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {canModify && !isLocked && (
              <button type="button" onClick={openEditHeader} className="btn btn-secondary btn-sm">
                <Edit3 size={14} /> Szerkesztés
              </button>
            )}
            {canModify && (
              <button type="button" onClick={handleDeleteQuote} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Törlés
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="var(--accent)" />
              <Link href={`/admin/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{client.name}</Link>
              {client.discount_percent > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--warning-text)', fontWeight: 700 }}>({client.discount_percent}% kedv.)</span>}
            </div>
          )}
          {quote.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} color="var(--accent)" />{quote.location}</span>}
          {quote.work_type && <span style={{ fontWeight: 600 }}>{quote.work_type}</span>}
          {(quote.start_date || quote.end_date) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} color="var(--accent)" />
              {quote.start_date ? formatDate(quote.start_date) : '?'} – {quote.end_date ? formatDate(quote.end_date) : '?'}
            </span>
          )}
          <span style={{ fontWeight: 600, fontSize: '0.8rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            ÁFA: {taxRate}%
          </span>
        </div>

        {linkedProject && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderKanban size={15} color="var(--success)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--success-text)' }}>
              Projekt: <Link href={`/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)' }}>{linkedProject.name}</Link>
            </span>
          </div>
        )}
      </div>

      {/* Shared members */}
      {canModify && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Meghívott tagok
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {memberUsers.map(u => {
              const isShared = (quote.shared_with || []).includes(u.id);
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', background: isShared ? 'var(--accent-light)' : 'var(--bg-subtle)', border: `1px solid ${isShared ? 'var(--accent-border)' : 'var(--border-subtle)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} color={isShared ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.875rem', fontWeight: isShared ? 700 : 500, color: isShared ? 'var(--accent)' : 'var(--text-secondary)' }}>{u.display_name}</span>
                  </div>
                  {isLocked ? (
                    isShared && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)' }}>Meghívott</span>
                  ) : isShared ? (
                    <button type="button" onClick={() => unshareQuoteWith(quote.id, u.id).catch(err => setAlertModal({ message: err.message }))} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                      Eltávolítás
                    </button>
                  ) : (
                    <button type="button" onClick={() => shareQuoteWith(quote.id, u.id).catch(err => setAlertModal({ message: err.message }))} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                      <Plus size={12} /> Meghívás
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status actions */}
      {canModify && !isLocked && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Státusz módosítása</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {quote.status === 'draft' && (
              <button type="button" onClick={() => handleStatusChange('sent')} className="btn btn-secondary btn-sm">
                <Send size={14} /> Megjelölés: Kiküldve
              </button>
            )}
            {(quote.status === 'draft' || quote.status === 'sent') && (
              <>
                <button type="button" onClick={() => handleStatusChange('accepted')} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
                  <CheckCircle2 size={14} /> Elfogadva → Projektté
                </button>
                <button type="button" onClick={() => handleStatusChange('rejected')} className="btn btn-danger btn-sm">
                  <XCircle size={14} /> Elutasítva
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Positions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Tételek ({entries.length})</h2>
        {!isLocked && (
          <button type="button" onClick={openAddEntry} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Új tétel
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="card mb-6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Nincs tétel hozzáadva.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {entries.map(entry => {
            const Icon = TYPE_ICONS[entry.entry_type] || MoreHorizontal;
            const tc = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
            const contributor = users.find(u => u.id === entry.user_id);
            const canEdit = entry.user_id === currentUser?.id || isAdmin;
            const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';

            return (
              <div key={entry.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}>
                  <Icon size={16} color={tc.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{entry.work_description}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${tc.border}` }}>
                      {QUOTE_ENTRY_TYPES.find(t => t.id === entry.entry_type)?.label}
                    </span>
                    {useQty && entry.quantity != null && (
                      <span>{entry.quantity} {entry.unit || 'h'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>
                    )}
                    {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={11} />{contributor.display_name}</span>}
                    {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem' }}>{formatHUF(entry.amount_huf)}</span>
                  {canEdit && !isLocked && (
                    <>
                      <button type="button" onClick={() => openEditEntry(entry)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
                        <Edit3 size={13} />
                      </button>
                      <button type="button" onClick={() => handleDeleteEntry(entry.id)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ padding: '0.9rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: taxRate > 0 ? '0.45rem' : 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nettó összeg:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>{formatHUF(netTotal)}</span>
            </div>
            {taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ÁFA ({taxRate}%):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{formatHUF(taxAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: taxRate > 0 ? '0.45rem' : 0, borderTop: taxRate > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Coins size={16} color="var(--accent)" /> Bruttó összesen:
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatHUF(grossTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT HEADER MODAL ===== */}
      <Modal isOpen={showEditHeader} onClose={() => setShowEditHeader(false)} title="Ajánlat szerkesztése">
        {headerError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{headerError}</span>
          </div>
        )}
        <form onSubmit={handleSaveHeader}>
          <div className="form-group">
            <label className="form-label">Ajánlat neve *</label>
            <input type="text" className="form-control" required value={headerForm.title || ''} onChange={e => setHeaderForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Helyszín</label>
              <input type="text" className="form-control" value={headerForm.location || ''} onChange={e => setHeaderForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Munka típusa</label>
              <input type="text" className="form-control" value={headerForm.work_type || ''} onChange={e => setHeaderForm(f => ({ ...f, work_type: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Leírás</label>
            <textarea rows={2} className="form-control" value={headerForm.description || ''} onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tervezett kezdés</label>
              <input type="date" className="form-control" value={headerForm.start_date || ''} onChange={e => setHeaderForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tervezett befejezés</label>
              <input type="date" className="form-control" value={headerForm.end_date || ''} onChange={e => setHeaderForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Ügyfél</label>
            <select className="form-control" value={headerForm.client_id || ''} onChange={e => setHeaderForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">ÁFA kulcs</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {['0', '5', '18', '27'].map(v => (
                <button key={v} type="button" onClick={() => setHeaderForm(f => ({ ...f, tax_percent: v }))}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    background: headerForm.tax_percent === v ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: headerForm.tax_percent === v ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${headerForm.tax_percent === v ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}>
                  {v}%
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <input type="number" min="0" max="100" step="0.5" className="form-control text-mono" style={{ width: '72px' }}
                  value={headerForm.tax_percent ?? '27'}
                  onChange={e => setHeaderForm(f => ({ ...f, tax_percent: e.target.value }))} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditHeader(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSavingHeader}>
              {isSavingHeader ? 'Mentés...' : 'Módosítás mentése'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== ENTRY MODAL (add/edit) ===== */}
      <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} title={editingEntryId ? 'Tétel szerkesztése' : 'Új tétel'}>
        {entryError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{entryError}</span>
          </div>
        )}

        {/* Type selector */}
        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(t => {
            const Icon = TYPE_ICONS[t.id];
            const tc = TYPE_COLORS[t.id];
            const active = entryForm.entry_type === t.id;
            return (
              <button key={t.id} type="button"
                onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`, background: active ? tc.bg : '#fff', cursor: 'pointer', transition: 'all 0.12s ease' }}
              >
                <Icon size={18} color={active ? tc.color : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ed-desc">Megnevezés *</label>
          <input id="ed-desc" type="text" className="form-control" autoFocus
            placeholder={entryForm.entry_type === 'material' ? 'pl. Gipszkarton lap 12,5mm' : entryForm.entry_type === 'labour' ? 'pl. Gipszkarton szerelés' : 'pl. Állványzat bérlés'}
            value={entryForm.work_description}
            onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))}
          />
        </div>

        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div className="qty-grid">
            <div>
              <label className="form-label">{entryForm.entry_type === 'labour' ? 'Munkaórák' : 'Mennyiség'}</label>
              <input type="number" min="0" step="0.01" className="form-control text-mono" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Egység</label>
              {entryForm.entry_type === 'labour'
                ? <div className="form-control" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>h</div>
                : <select className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>
                    {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
              }
            </div>
            <div>
              <label className="form-label">{entryForm.entry_type === 'labour' ? 'Órabér (Ft/h)' : 'Egységár (Ft)'}</label>
              <input type="number" min="0" className="form-control text-mono" placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
          </div>
        )}

        {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
          <div className="form-group">
            <label className="form-label">Összeg (Ft) *</label>
            <input type="number" min="1" className="form-control text-mono" placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} />
          </div>
        )}

        {previewAmount > 0 && (
          <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Coins size={15} /> Tétel összege: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(previewAmount)}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Kivitelező</label>
          <select className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
            <option value={currentUser.id}>Saját magam ({currentUser.display_name})</option>
            {memberUsers.filter(u => u.id !== currentUser.id).map(u => (
              <option key={u.id} value={u.id}>{u.display_name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés (opcionális)</label>
          <input type="text" className="form-control" placeholder="pl. Anyaggal együtt, 2. emelet" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEntryModal(false)}>Mégse</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry} disabled={isSavingEntry}>
            {isSavingEntry ? 'Mentés...' : editingEntryId ? 'Módosítás' : 'Tétel hozzáadása'}
          </button>
        </div>
      </Modal>

      {/* ===== CONVERT TO PROJECT MODAL ===== */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Projektté alakítás">
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Válassza ki a projekt tagjait. A cím és dátumok az ajánlatból kerülnek át.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {memberUsers.map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: convertMembers.includes(u.id) ? 'var(--accent-light)' : '#fff' }}>
              <input type="checkbox" checked={convertMembers.includes(u.id)} onChange={e => setConvertMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.display_name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConvertModal(false)}>Mégse</button>
          <button type="button" onClick={handleConvert} disabled={isConverting || convertMembers.length === 0} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
            {isConverting ? <><Loader2 size={14} className="animate-spin" />Átalakítás...</> : <><FolderKanban size={14} />Projekt létrehozása</>}
          </button>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Törlés megerősítése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
