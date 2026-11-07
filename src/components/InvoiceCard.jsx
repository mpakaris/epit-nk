'use client';

import React from 'react';
import { formatMoney, formatDate, INVOICE_CATEGORY_COLORS } from '@/lib/constants';
import { useApp } from '@/context/AppContext';
import { User, Calendar, Home, Sparkles, PencilLine, Paperclip, HardHat } from 'lucide-react';

export default function InvoiceCard({ invoice, room, media = [], onClick }) {
  const { userCurrency } = useApp();
  const c        = INVOICE_CATEGORY_COLORS[invoice.category] ?? INVOICE_CATEGORY_COLORS['Egyéb'];
  const isLabour = invoice.category === 'Munka';
  const hasItems = Array.isArray(invoice.ai_line_items) && invoice.ai_line_items.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1.5px solid ${c.border}`, borderLeft: `5px solid ${c.color}`, background: '#fff', width: '100%', textAlign: 'left', cursor: 'pointer' }}
    >
      {/* Category-coloured header */}
      <div style={{ background: c.bg, padding: '0.75rem 1rem', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.8 }}>
              {isLabour && <HardHat size={11} />}{invoice.category}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.35rem', color: c.color, lineHeight: 1.1 }}>
              {formatMoney(invoice.value_huf, userCurrency)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
            {hasItems && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3, background: c.color + '18', border: `1px solid ${c.border}`, color: c.color }}>
                <Sparkles size={9} />{invoice.ai_line_items.length} tétel
              </span>
            )}
            {invoice.image_url && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3, background: c.color + '18', border: `1px solid ${c.border}`, color: c.color }}>
                <Paperclip size={9} />Bizonylat
              </span>
            )}
          </div>
        </div>
      </div>

      {/* White body */}
      <div style={{ background: '#fff', padding: '0.65rem 1rem' }}>
        {invoice.description && (
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.45rem', lineHeight: 1.3 }}>
            {invoice.description}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <User size={12} color={c.color} />
            <strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />{formatDate(invoice.created_at)}
          </span>
          {room ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontWeight: 700, fontSize: '0.68rem' }}>
              <Home size={10} />{room.name}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.68rem' }}>
              <Home size={10} />Általános
            </span>
          )}
        </div>
        {invoice.updated_at && (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.3rem' }}>
            <PencilLine size={9} />
            {invoice.updated_by_name ? `${invoice.updated_by_name} · ` : ''}{formatDate(invoice.updated_at)}
          </div>
        )}
        {(() => {
          const all = media.length > 0 ? media : invoice.image_url ? [{ image_url: invoice.image_url }] : [];
          if (all.length === 0) return null;
          return (
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', alignItems: 'center' }}>
              {all.slice(0, 3).map((m, i) => (
                <img key={i} src={m.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: `1px solid ${c.border}`, flexShrink: 0 }} />
              ))}
              {all.length > 3 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 2 }}>+{all.length - 3}</span>
              )}
            </div>
          );
        })()}
      </div>
    </button>
  );
}
