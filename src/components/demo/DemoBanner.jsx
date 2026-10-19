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
      flexShrink: 0, overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.8rem',
    }}>
      {/* Left — demo badge + hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#2563eb', color: '#fff', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.68rem', flexShrink: 0 }}>
          <Sparkles size={11} /> DEMO
        </span>
        <span className="demo-banner-hint" style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Valódi adatok nélkül — váltsd a munkaterületet a bal oldali menüben.
        </span>
      </div>

      {/* Right — reset + register */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0, marginLeft: '0.75rem' }}>
        <button
          onClick={resetDemo}
          className="demo-banner-reset"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer', color: '#94a3b8', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.75rem' }}
        >
          <RotateCcw size={11} /> Visszaállítás
        </button>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#2563eb', borderRadius: 6, padding: '0.3rem 0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Regisztráció <ArrowRight size={11} />
        </Link>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .demo-banner-hint  { display: none; }
          .demo-banner-reset { display: none !important; }
        }
      `}</style>
    </div>
  );
}
