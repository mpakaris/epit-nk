'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
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
  ArrowRight,
  Hammer,
  Clock,
  Trash2,
  Wallet
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentUser, projects, invoices, labourEntries, users, isAdmin, deleteInvoice, deleteLabourEntry } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('invoices');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>A keresett projekt nem található</h2>
        <Link href="/projektek" className="btn btn-secondary btn-sm"><ArrowLeft size={16} /> Vissza a projektekhez</Link>
      </div>
    );
  }

  const isMember = (project.members || []).includes(currentUser?.id) || isAdmin;
  if (!isMember) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.4rem' }}>Nincs hozzáférési jogosultsága</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>Ön nincs hozzárendelve ehhez a projekthez.</p>
        <Link href="/projektek" className="btn btn-secondary btn-sm"><ArrowLeft size={16} /> Vissza a saját projektekhez</Link>
      </div>
    );
  }

  const projectMemberUsers = users.filter(u => (project.members || []).includes(u.id));
  const fin = calculateProjectFinancials(project, invoices, labourEntries, projectMemberUsers, currentUser?.id);

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

  const handleDeleteLabour = (entryId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a munkabejegyzést?',
      onConfirm: async () => {
        try {
          await deleteLabourEntry(entryId);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={isAdmin ? '/admin/projektek' : '/projektek'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary" style={{ gap: '0.45rem' }}>
            <Camera size={18} />
            <span>Bejegyzés hozzáadása</span>
          </Link>
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div className="stat-grid">
        <StatCard label="Összes kiadás" value={formatHUF(fin.totalCost)} sub={`${fin.projectInvoices.length} db számla`} icon={Coins} />
        <StatCard label="Munkadíj összesen" value={formatHUF(fin.totalLabourValue)} sub={`${fin.projectLabour.length} bejegyzés`} icon={Hammer} />
        <StatCard label="Általad kifizetve" value={formatHUF(fin.ownPaid)} sub="Az Ön számlái" icon={Receipt} />
        <div className={`stat-card ${fin.balance > 0 ? 'success' : fin.balance < 0 ? 'danger' : ''}`}>
          <div className="stat-label">Összesített egyenleg</div>
          <div className="stat-value" style={{ color: fin.balance > 0 ? 'var(--success-text)' : fin.balance < 0 ? 'var(--danger-text)' : 'var(--text-primary)' }}>
            {fin.balance > 0 ? `+${formatHUF(fin.balance)}` : formatHUF(fin.balance)}
          </div>
          <div className="stat-sub">
            {fin.balance > 0 ? 'A többiek tartoznak neked' : fin.balance < 0 ? 'Kiegyenlítendő tartozás' : 'Egyensúlyban'}
          </div>
        </div>
      </div>

      {/* Member Breakdown — desktop table / mobile cards */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Users size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Résztvevők elszámolása</h3>
        </div>

        {/* Desktop table */}
        <div className="table-container member-table-desktop">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Résztvevő</th>
                <th>Kifizetve</th>
                <th>Munkadíj</th>
                <th>Rá eső rész</th>
                <th>Egyenleg</th>
              </tr>
            </thead>
            <tbody>
              {fin.memberBreakdown.map(member => (
                <tr key={member.userId}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{member.displayName}</span>
                    {member.userId === currentUser?.id && (
                      <span style={{ marginLeft: '0.35rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>
                    )}
                  </td>
                  <td className="text-mono" style={{ fontWeight: 700 }}>{formatHUF(member.paid)}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success-text)' }}>+{formatHUF(member.labourValue)}</div>
                    {member.labourHours > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{member.labourHours} h</div>}
                  </td>
                  <td className="text-mono" style={{ color: 'var(--text-secondary)' }}>{formatHUF(fin.equalCostShare)}</td>
                  <td>
                    {member.balance > 0 ? (
                      <span className="balance-pill positive" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><TrendingUp size={11} /> +{formatHUF(member.balance)}</span>
                    ) : member.balance < 0 ? (
                      <span className="balance-pill negative" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><TrendingDown size={11} /> {formatHUF(member.balance)}</span>
                    ) : (
                      <span className="balance-pill neutral" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><CheckCircle2 size={11} /> 0 Ft</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="member-cards-mobile">
          {fin.memberBreakdown.map(member => (
            <div key={member.userId} className="member-card-row">
              <div className="member-card-name">
                {member.displayName}
                {member.userId === currentUser?.id && (
                  <span style={{ marginLeft: '0.4rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>
                )}
              </div>
              <div className="member-card-field">
                <span className="member-card-label">Kifizetve</span>
                <span className="member-card-value">{formatHUF(member.paid)}</span>
              </div>
              <div className="member-card-field">
                <span className="member-card-label">Munkadíj</span>
                <span className="member-card-value" style={{ color: 'var(--success-text)' }}>+{formatHUF(member.labourValue)}</span>
              </div>
              <div className="member-card-field">
                <span className="member-card-label">Rá eső rész</span>
                <span className="member-card-value" style={{ color: 'var(--text-secondary)' }}>{formatHUF(fin.equalCostShare)}</span>
              </div>
              <div className="member-card-field">
                <span className="member-card-label">Egyenleg</span>
                <span>
                  {member.balance > 0 ? (
                    <span className="balance-pill positive" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><TrendingUp size={11} /> +{formatHUF(member.balance)}</span>
                  ) : member.balance < 0 ? (
                    <span className="balance-pill negative" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><TrendingDown size={11} /> {formatHUF(member.balance)}</span>
                  ) : (
                    <span className="balance-pill neutral" style={{ fontSize: '0.725rem', padding: '0.15rem 0.5rem' }}><CheckCircle2 size={11} /> 0 Ft</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {(fin.totalLabourValue > 0) && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Egyenleg = </strong> (Kifizetve − Kiadásrész) + (Munkadíj − Munkadíjrész)
            &nbsp;·&nbsp; Kiadásrész: {formatHUF(fin.equalCostShare)}, Munkadíjrész: {formatHUF(fin.equalLabourShare)}
          </div>
        )}
      </div>

      {/* Settlement */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Wallet size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ki kinek tartozik?</h3>
        </div>

        {(fin.settlements ?? []).length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} />
            <span>Minden egyenlően el van osztva, nincs egyenlítendő tartozás.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {fin.settlements.map((s, i) => (
              <div key={i} className="settlement-row">
                <span style={{ fontWeight: 700, color: 'var(--danger-text)' }}>{s.from}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span>fizet</span>
                  <ArrowRight size={14} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--success-text)' }}>{s.to}</span>
                <span className="settlement-amount" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatHUF(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Switcher: Invoices | Labour */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0' }}>
        {[
          { key: 'invoices', label: `Számlák (${fin.projectInvoices.length})`, icon: Receipt },
          { key: 'labour', label: `Munka (${fin.projectLabour.length})`, icon: Hammer }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderRadius: 0,
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 800 : 600,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.9rem',
              transition: 'all 0.15s ease'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== INVOICES TAB ===== */}
      {activeTab === 'invoices' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-control" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}>
              <option value="ALL">Minden kategória</option>
              {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={uploaderFilter} onChange={(e) => setUploaderFilter(e.target.value)} className="form-control" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs megjeleníthető számla</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Ehhez a szűréshez még nem rögzítettek számlát.</p>
              <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Számla hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredInvoices.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} isAdmin={isAdmin} onDelete={isAdmin ? handleDeleteInvoice : null} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== LABOUR TAB ===== */}
      {activeTab === 'labour' && (
        <>
          {fin.projectLabour.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Hammer size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs rögzített munka</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>A saját elvégzett munkák itt jelennek meg.</p>
              <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Munkabejegyzés hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {fin.projectLabour.map(entry => {
                const uploader = users.find(u => u.id === entry.uploaded_by);
                const canDelete = entry.uploaded_by === currentUser?.id || isAdmin;
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem' }}>
                    <div style={{ padding: '0.55rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                      <Hammer size={18} color="var(--success)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{entry.labour_type}</div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} /> {entry.hours} h × {formatHUF(entry.hourly_rate)}
                            </span>
                            <span>{formatDate(entry.date)}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</span>
                          </div>
                          {entry.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{entry.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success-text)', fontFamily: 'var(--font-mono)' }}>+{formatHUF(entry.value_huf)}</span>
                          {canDelete && (
                            <button type="button" onClick={() => handleDeleteLabour(entry.id)} className="btn btn-danger btn-sm" title="Törlés">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title="Bejegyzés törlése"
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
