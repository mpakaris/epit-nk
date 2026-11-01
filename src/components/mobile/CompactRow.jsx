'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Ruler, Euro, FolderKanban, Contact } from 'lucide-react';
import TeamBadge from './TeamBadge';

const TYPE_ICONS = {
  felmeres:  Ruler,
  ajanlat:   Euro,
  projekt:   FolderKanban,
  ugyfel:    Contact,
};

const TYPE_META = {
  felmeres: { label: 'Felmérés', color: '#2563eb', bg: '#eff6ff' },
  ajanlat:  { label: 'Ajánlat',  color: '#7c3aed', bg: '#f5f3ff' },
  projekt:  { label: 'Projekt',  color: '#059669', bg: '#ecfdf5' },
  ugyfel:   { label: 'Ügyfél',   color: '#d97706', bg: '#fffbeb' },
};

export default function CompactRow({ href, title, meta, type, isShared, isPendingTransfer }) {
  const Icon = TYPE_ICONS[type] || Folder;
  const typeMeta = TYPE_META[type];

  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        minHeight: 72, padding: '12px 16px',
        background: '#fff', borderRadius: 16,
        borderLeft: `4px solid ${typeMeta?.color || '#94a3b8'}`,
        boxShadow: `0 4px 16px ${typeMeta?.color || '#94a3b8'}28, 0 1px 4px rgba(0,0,0,0.06)`,
        textDecoration: 'none', color: 'inherit',
        marginBottom: 8,
      }}
    >
      {/* Icon chip — colored per type */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: typeMeta?.bg || '#f1f5f9', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={typeMeta?.color || '#475569'} strokeWidth={1.75} aria-hidden="true" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#0f172a',
          lineHeight: '22px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {typeMeta && (
            <span style={{
              fontSize: 11, fontWeight: 700, lineHeight: 1,
              color: typeMeta.color, background: typeMeta.bg,
              padding: '2px 7px', borderRadius: 999, flexShrink: 0,
            }}>
              {typeMeta.label}
            </span>
          )}
          {isShared && <TeamBadge />}
          {isPendingTransfer && (
            <span style={{
              fontSize: 10, fontWeight: 800, lineHeight: 1,
              color: '#92400e', background: '#fef3c7',
              border: '1px solid #fde68a',
              padding: '2px 6px', borderRadius: 999,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              ÁTVITEL FOLYAMATBAN
            </span>
          )}
          {meta && (
            <span style={{
              fontSize: 13, fontWeight: 500, color: '#475569',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {meta}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={18} color="#94a3b8" strokeWidth={1.75} style={{ flexShrink: 0 }} aria-hidden="true" />
    </Link>
  );
}
