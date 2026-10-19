'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Sparkles, RotateCcw, ArrowRight, Users, User } from 'lucide-react';

export default function DemoBanner() {
  const { activeCollectiveId, setActiveContext, resetDemo, collectives } = useApp();

  const isCollective = !!activeCollectiveId;
  const collectiveId = collectives?.[0]?.collective_id;

  const toggle = () => setActiveContext(isCollective ? null : collectiveId);

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: '#0f172a', color: '#fff',
      padding: '0.55rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.5rem',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.8rem',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#2563eb', color: '#fff', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.68rem' }}>
          <Sparkles size={11} /> DEMO MÓD
        </span>
        <span style={{ color: '#94a3b8' }}>Valódi adatok nélkül — próbáld ki bátran.</span>
      </div>

      {/* Center: workspace toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', borderRadius: 8, padding: '0.25rem' }}>
        <button
          onClick={() => setActiveContext(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.15s', background: !isCollective ? '#fff' : 'transparent', color: !isCollective ? '#0f172a' : '#94a3b8' }}
        >
          <User size={12} /> Személyes
        </button>
        <button
          onClick={() => setActiveContext(collectiveId)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.15s', background: isCollective ? '#fff' : 'transparent', color: isCollective ? '#0f172a' : '#94a3b8' }}
        >
          <Users size={12} /> Kollektív
        </button>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
