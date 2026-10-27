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

const TYPE_LABELS = {
  felmeres: 'Felmérés',
  ajanlat:  'Ajánlat',
  projekt:  'Projekt',
  ugyfel:   'Ügyfél',
};

export default function CompactRow({ href, title, meta, type, isShared }) {
  const Icon = TYPE_ICONS[type] || Folder;
  const typeLabel = TYPE_LABELS[type] || '';

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
      {/* Icon chip */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: '#f1f5f9', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color="#475569" strokeWidth={1.75} aria-hidden="true" />
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
          fontSize: 14, fontWeight: 500, color: '#475569',
          lineHeight: '20px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {meta}{meta && typeLabel ? ' · ' : ''}{typeLabel}
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
