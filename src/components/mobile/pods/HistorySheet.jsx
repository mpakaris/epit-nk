'use client';

import { useState } from 'react';
import { formatDate, formatMoney } from '@/lib/constants';

/**
 * Shared history bottom-sheet for offer and project detail mobile views.
 *
 * Props:
 *   title         - string shown as the sheet heading
 *   history       - array | null  (null = not yet loaded)
 *   loading       - boolean
 *   emptyText     - string shown when history is empty
 *   onClose       - () => void
 *   accentColor   - CSS colour string for the timeline dot
 *   actionLabels  - { 'action.key': 'Translated label', ... }
 *   getDetailRows - optional (details) => [{label, value}]  — parent computes domain rows
 *   userCurrency  - string
 */
export default function HistorySheet({
  title,
  history,
  loading,
  emptyText,
  onClose,
  accentColor = 'var(--accent)',
  actionLabels = {},
  getDetailRows,
  userCurrency,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div
      role="dialog"
      aria-label={title}
      className="pod-sheet"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        boxSizing: 'border-box',
        padding: '10px 16px calc(18px + env(safe-area-inset-bottom))',
        borderRadius: '32px 32px 0 0',
        background: 'var(--m-sheet, #FBFAF7)',
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: '88%', overflowY: 'auto',
      }}
    >
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Bezárás"
          style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {loading && <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>…</span>}

      {!loading && (!history || history.length === 0) && (
        <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{emptyText}</span>
      )}

      {(history || []).map(h => {
        const isOpen      = expandedId === h.id;
        const actionLabel = actionLabels[h.action] || h.action;
        const detailRows  = getDetailRows ? getDetailRows(h.details || {}) : [];
        const hasDetails  = detailRows.length > 0;

        return (
          <button
            key={h.id}
            type="button"
            onClick={() => hasDetails && setExpandedId(isOpen ? null : h.id)}
            style={{
              width: '100%', border: 0, borderRadius: 18, background: '#fff',
              padding: '12px 14px', textAlign: 'left',
              cursor: hasDetails ? 'pointer' : 'default',
              boxShadow: '0 1px 0 rgba(14,17,22,0.04), 0 6px 14px -8px rgba(14,17,22,0.12)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 5, background: accentColor, marginTop: 1 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.3 }}>{actionLabel}</span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A8F97', marginTop: 1 }}>
                  {h.user_name}{h.user_name && h.created_at ? ' · ' : ''}{h.created_at ? formatDate(h.created_at) : ''}
                </span>
              </span>
              {hasDetails && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"
                  style={{ flexShrink: 0, transition: 'transform .18s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              )}
            </div>
            {isOpen && detailRows.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #EDEBE5', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detailRows.map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8F97', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
