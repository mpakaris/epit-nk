'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, Ellipsis, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import StatusBadge from './StatusBadge';
import TeamBadge from './TeamBadge';
import BottomSheet from './BottomSheet';

function formatHuDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const now = new Date();
  const diffDays = Math.round((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return 'ma';
  if (diffDays === 1) return 'tegnap';
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

// Deterministic gradient per title — keeps cards visually distinct without photos
const GRADIENTS = [
  ['#3b82f6', '#1e40af'],  // blue
  ['#8b5cf6', '#5b21b6'],  // violet
  ['#06b6d4', '#0e7490'],  // cyan
  ['#10b981', '#065f46'],  // emerald
  ['#f59e0b', '#92400e'],  // amber
  ['#f97316', '#9a3412'],  // orange
  ['#ec4899', '#9d174d'],  // pink
  ['#64748b', '#1e293b'],  // slate
  ['#a855f7', '#6b21a8'],  // purple
  ['#14b8a6', '#134e4a'],  // teal
];

function titleGradient(title = '') {
  let h = 0;
  for (let i = 0; i < title.length; i++) {
    h = Math.imul(31, h) + title.charCodeAt(i) | 0;
  }
  const [a, b] = GRADIENTS[Math.abs(h) % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

const TYPE_META = {
  felmeres: { label: 'Felmérés', color: '#2563eb', bg: 'rgba(37,99,235,0.18)' },
  ajanlat:  { label: 'Ajánlat',  color: '#fff',    bg: 'rgba(124,58,237,0.75)' },
  projekt:  { label: 'Projekt',  color: '#fff',    bg: 'rgba(5,150,105,0.75)'  },
};

export default function ItemCard({
  href,
  title,
  clientName,
  date,
  status,
  type,
  photoUrls = [],
  isShared = false,
  role,
  stripHeight = 72,
  onDelete,
  onDuplicate,
  onRename,
  onTransfer,
  isPendingTransfer = false,
  onRetractTransfer,
  lockedReason,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lockOpen,  setLockOpen]  = useState(false);
  const [retracting, setRetracting] = useState(false);

  const handleRetract = async () => {
    setRetracting(true);
    try {
      await onRetractTransfer?.();
      setLockOpen(false);
    } catch {
      // parent showed error modal
    } finally {
      setRetracting(false);
    }
  };

  const previews = photoUrls.slice(0, 3);
  const photoCount = photoUrls.length;

  return (
    <>
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {/* Photo strip */}
        <div className="item-card-strip" style={{ position: 'relative', height: stripHeight }}>
          {previews.length === 0 ? (
            <div style={{
              height: '100%',
              background: titleGradient(title),
              display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.22)',
                userSelect: 'none', lineHeight: 1,
                fontFamily: 'var(--font-main, sans-serif)',
              }} aria-hidden="true">
                {(title || '?')[0].toUpperCase()}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${previews.length}, 1fr)`,
              gap: 2, height: '100%',
            }}>
              {previews.map((url, i) => (
                <div
                  key={i}
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    height: '100%',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {/* Team badge */}
          {isShared && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <TeamBadge />
            </div>
          )}

          {/* Type badge */}
          {type && TYPE_META[type] && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, lineHeight: 1,
                color: TYPE_META[type].color,
                background: TYPE_META[type].bg,
                padding: '3px 8px', borderRadius: 999,
                backdropFilter: 'blur(4px)',
              }}>
                {TYPE_META[type].label}
              </span>
            </div>
          )}

          {/* Locked / rejected badge */}
          {lockedReason && (
            <div style={{ position: 'absolute', bottom: 6, left: 8 }}>
              <span style={{
                background: 'var(--danger-text)', color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '2px 7px',
                borderRadius: 999, letterSpacing: '0.03em', whiteSpace: 'nowrap',
              }}>
                {lockedReason === 'transfer_expired' ? 'LEJÁRT' : 'VISSZAUTASÍTVA'}
              </span>
            </div>
          )}

          {/* Pending transfer badge */}
          {isPendingTransfer && (
            <div style={{ position: 'absolute', bottom: 6, left: 8 }}>
              <span style={{
                background: 'var(--warning-text)', color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '2px 7px',
                borderRadius: 999, letterSpacing: '0.03em', whiteSpace: 'nowrap',
              }}>
                ÁTADÁS FOLYAMATBAN
              </span>
            </div>
          )}

          {/* Role badge — owner vs member, only shown on collective docs */}
          {isShared && role && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px',
                borderRadius: 999, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                background: role === 'owner' ? 'rgba(37,99,235,0.85)' : 'rgba(5,150,105,0.85)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}>
                {role === 'owner' ? 'TULAJDONOS' : 'KÖZREMŰKÖDŐ'}
              </span>
            </div>
          )}

          {/* Photo count */}
          {photoCount > 0 && (
            <div style={{
              position: 'absolute', bottom: 6, right: 8,
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'rgba(15,23,42,.78)', borderRadius: 999,
              padding: '2px 6px',
            }}>
              <Camera size={11} color="#fff" strokeWidth={1.75} aria-hidden="true" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{photoCount}</span>
            </div>
          )}
        </div>

        {/* Body — position:relative so ⋯ button anchors to the white area */}
        <div style={{ position: 'relative', padding: '14px 16px 16px' }}>
          <div className="item-card-title" style={{
            fontWeight: 700, color: '#0f172a',
            lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            paddingRight: 44,
          }}>
            {title}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 4, gap: 8,
          }}>
            <span className="item-card-meta" style={{
              color: '#475569', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {clientName && (
                <span style={{ fontWeight: 600 }}>{clientName}</span>
              )}
              {clientName && date && <span style={{ color: '#64748b' }}> · </span>}
              {date && (
                <span style={{ color: '#64748b', fontWeight: 500 }}>{formatHuDate(date)}</span>
              )}
            </span>
            <StatusBadge status={status} />
          </div>

          {/* ⋯ button anchored to the top-right of the white body, always visible */}
          <button
            type="button"
            onClick={() => isPendingTransfer ? setLockOpen(true) : setSheetOpen(true)}
            aria-label="További műveletek"
            style={{
              position: 'absolute', right: 4, top: 4,
              width: 44, height: 44,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2, borderRadius: 10,
            }}
          >
            <Ellipsis size={20} color="#94a3b8" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Whole-card tap target */}
        <Link
          href={href}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          aria-label={`Megnyitás: ${title}`}
        />
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={title}
        subtitle={clientName || undefined}
        onOpen={() => { window.location.href = href; }}
        onDuplicate={onDuplicate}
        onRename={onRename}
        onTransfer={onTransfer}
        onDelete={onDelete}
      />

      <Modal isOpen={lockOpen} onClose={retracting ? undefined : () => setLockOpen(false)} title="Átadás folyamatban">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="var(--warning-text)" />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Ez a dokumentum kollektívába való átadásra vár, ezért nem módosítható és nem törölhető.
            {onRetractTransfer && <><br /><br />Vissza szeretnéd vonni a kérelmet?</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setLockOpen(false)} disabled={retracting}>
            {onRetractTransfer ? 'Mégse' : 'Bezárás'}
          </button>
          {onRetractTransfer && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--warning-text)', color: '#fff', minWidth: 110 }}
              onClick={handleRetract}
              disabled={retracting}
            >
              {retracting
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Visszavonás…</>
                : 'Visszavonás'}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
