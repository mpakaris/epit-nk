'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardList, FileText, Folder, Contact } from 'lucide-react';
import TeamBadge from './TeamBadge';

const TYPE_ICONS = {
  felmeres:  ClipboardList,
  ajanlat:   FileText,
  projekt:   Folder,
  ugyfel:    Contact,
};

const TYPE_META = {
  felmeres: { label: 'Felmérés', color: '#2563eb', bg: '#eff6ff' },
  ajanlat:  { label: 'Ajánlat',  color: '#7c3aed', bg: '#f5f3ff' },
  projekt:  { label: 'Projekt',  color: '#059669', bg: '#ecfdf5' },
  ugyfel:   { label: 'Ügyfél',   color: '#d97706', bg: '#fffbeb' },
};

export default function CompactRow({ href, title, meta, type, isShared }) {
  const Icon = TYPE_ICONS[type] || Folder;
  const typeMeta = TYPE_META[type];

  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        minHeight: 72, padding: '12px 16px',
        background: '#fff', borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
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
          fontSize: 16, fontWeight: 700, color: '#0f172a',
          lineHeight: '22px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
        }}>
          {typeMeta && (
            <span style={{
              fontSize: 11, fontWeight: 700, lineHeight: 1,
              color: typeMeta.color, background: typeMeta.bg,
              padding: '2px 7px', borderRadius: 999,
              flexShrink: 0,
            }}>
              {typeMeta.label}
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

      {/* Team badge + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isShared && <TeamBadge />}
        <ChevronRight size={18} color="#94a3b8" strokeWidth={1.75} aria-hidden="true" />
      </div>
    </Link>
  );
}
