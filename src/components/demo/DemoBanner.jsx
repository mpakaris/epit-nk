'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Sparkles, RotateCcw, ArrowRight } from 'lucide-react';

export default function DemoBanner() {
  const { resetDemo } = useApp();

  return (
    <div style={{
      background: '#0f172a', color: '#fff',
      height: 40, padding: '0 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.8rem',
    }}>
      {/* Left — demo badge + hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#2563eb', color: '#fff', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.68rem', flexShrink: 0 }}>
          <Sparkles size={11} /> DEMO
        </span>
        <span style={{ color: '#64748b' }}>
          Valódi adatok nélkül — váltsd a munkaterületet a bal oldali menüben.
        </span>
      </div>

      {/* Right — reset + register */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          onClick={resetDemo}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer', color: '#94a3b8', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.75rem' }}
        >
          <RotateCcw size={11} /> Visszaállítás
        </button>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#2563eb', borderRadius: 6, padding: '0.3rem 0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none' }}>
          Regisztráció <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
