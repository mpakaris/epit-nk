'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Receipt, ShieldCheck, Coins, AlertCircle,
  CheckCircle2, Plus, Edit3, UserCheck, BookUser, CalendarDays, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, Users, FileText, BarChart3
} from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function EditProjectModal({ isOpen, onClose, project, clients, users, updateProject, updateProjectMembers, createClient, onSuccess }) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [memberIds, setMemberIds] = React.useState([]);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Inline new client form
  const [showNewClientForm, setShowNewClientForm] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState('');
  const [newClientPhone, setNewClientPhone] = React.useState('');
  const [newClientEmail, setNewClientEmail] = React.useState('');
  const [newClientAddress, setNewClientAddress] = React.useState('');
  const [newClientError, setNewClientError] = React.useState('');
  const [creatingClient, setCreatingClient] = React.useState(false);

  React.useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setMemberIds(project.members || []);
      setError('');
      setShowNewClientForm(false);
    }
  }, [project?.id, isOpen]);

  if (!isOpen || !project) return null;

  const toggleMember = (uid) =>
    setMemberIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        address: newClientAddress.trim(),
        entityId: project.entity_id,
      });
      setClientId(newClient.id);
      setShowNewClientForm(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: desc.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        client_id: clientId || null,
      });
      await updateProjectMembers(project.id, memberIds);
      onSuccess('Projekt frissítve.');
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Szerkesztés: ${project.name}`}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Projekt neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <textarea rows={2} className="form-control" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kezdés</label>
            <input type="date" className="form-control" min={today()} value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Befejezés</label>
            <input type="date" className="form-control" min={startDate ? nextDay(startDate) : today()} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Client */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Megrendelő</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setShowNewClientForm(v => !v)}
            >
              {showNewClientForm ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showNewClientForm ? 'Bezár' : 'Új ügyfél'}
            </button>
          </div>
          {selectedClient && !showNewClientForm && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
            </div>
          )}
        </div>

        {showNewClientForm && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
            {newClientError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                {newClientError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Név *</label>
              <input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Horváth Béla" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Telefon</label>
                <input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">E-mail</label>
                <input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="email@…" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}>
              <label className="form-label">Cím</label>
              <input type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Irányítószám, Város, utca" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClientForm(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>
                {creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <UserCheck size={14} /> Résztvevők
          </label>
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.3rem' }}>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                <span style={{ fontWeight: 600 }}>{u.display_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Mentés...' : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminProjectInvoicesPage() {
  const { id } = useParams();
  const {
    isAdmin,
    projects,
    invoices,
    users,
    clients,
    updateInvoice,
    deleteInvoice,
    updateProject,
    updateProjectMembers,
    createClient,
  } = useApp();

  const project = projects.find(p => p.id === id);

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza</Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>A projekt nem található</h2>
        <Link href="/admin/projektek" className="btn btn-secondary mt-4">
          <ArrowLeft size={16} /> Vissza a projektekhez
        </Link>
      </div>
    );
  }

  const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
  const totalCost = projectInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
  const memberUsers = users.filter(u => (project.members || []).includes(u.id));
  const client = clients.find(c => c.id === project.client_id);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  const handleOpenEdit = (invoice) => {
    setEditingInvoice(invoice);
    setEditValue(invoice.value_huf.toString());
    setEditCategory(invoice.category);
    setEditDesc(invoice.description || '');
    setError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setError('');
    setIsSubmitting(true);
    try {
      await updateInvoice(editingInvoice.id, {
        value_huf: Number(editValue),
        category: editCategory,
        description: editDesc
      });
      setSuccessMsg('Számla sikeresen frissítve!');
      setEditingInvoice(null);
    } catch (err) {
      setError(err.message || 'Hiba a számla módosításakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (invoiceId) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a számlát?',
      onConfirm: async () => {
        try {
          await deleteInvoice(invoiceId);
          setSuccessMsg('Számla sikeresen törölve.');
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  const sectionLabel = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
      {icon}{text}
    </div>
  );

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/admin/projektek" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1.25rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Adminisztrátori nézet
            </div>
            <h1 className="page-title">{project.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setEditOpen(true)} className="btn btn-secondary btn-sm">
              <Edit3 size={14} /> Szerkesztés
            </button>
            <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Számla feltöltése
            </Link>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Top info grid: Client + Members + Data side-by-side on wider screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>

        {/* Client */}
        <div className="card">
          {sectionLabel(<BookUser size={13} />, 'Megrendelő')}
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.name}</div>
              {client.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Phone size={13} />{client.phone}
                </div>
              )}
              {client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Mail size={13} />{client.email}
                </div>
              )}
              {client.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} />{client.address}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs megrendelő hozzárendelve</div>
          )}
        </div>

        {/* Members */}
        <div className="card">
          {sectionLabel(<Users size={13} />, 'Résztvevők')}
          {memberUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {memberUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                    {u.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.display_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincsenek hozzárendelt tagok</div>
          )}
        </div>

        {/* Data */}
        <div className="card">
          {sectionLabel(<CalendarDays size={13} />, 'Adatok')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kezdés</span>
              <span style={{ fontWeight: 700, color: project.start_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {fmt(project.start_date) || '–'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Befejezés</span>
              <span style={{ fontWeight: 700, color: project.end_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {fmt(project.end_date) || '–'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Számlák</span>
              <span style={{ fontWeight: 700 }}>{projectInvoices.length} db</span>
            </div>
          </div>
        </div>

      </div>

      {/* Description */}
      <div className="card" style={{ marginBottom: '0.85rem' }}>
        {sectionLabel(<FileText size={13} />, 'Leírás')}
        {project.description
          ? <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{project.description}</p>
          : <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Nincs megadott projekt leírás.</p>
        }
      </div>

      {/* Overview */}
      <div className="card" style={{ marginBottom: '0.85rem', background: 'var(--bg-subtle)' }}>
        {sectionLabel(<BarChart3 size={13} />, 'Pénzügyi összesítő')}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--accent)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Összes kiadás</div>
            <div className="text-mono" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatHUF(totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div style={{ marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {sectionLabel(<Receipt size={13} />, `Számlák (${projectInvoices.length})`)}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Adminisztrátorként szerkesztheti vagy törölheti a számlákat.</p>
        </div>
      </div>

      {projectInvoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincsenek még számlák rögzítve</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>A feltöltött számlák itt fognak megjelenni.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
          {projectInvoices.map(inv => (
            <InvoiceCard key={inv.id} invoice={inv} isAdmin={true} onEdit={handleOpenEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Edit Invoice Modal */}
      <Modal isOpen={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} title="Számla szerkesztése (Admin)">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-amount">Összeg (HUF) *</label>
            <input id="edit-amount" type="number" required min="1" step="1" className="form-control text-mono" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat">Kategória *</label>
            <select id="edit-cat" className="form-control" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
              {INVOICE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label} – {c.desc}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-desc">Leírás / Megjegyzés</label>
            <textarea id="edit-desc" rows={3} className="form-control" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingInvoice(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Mentés...' : 'Mentés'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Számla törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <EditProjectModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        clients={clients}
        users={users}
        updateProject={updateProject}
        updateProjectMembers={updateProjectMembers}
        createClient={createClient}
        onSuccess={msg => setSuccessMsg(msg)}
      />
    </div>
  );
}
