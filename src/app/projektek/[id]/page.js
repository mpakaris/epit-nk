'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import StatCard from '@/components/StatCard';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft,
  Plus,
  Receipt,
  Coins,
  Scale,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Camera,
  ArrowRight
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentUser, projects, invoices, users, isAdmin, deleteInvoice } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          A keresett projekt nem található
        </h2>
        <Link href="/projektek" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Vissza a projektekhez
        </Link>
      </div>
    );
  }

  const isMember = (project.members || []).includes(currentUser?.id) || isAdmin;
  if (!isMember) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.4rem' }}>
          Nincs hozzáférési jogosultsága
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          Ön nincs hozzárendelve ehhez a projekthez.
        </p>
        <Link href="/projektek" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Vissza a saját projektekhez
        </Link>
      </div>
    );
  }

  const projectMemberUsers = users.filter(u => (project.members || []).includes(u.id));
  const fin = calculateProjectFinancials(project, invoices, projectMemberUsers, currentUser?.id);

  // Filter project invoices
  const filteredInvoices = fin.projectInvoices.filter(inv => {
    if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
    if (uploaderFilter !== 'ALL' && inv.uploaded_by !== uploaderFilter) return false;
    return true;
  });

  const handleDeleteInvoice = (invId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a számlát?',
      onConfirm: async () => {
        try {
          await deleteInvoice(invId);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  return (
    <div className="container">
      {/* Top Navigation */}
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link 
          href={isAdmin ? '/admin/projektek' : '/projektek'} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary" style={{ gap: '0.45rem' }}>
            <Camera size={18} />
            <span>Új számla fotózása / feltöltése</span>
          </Link>
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div className="stat-grid">
        <StatCard
          label="Összes kiadás"
          value={formatHUF(fin.totalCost)}
          sub={`${fin.projectInvoices.length} db számla`}
          icon={Coins}
        />
        <StatCard
          label="Egyenlő rész / fő"
          value={formatHUF(fin.equalShare)}
          sub={`${fin.memberCount} résztvevő`}
          icon={Scale}
        />
        <StatCard
          label="Általad kifizetve"
          value={formatHUF(fin.ownPaid)}
          sub="Az Ön számlái"
          icon={Receipt}
        />
        <div className={`stat-card ${fin.balance > 0 ? 'success' : fin.balance < 0 ? 'danger' : ''}`}>
          <div className="stat-label">Személyes egyenleged</div>
          <div className="stat-value" style={{ 
            color: fin.balance > 0 ? 'var(--success-text)' : fin.balance < 0 ? 'var(--danger-text)' : 'var(--text-primary)' 
          }}>
            {fin.balance > 0 ? `+${formatHUF(fin.balance)}` : formatHUF(fin.balance)}
          </div>
          <div className="stat-sub">
            {fin.balance > 0 
              ? 'Túlfizetés: a többiek tartoznak neked' 
              : fin.balance < 0 
              ? 'Tartozás: kiegyenlítendő rész' 
              : 'Költségek kiegyenlítve'}
          </div>
        </div>
      </div>

      {/* Member Share Breakdown */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Users size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
            Résztvevők elszámolása és egyenlege
          </h3>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Résztvevő</th>
                <th>Számlák</th>
                <th>Kifizetve</th>
                <th>Rá eső rész</th>
                <th>Egyenleg</th>
              </tr>
            </thead>
            <tbody>
              {fin.memberBreakdown.map(member => (
                <tr key={member.userId}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {member.displayName}
                    </span>
                    {member.userId === currentUser?.id && (
                      <span style={{ marginLeft: '0.35rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                        Ön
                      </span>
                    )}
                  </td>
                  <td>{member.invoicesCount} db</td>
                  <td className="text-mono" style={{ fontWeight: 700 }}>
                    {formatHUF(member.paid)}
                  </td>
                  <td className="text-mono" style={{ color: 'var(--text-secondary)' }}>
                    {formatHUF(fin.equalShare)}
                  </td>
                  <td>
                    {member.balance > 0 ? (
                      <span className="balance-pill positive" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}>
                        <TrendingUp size={11} /> +{formatHUF(member.balance)}
                      </span>
                    ) : member.balance < 0 ? (
                      <span className="balance-pill negative" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}>
                        <TrendingDown size={11} /> {formatHUF(member.balance)}
                      </span>
                    ) : (
                      <span className="balance-pill neutral" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}>
                        <CheckCircle2 size={11} /> 0 Ft
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Instructions */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <ArrowRight size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ki kinek tartozik?</h3>
        </div>

        {(fin.settlements ?? []).length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} />
            <span>Minden költség egyenlően el van osztva, nincs egyenlítendő tartozás.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(fin.settlements ?? []).map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  flexWrap: 'wrap'
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--danger-text)', minWidth: '6rem' }}>{s.from}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span>fizet</span>
                  <ArrowRight size={14} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--success-text)', minWidth: '6rem' }}>{s.to}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {formatHUF(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices Header & Filter controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Projekt Számlák ({filteredInvoices.length})
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Feltöltött bizonylatok és kiadások
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}
          >
            <option value="ALL">Minden kategória</option>
            {INVOICE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}
          >
            <option value="ALL">Minden feltöltő</option>
            {projectMemberUsers.map(u => (
              <option key={u.id} value={u.id}>{u.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Nincs megjeleníthető számla
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            Ehhez a szűréshez még nem rögzítettek számlát.
          </p>
          <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
            <Plus size={15} /> Számla hozzáadása
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
          {filteredInvoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              isAdmin={isAdmin}
              onDelete={isAdmin ? handleDeleteInvoice : null}
            />
          ))}
        </div>
      )}
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
