'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { LayoutTemplate, Plus, Trash2, Edit3, Package, Hammer, Wrench, Truck, MoreHorizontal } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };

export default function TemplatesPage() {
  const { loading, dataReady, templates, deleteTemplate, isAdmin } = useApp();
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (loading || !dataReady) return <PageSpinner />;

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);
  const filtered = templates.filter(t => !q || norm(t.name).includes(q) || norm(t.title).includes(q));

  const handleDelete = (tpl) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${tpl.name}" sablont?`,
      onConfirm: async () => {
        try { await deleteTemplate(tpl.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      },
    });
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Sablonok</h1>
            <p className="page-subtitle">Újrafelhasználható ajánlat-struktúrák</p>
          </div>
          {isAdmin && (
            <Link href="/sablonok/uj" className="btn btn-primary btn-sm">
              <Plus size={15} /> Új sablon
            </Link>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Keresés sablon neve alapján…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <LayoutTemplate size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {search ? 'Nincs találat' : 'Nincsenek sablonok'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {search ? 'Próbáljon más keresési feltételt.' : 'Hozza létre az első sablont, vagy mentse el egy ajánlatot sablonként.'}
          </p>
          {!search && isAdmin && (
            <Link href="/sablonok/uj" className="btn btn-primary btn-sm"><Plus size={15} /> Új sablon</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(tpl => (
            <div key={tpl.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  <LayoutTemplate size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{tpl.name}</span>
                  {tpl.tax_percent > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      ÁFA {tpl.tax_percent}%
                    </span>
                  )}
                </div>
                {(tpl.title || tpl.location || tpl.work_type) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {tpl.title && <span>Cím: {tpl.title}</span>}
                    {tpl.location && <span>· {tpl.location}</span>}
                    {tpl.work_type && <span>· {tpl.work_type}</span>}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <Link href={`/sablonok/${tpl.id}/szerkesztes`} className="btn btn-primary btn-sm">
                    <Edit3 size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Sablon törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
