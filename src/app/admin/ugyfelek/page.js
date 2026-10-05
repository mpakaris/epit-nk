'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Percent,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';

export default function AdminClientsPage() {
  const { isAdmin, clients, quotes, projects, createClient, updateClient, deleteClient } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDiscount, setFormDiscount] = useState('0');

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza</Link>
      </div>
    );
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const getClientStats = (clientId) => {
    const clientQuotes = quotes.filter(q => q.client_id === clientId);
    const clientProjectIds = clientQuotes.filter(q => q.project_id).map(q => q.project_id);
    return {
      quotesCount: clientQuotes.length,
      projectsCount: clientProjectIds.length
    };
  };

  const openCreateModal = () => {
    setFormName(''); setFormAddress(''); setFormPhone('');
    setFormEmail(''); setFormNotes(''); setFormDiscount('0');
    setFormError('');
    setEditingClient(null);
    setShowCreateModal(true);
  };

  const openEditModal = (client) => {
    setFormName(client.name);
    setFormAddress(client.address || '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormNotes(client.notes || '');
    setFormDiscount((client.discount_percent || 0).toString());
    setFormError('');
    setEditingClient(client);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('A név megadása kötelező!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formName.trim(),
          address: formAddress.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          notes: formNotes.trim(),
          discount_percent: parseFloat(formDiscount) || 0
        });
        setSuccessMsg('Ügyfél sikeresen módosítva.');
      } else {
        await createClient({
          name: formName.trim(),
          address: formAddress.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          notes: formNotes.trim(),
          discountPercent: parseFloat(formDiscount) || 0
        });
        setSuccessMsg('Ügyfél sikeresen létrehozva.');
      }
      setShowCreateModal(false);
    } catch (err) {
      setFormError(err.message || 'Hiba az ügyfél mentésekor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (client) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${client.name}" ügyfelet? Ez nem vonható vissza.`,
      onConfirm: async () => {
        try {
          await deleteClient(client.id);
          setSuccessMsg('Ügyfél törölve.');
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Adminisztráció
            </div>
            <h1 className="page-title">Ügyfelek</h1>
            <p className="page-subtitle">Megrendelők adatbázisa és előzmények</p>
          </div>
          <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm">
            <Plus size={15} /> Új ügyfél
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Keresés név, email, telefon alapján..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {filteredClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {searchQuery ? 'Nincs találat' : 'Nincsenek ügyfelek'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {searchQuery ? 'Próbáljon más keresési feltételt.' : 'Hozza létre az első ügyfelet.'}
          </p>
          {!searchQuery && (
            <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új ügyfél
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredClients.map(client => {
            const stats = getClientStats(client.id);
            return (
              <div key={client.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{client.name}</h3>
                      {client.discount_percent > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                          <Percent size={10} /> {client.discount_percent}% kedvezmény
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {client.phone}</span>}
                      {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {client.email}</span>}
                      {client.address && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {client.address}</span>}
                    </div>

                    {client.notes && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{client.notes}</p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      <span>{stats.quotesCount} ajánlat</span>
                      <span>{stats.projectsCount} projekt</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <Link href={`/admin/ugyfelek/${client.id}`} className="btn btn-secondary btn-sm" title="Részletek">
                      <ArrowUpRight size={14} />
                    </Link>
                    <button type="button" onClick={() => openEditModal(client)} className="btn btn-secondary btn-sm" title="Szerkesztés">
                      <Edit3 size={13} />
                    </button>
                    <button type="button" onClick={() => handleDelete(client)} className="btn btn-danger btn-sm" title="Törlés">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingClient ? 'Ügyfél szerkesztése' : 'Új ügyfél létrehozása'}
      >
        {formError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="c-name">Név *</label>
            <input id="c-name" type="text" className="form-control" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Pl. Horváth Béla vagy Fekete Kft." />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-address">Cím</label>
            <input id="c-address" type="text" className="form-control" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="8600 Siófok, Fő utca 12." />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-phone">Telefon</label>
              <input id="c-phone" type="tel" className="form-control" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+36 70 123 4567" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-email">E-mail</label>
              <input id="c-email" type="email" className="form-control" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="c-discount">Hűségkedvezmény (%)</label>
            <input id="c-discount" type="number" min="0" max="100" step="0.5" className="form-control" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-notes">Megjegyzés</label>
            <textarea id="c-notes" rows={2} className="form-control" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Egyéb tudnivalók az ügyfélről..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Mentés...' : (editingClient ? 'Módosítás' : 'Létrehozás')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Ügyfél törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
