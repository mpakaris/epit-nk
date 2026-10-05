'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate } from '@/lib/constants';
import StatCard from '@/components/StatCard';
import CalendarWidget from '@/components/CalendarWidget';
import {
  Users,
  FolderKanban,
  Receipt,
  Coins,
  Plus,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { isAdmin, isSuperAdmin, impersonating, projects, users, invoices } = useApp();

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>Hozzáférés megtagadva</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Csak adminisztrátorok számára elérhető felület.</p>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza a projektekhez</Link>
      </div>
    );
  }

  const totalHufSpent = invoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
  const totalProjects = projects.length;
  const totalUsers = users.length;
  const totalInvoices = invoices.length;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Adminisztráció
            </div>
            <h1 className="page-title">Áttekintés</h1>
            <p className="page-subtitle">
              Projektek, felhasználók és számlák központi kezelése
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/admin/projektek" className="btn btn-primary btn-sm">
              <Plus size={15} /> Új Projekt
            </Link>
            <Link href="/admin/felhasznalok" className="btn btn-secondary btn-sm">
              <Users size={15} /> Felhasználók
            </Link>
          </div>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Összesített kiadás"
          value={formatHUF(totalHufSpent)}
          sub="Összes projekt forgalma"
          icon={Coins}
          href="/admin/projektek"
        />
        <StatCard
          label="Aktív projektek"
          value={totalProjects}
          sub="Építkezések száma"
          icon={FolderKanban}
          href="/admin/projektek"
        />
        <StatCard
          label="Felhasználók"
          value={totalUsers}
          sub="Rendszertagok"
          icon={Users}
          href="/admin/felhasznalok"
        />
        <StatCard
          label="Rögzített számlák"
          value={totalInvoices}
          sub="Bizonylatok száma"
          icon={Receipt}
          href="/admin/projektek"
        />
      </div>

      {/* Calendar widget — only for entity context, not bare superadmin */}
      {!(isSuperAdmin && !impersonating) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <CalendarWidget />
        </div>
      )}

      {/* Projects & Invoices layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Projects card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Projektek állapota</h3>
            <Link href="/admin/projektek" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Összes <ArrowUpRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                Nincsenek még létrehozott projektek.
              </div>
            ) : (
              projects.slice(0, 4).map(p => {
                const pInvoices = invoices.filter(i => i.project_id === p.id);
                const pTotal = pInvoices.reduce((sum, i) => sum + Number(i.value_huf || 0), 0);

                return (
                  <div 
                    key={p.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {(p.members || []).length} tag &bull; {pInvoices.length} számla
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-mono" style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {formatHUF(pTotal)}
                      </div>
                      <Link href={`/admin/projektek/${p.id}`} style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                        Kezelés &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Invoices list */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Legfrissebb számlák</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minden projekt</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invoices.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                Nincsenek még feltöltött számlák.
              </div>
            ) : (
              invoices.slice(0, 5).map(inv => (
                <div
                  key={inv.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {inv.description || 'Számla bizonylat'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {inv.uploader_name} &bull; {formatDate(inv.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-mono" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                      {formatHUF(inv.value_huf)}
                    </div>
                    <span className={`category-badge category-${inv.category.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.65rem' }}>
                      {inv.category}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
