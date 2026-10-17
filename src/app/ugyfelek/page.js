'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Percent,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderKanban,
  Loader2,
  Building2,
  Hash,
  ShieldCheck,
  Share2,
  Lock,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceBadge from '@/components/WorkspaceBadge';

export default function AdminClientsPage() {
  const { isAdmin, loading, dataReady, effectiveEntityId, activeCollectiveId, clients, quotes, projects, collectives, createClient, updateClient, deleteClient } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formTaxNumber, setFormTaxNumber] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDiscount, setFormDiscount] = useState('0');
  const [formGdpr, setFormGdpr] = useState(false);
  const [formShares, setFormShares] = useState([]);
  const [formSharesInitial, setFormSharesInitial] = useState([]);
  const [formSharesGdpr, setFormSharesGdpr] = useState(false);

  if (loading || !dataReady) return <PageSpinner />;

  // Collectives where the current user is owner or admin — eligible for sharing
  const ownedCollectives = collectives.filter(c => c.role === 'owner' || c.role === 'admin');

  const filteredClients = clients.filter(c => (
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  ));

  const getClientStats = (clientId) => {
    const clientQuotes = quotes.filter(q => q.client_id === clientId);
    const directIds  = projects.filter(p => p.client_id === clientId).map(p => p.id);
    const quoteIds   = clientQuotes.filter(q => q.project_id).map(q => q.project_id);
    const projectsCount = new Set([...directIds, ...quoteIds]).size;
    return { quotesCount: clientQuotes.length, projectsCount };
  };

  const openCreateModal = () => {
    setFormName(''); setFormCompanyName(''); setFormTaxNumber('');
    setFormAddress(''); setFormPhone(''); setFormEmail('');
    setFormNotes(''); setFormDiscount('0'); setFormGdpr(false);
    setFormShares(activeCollectiveId ? [activeCollectiveId] : []);
    setFormSharesInitial([]); setFormSharesGdpr(false);
    setFormError('');
    setEditingClient(null);
    setShowCreateModal(true);
  };

  const openEditModal = (client) => {
    const initialShares = client.client_collective_shares?.map(s => s.collective_id) || [];
    setFormName(client.name);
    setFormCompanyName(client.company_name || '');
    setFormTaxNumber(client.tax_number || '');
    setFormAddress(client.address || '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormNotes(client.notes || '');
    setFormDiscount((client.discount_percent || 0).toString());
    setFormShares(initialShares);
    setFormSharesInitial(initialShares);
    setFormSharesGdpr(false);
    setFormError('');
    setEditingClient(client);
    setShowCreateModal(true);
  };

  const toggleShare = (collectiveId) => {
    setFormShares(prev =>
      prev.includes(collectiveId) ? prev.filter(id => id !== collectiveId) : [...prev, collectiveId]
    );
    setFormSharesGdpr(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) { setFormError('A név megadása kötelező!'); return; }

    const hasNewShares = formShares.some(id => !formSharesInitial.includes(id));
    if (hasNewShares && !formSharesGdpr) {
      setFormError('Kérjük erősítse meg az ügyfél hozzájárulását az adatok megosztásához!');
      return;
    }

    setIsSubmitting(true);
    try {
      const sharedFields = {
        name:         formName.trim(),
        company_name: formCompanyName.trim() || null,
        tax_number:   formTaxNumber.trim()   || null,
        address:      formAddress.trim(),
        phone:        formPhone.trim(),
        email:        formEmail.trim(),
        notes:        formNotes.trim(),
      };
      if (editingClient) {
        await updateClient(editingClient.id, {
          ...sharedFields,
          discount_percent:   parseFloat(formDiscount) || 0,
          collectiveShares:   formShares,
          sharesGdprConfirmed: !hasNewShares || formSharesGdpr,
        });
        setSuccessMsg('Ügyfél sikeresen módosítva.');
      } else {
        await createClient({
          ...sharedFields,
          discountPercent:    parseFloat(formDiscount) || 0,
          companyName:        formCompanyName.trim() || null,
          taxNumber:          formTaxNumber.trim()   || null,
          gdprConsent:        formGdpr,
          collectiveShares:   formShares,
          sharesGdprConfirmed: formShares.length === 0 || formSharesGdpr,
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

  const hasNewShares = formShares.some(id => !formSharesInitial.includes(id));
  const submitDisabled = isSubmitting
    || (!editingClient && !formGdpr)
    || (hasNewShares && !formSharesGdpr);

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>Ügyfelek <WorkspaceBadge /></h1>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.65rem' }}>
          {filteredClients.map(client => {
            const stats = getClientStats(client.id);
            const shareCount = client.client_collective_shares?.length || 0;
            return (
              <Link key={client.id} href={`/ugyfelek/${client.id}`} className="card card-interactive" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                {/* Top: name + actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{client.name}</h3>
                      {client.discount_percent > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                          <Percent size={10} /> {client.discount_percent}%
                        </span>
                      )}
                    </div>
                    {(client.company_name || client.tax_number) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>
                        {client.company_name && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={12} /> {client.company_name}</span>}
                        {client.tax_number && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Hash size={12} /> {client.tax_number}</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {client.phone}</span>}
                      {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {client.email}</span>}
                      {client.address && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {client.address}</span>}
                    </div>
                    {client.notes && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{client.notes}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); openEditModal(client); }} className="btn btn-secondary btn-sm" title="Szerkesztés">
                      <Edit3 size={13} />
                    </button>
                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(client); }} className="btn btn-danger btn-sm" title="Törlés">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Bottom: stats pills */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <FileText size={11} /> {stats.quotesCount} ajánlat
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <FolderKanban size={11} /> {stats.projectsCount} projekt
                  </span>
                  {client.gdpr_consented_at && (
                    <span title={`GDPR: ${new Date(client.gdpr_consented_at).toLocaleDateString('hu-HU')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                      <ShieldCheck size={11} /> GDPR
                    </span>
                  )}
                  {!activeCollectiveId && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                      <Lock size={11} /> Privát
                    </span>
                  )}
                  {shareCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                      <Share2 size={11} /> {shareCount} kollektíva
                    </span>
                  )}
                </div>
              </Link>
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
            <label className="form-label" htmlFor="c-name">Kapcsolattartó neve *</label>
            <input id="c-name" type="text" className="form-control" required autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Pl. Horváth Béla" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-company">Cégnév</label>
              <input id="c-company" type="text" className="form-control" value={formCompanyName} onChange={(e) => setFormCompanyName(e.target.value)} placeholder="Pl. Fekete Kft." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-tax">Adószám</label>
              <input id="c-tax" type="text" className="form-control" value={formTaxNumber} onChange={(e) => setFormTaxNumber(e.target.value)} placeholder="12345678-1-01" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="c-address">Cím</label>
            <input id="c-address" type="text" className="form-control" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="8600 Siófok, Fő utca 12." />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-phone">Telefon</label>
              <input id="c-phone" type="tel" className="form-control" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+36 70 123 4567" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="c-email">E-mail *</label>
              <input id="c-email" type="email" className="form-control" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
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

          {/* Initial GDPR — create only */}
          {!editingClient && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${formGdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', marginTop: '0.5rem', marginBottom: '0.75rem', transition: 'border-color 0.15s' }}>
              <input type="checkbox" checked={formGdpr} onChange={e => setFormGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Megerősítem, hogy az ügyfél hozzájárult személyes adatainak CRM-rendszerünkben való tárolásához.{' '}
                <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
              </span>
            </label>
          )}

          {/* Collective sharing */}
          {ownedCollectives.length > 0 && (
            <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Share2 size={14} /> Megosztás Kollektívákkal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {ownedCollectives.map(col => (
                  <label key={col.collective_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={formShares.includes(col.collective_id)}
                      onChange={() => toggleShare(col.collective_id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }}
                    />
                    {col.name}
                  </label>
                ))}
              </div>

              {/* Sharing GDPR consent — required when new collectives are added */}
              {hasNewShares && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.65rem', borderRadius: 'var(--radius-md)', background: '#fff', border: `1px solid ${formSharesGdpr ? 'var(--success-border)' : 'var(--warning-border)'}`, cursor: 'pointer', marginTop: '0.65rem', transition: 'border-color 0.15s' }}>
                  <input type="checkbox" checked={formSharesGdpr} onChange={e => setFormSharesGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Megerősítem, hogy az ügyfél hozzájárult személyes adatainak megosztásához a Kollektíva vállalkozóival.{' '}
                    <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitDisabled}>
              {isSubmitting
                ? <><Loader2 size={13} className="animate-spin" />{editingClient ? 'Módosítás...' : 'Létrehozás...'}</>
                : editingClient ? 'Módosítás' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Ügyfél törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
