'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { useSearchParams } from 'next/navigation';

// Tiny helper that watches ?create=1 — must live inside <Suspense>
// Uses a ref for the callback so it never appears as a dep (avoids infinite loop).
function CreateParamWatcher({ onTrigger }) {
  const searchParams = useSearchParams();
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;
  useEffect(() => {
    if (searchParams.get('create') === '1') onTriggerRef.current();
  }, [searchParams]);
  return null;
}
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
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import ClientDetailModal from '@/components/ClientDetailModal';

export default function AdminClientsPage() {
  const { currentUser, loading, dataReady, activeCollectiveId, clients, quotes, projects, collectives, createClient, updateClient, deleteClient } = useApp();

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

  const [selectedClientId, setSelectedClientId] = useState(null);

  if (loading || !dataReady) return <PageSpinner />;

  const ownedCollectives = collectives.filter(c => c.role === 'owner' || c.role === 'admin');

  const myClients     = clients.filter(c => !c._shared_via);
  const sharedClients = clients.filter(c => c._shared_via?.length > 0);

  const q = searchQuery.toLowerCase();
  const matchesSearch = (c) =>
    c.name.toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q);

  const filteredMine   = myClients.filter(matchesSearch);
  const filteredShared = sharedClients.filter(matchesSearch);

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

  const renderClientCard = (client, isOwn) => {
    const stats = getClientStats(client.id);
    const shareCount = client.client_collective_shares?.length || 0;
    return (
      <div
        key={client.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedClientId(client.id)}
        onKeyDown={e => e.key === 'Enter' && setSelectedClientId(client.id)}
        className="card card-interactive"
        style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{client.name}</h3>
              {isOwn && client.discount_percent > 0 && (
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
          {isOwn && (
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button type="button" onClick={e => { e.stopPropagation(); openEditModal(client); }} className="btn btn-secondary btn-sm" title="Szerkesztés">
                <Edit3 size={13} />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); handleDelete(client); }} className="btn btn-danger btn-sm" title="Törlés">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {isOwn && (
            <>
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
              {shareCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                  <Share2 size={11} /> {shareCount} kollektíva
                </span>
              )}
            </>
          )}
          {!isOwn && client._shared_via?.map(sv => (
            <span key={sv.collective_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
              <Share2 size={11} /> {sv.collective_name || 'Kollektíva'}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const hasResults = filteredMine.length > 0 || filteredShared.length > 0;

  return (
    <div className="container">
      <Suspense fallback={null}>
        <CreateParamWatcher onTrigger={openCreateModal} />
      </Suspense>
      <div className="page-header">
        <div className="page-header-row">
          <div>
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

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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

      {/* My clients */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Saját ügyfeleim ({filteredMine.length})
        </h2>
        {filteredMine.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <Users size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: searchQuery ? 0 : '1rem' }}>
              {searchQuery ? 'Nincs találat.' : 'Még nincs saját ügyfele. Hozza létre az elsőt.'}
            </p>
            {!searchQuery && (
              <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm">
                <Plus size={15} /> Új ügyfél
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.65rem' }}>
            {filteredMine.map(client => renderClientCard(client, true))}
          </div>
        )}
      </div>

      {/* Shared with me */}
      {(sharedClients.length > 0 || (searchQuery && filteredShared.length === 0 && sharedClients.length > 0)) && (
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            Velem megosztott ügyfelek ({filteredShared.length})
          </h2>
          {filteredShared.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Nincs találat.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.65rem' }}>
              {filteredShared.map(client => renderClientCard(client, false))}
            </div>
          )}
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

          {!editingClient && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${formGdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', marginTop: '0.5rem', marginBottom: '0.75rem', transition: 'border-color 0.15s' }}>
              <input type="checkbox" checked={formGdpr} onChange={e => setFormGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Megerősítem, hogy az ügyfél hozzájárult személyes adatainak CRM-rendszerünkben való tárolásához.{' '}
                <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
              </span>
            </label>
          )}

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

      {selectedClientId && (
        <ClientDetailModal
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
          onDeleted={() => { setSelectedClientId(null); setSuccessMsg('Ügyfél törölve.'); }}
        />
      )}
    </div>
  );
}
