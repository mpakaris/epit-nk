'use client';

import React from 'react';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import { User, Calendar, Receipt, Home, Sparkles } from 'lucide-react';

export default function InvoiceCard({ invoice, room, onClick }) {
  const catObj = INVOICE_CATEGORIES.find(c => c.id === invoice.category) || { color: 'egyeb' };
  const hasItems = Array.isArray(invoice.ai_line_items) && invoice.ai_line_items.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.75rem',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        background: 'var(--bg-card, #fff)',
        padding: 'var(--card-padding, 1rem)',
      }}
    >
      {/* Top row: Category & Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <span className={`category-badge category-${catObj.color}`} style={{ flexShrink: 0 }}>
          {invoice.category}
        </span>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          {formatHUF(invoice.value_huf)}
        </span>
      </div>

      {/* Description */}
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
        {invoice.description || 'Számla bizonylat'}
      </h4>

      {/* Metadata */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <User size={13} color="var(--accent)" />
          <strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Calendar size={13} />
          {formatDate(invoice.created_at)}
        </span>
        {room ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>
            <Home size={10} />{room.name}
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>
            <Home size={10} />Általános
          </span>
        )}
        {hasItems && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>
            <Sparkles size={10} />{invoice.ai_line_items.length} tétel
          </span>
        )}
      </div>
    </button>
  );
}
