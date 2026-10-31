'use client';

import React from 'react';
import { formatHUF, formatDate } from '@/lib/constants';
import { User, Calendar, Home, Sparkles, PencilLine, Paperclip, Edit3, Trash2 } from 'lucide-react';

// Richer, darker version of each category color for the card header
const CAT_HEADER = {
  'Anyag':            { bg: '#1e3a8a', body: '#eff6ff', border: '#bfdbfe' },
  'Szerszám/Eszköz':  { bg: '#78350f', body: '#fffbeb', border: '#fde68a' },
  'Szállítás':        { bg: '#4c1d95', body: '#f5f3ff', border: '#ddd6fe' },
  'Engedély/Hatóság': { bg: '#881337', body: '#fff1f2', border: '#fecdd3' },
  'Egyéb':            { bg: '#1e293b', body: '#f8fafc', border: '#cbd5e1' },
};

const PILL = {
  fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem',
  borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3,
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
};

export default function InvoiceCard({ invoice, room, onClick, onDelete, canEdit }) {
  const cat = CAT_HEADER[invoice.category] || CAT_HEADER['Egyéb'];
  const hasItems = Array.isArray(invoice.ai_line_items) && invoice.ai_line_items.length > 0;
  const showActions = canEdit || onDelete;

  return (
    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1.5px solid ${cat.border}`, background: '#fff' }}>

      {/* ── Coloured header — click to open drawer ── */}
      <button
        type="button"
        onClick={onClick}
        style={{ display: 'block', width: '100%', background: cat.bg, padding: '0.75rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
              {invoice.category}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.35rem', color: '#fff', lineHeight: 1.1 }}>
              {formatHUF(invoice.value_huf)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
            {hasItems && (
              <span style={PILL}><Sparkles size={9} />{invoice.ai_line_items.length} tétel</span>
            )}
            {invoice.image_url && (
              <span style={PILL}><Paperclip size={9} />Bizonylat</span>
            )}
          </div>
        </div>
      </button>

      {/* ── Light body ── */}
      <div style={{ background: cat.body, padding: '0.65rem 1rem' }}>
        {invoice.description && (
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.45rem', lineHeight: 1.3 }}>
            {invoice.description}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <User size={12} color="var(--accent)" />
            <strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />{formatDate(invoice.created_at)}
          </span>
          {room ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.68rem' }}>
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

        {/* Action buttons */}
        {showActions && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.55rem', paddingTop: '0.55rem', borderTop: `1px solid ${cat.border}` }}>
            {canEdit && (
              <button type="button" onClick={onClick} className="btn btn-secondary btn-sm" title="Szerkesztés">
                <Edit3 size={13} />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} className="btn btn-danger btn-sm" title="Törlés">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
