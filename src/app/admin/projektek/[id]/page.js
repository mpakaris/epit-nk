'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { 
  ArrowLeft, 
  Receipt, 
  ShieldCheck, 
  Coins, 
  AlertCircle,
  CheckCircle2,
  Plus
} from 'lucide-react';

export default function AdminProjectInvoicesPage() {
  const { id } = useParams();
  const { 
    isAdmin, 
    projects, 
    invoices, 
    users, 
    updateInvoice, 
    deleteInvoice 
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

  return (
    <div className="container">
      {/* Top back link */}
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link 
          href="/admin/projektek" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Adminisztrátori Számlakezelés
            </div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">
              {project.description || 'Nincs megadott projekt leírás.'}
            </p>
          </div>

          <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
            <Plus size={15} /> Számla feltöltése
          </Link>
        </div>
      </div>

      {successMsg && (
        <div 
          style={{ 
            background: 'var(--success-bg)', 
            border: '1px solid var(--success-border)', 
            color: 'var(--success-text)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary card */}
      <div 
        className="card mb-6" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--accent)', border: '1px solid var(--border-subtle)' }}>
            <Coins size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Projekt összes kiadása
            </div>
            <div className="text-mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {formatHUF(totalCost)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.75rem' }}>
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Számlák
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {projectInvoices.length} db
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Résztvevők
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {memberUsers.length} fő
            </div>
          </div>
        </div>
      </div>

      {/* Invoices list */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Projekt Számlák ({projectInvoices.length})
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
          Adminisztrátorként szerkesztheti vagy törölheti a számlákat.
        </p>
      </div>

      {projectInvoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Nincsenek még számlák rögzítve
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            A feltöltött számlák itt fognak megjelenni.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
          {projectInvoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              isAdmin={true}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={Boolean(editingInvoice)}
        onClose={() => setEditingInvoice(null)}
        title="Számla szerkesztése (Admin)"
      >
        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger-text)', 
              padding: '0.65rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem'
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-amount">Összeg (HUF) *</label>
            <input
              id="edit-amount"
              type="number"
              required
              min="1"
              step="1"
              className="form-control text-mono"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat">Kategória *</label>
            <select
              id="edit-cat"
              className="form-control"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            >
              {INVOICE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} – {c.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-desc">Leírás / Megjegyzés</label>
            <textarea
              id="edit-desc"
              rows={3}
              className="form-control"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditingInvoice(null)}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title="Számla törlése"
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
      />
    </div>
  );
}
