'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ExpandButton({ total, showing, expanded, onToggle }) {
  if (total <= showing) return null;
  const remaining = total - showing;
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', height: 52,
        background: 'transparent', border: '1px solid #cbd5e1',
        borderRadius: 999, cursor: 'pointer',
        fontSize: 15, fontWeight: 700, color: '#475569',
        marginTop: 8,
      }}
    >
      {expanded
        ? <><ChevronUp size={16} aria-hidden="true" /> Kevesebb</>
        : <><ChevronDown size={16} aria-hidden="true" /> + {remaining} további</>}
    </button>
  );
}
