'use client';

import React, { useState, useLayoutEffect } from 'react';
import {
  TrendingUp, TrendingDown, CheckCircle2, Plus,
  FolderKanban, FileText, BookUser, Globe,
  Hammer,
} from 'lucide-react';
import { LANDING_I18N } from '@/lib/landingI18n';

// ─── tokens (mirrors globals.css) ───────────────────────────────────────────
const T = {
  accent:         '#2563eb',
  accentLight:    '#eff6ff',
  accentBorder:   '#bfdbfe',
  successBg:      '#ecfdf5',
  successBorder:  '#a7f3d0',
  successText:    '#065f46',
  dangerBg:       '#fef2f2',
  dangerBorder:   '#fecaca',
  dangerText:     '#991b1b',
  textPrimary:    '#0f172a',
  textSecondary:  '#475569',
  textMuted:      '#64748b',
  textLight:      '#94a3b8',
  border:         '#e2e8f0',
  bgBase:         '#f8fafc',
  bgSubtle:       '#f1f5f9',
  bgCard:         '#ffffff',
  navy:           '#0f172a',
  font:           "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:           "'JetBrains Mono', monospace",
};

const fmt = (n) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft';

const NAV_ICONS = [FolderKanban, FileText, BookUser, Globe];

function BalancePill({ balance, settledLabel }) {
  if (balance > 0) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:9999, background:T.successBg, color:T.successText, border:`1px solid ${T.successBorder}` }}>
      <TrendingUp size={11} /> +{fmt(balance)}
    </span>
  );
  if (balance < 0) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:9999, background:T.dangerBg, color:T.dangerText, border:`1px solid ${T.dangerBorder}` }}>
      <TrendingDown size={11} /> {fmt(balance)}
    </span>
  );
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:9999, background:T.bgSubtle, color:T.textSecondary, border:`1px solid ${T.border}` }}>
      <CheckCircle2 size={11} /> {settledLabel}
    </span>
  );
}

function ProjectCard({ project, statLabels, addBtn, settledLabel }) {
  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      fontFamily: T.font,
    }}>
      <div style={{ padding: '0.85rem', display:'flex', flexDirection:'column', gap:'0.65rem', flex:1 }}>
        <h3 style={{ fontSize:'0.875rem', fontWeight:800, color:T.textPrimary, letterSpacing:'-0.015em', lineHeight:1.3, margin:0 }}>
          {project.name}
        </h3>
        <p style={{ fontSize:'0.72rem', color:T.textSecondary, lineHeight:1.4, margin:0 }}>
          {project.desc}
        </p>
        <div style={{ background:T.bgSubtle, borderRadius:8, padding:'0.5rem 0.65rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.3rem', border:`1px solid ${T.border}` }}>
          {[
            { label: statLabels.cost,     value: fmt(project.cost),   color: T.textPrimary   },
            { label: statLabels.labour,   value: fmt(project.labour), color: T.successText   },
            { label: statLabels.invoices, value: `${project.invoices} db`, color: T.textSecondary },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize:'0.58rem', color:T.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.04em' }}>{label}</div>
              <div style={{ fontWeight:800, fontSize:'0.72rem', color, fontFamily:T.mono, marginTop:'0.1rem' }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'0.5rem', borderTop:`1px solid ${T.border}`, gap:'0.4rem', marginTop:'auto' }}>
          <BalancePill balance={project.balance} settledLabel={settledLabel} />
          <span style={{ display:'inline-flex', alignItems:'center', gap:'0.25rem', padding:'0.25rem 0.55rem', borderRadius:8, background:T.accent, color:'#fff', fontSize:'0.68rem', fontWeight:700 }}>
            <Plus size={10} /> {addBtn}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Outer wrapper: clips the scaled-down 600px inner frame ─────────────────
// Inner frame: 600px wide, ~640px tall
// Scale: 0.72  →  visible size ≈ 432px × 460px
const INNER_W       = 600;
const INNER_H       = 640;
const DEFAULT_SCALE = 0.72;

export default function ProjectsListPreview({ locale = 'hu' }) {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const P = (LANDING_I18N[locale] || LANDING_I18N.hu).preview.projects;

  useLayoutEffect(() => {
    const update = () => {
      const available = window.innerWidth - 40;
      setScale(available < INNER_W * DEFAULT_SCALE
        ? Math.max(0.35, available / INNER_W)
        : DEFAULT_SCALE);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{
      width:  Math.round(INNER_W * scale),
      height: Math.round(INNER_H * scale),
      overflow: 'hidden',
      borderRadius: 14,
      boxShadow: '0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.1)',
      border: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>
      <div style={{ width: INNER_W, height: INNER_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>

        {/* ── Browser chrome ── */}
        <div style={{ background:T.navy, height:38, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', gap:'0.75rem' }}>
          {/* Traffic lights */}
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {['#f87171','#fbbf24','#34d399'].map((c, i) => (
              <div key={i} style={{ width:11, height:11, borderRadius:'50%', background:c }} />
            ))}
          </div>
          {/* URL bar */}
          <div style={{ flex:1, maxWidth:320, background:'rgba(255,255,255,0.09)', borderRadius:6, padding:'0.25rem 0.75rem', display:'flex', alignItems:'center', gap:'0.45rem' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', flexShrink:0 }} />
            <span style={{ fontSize:11, color:'#94a3b8', fontFamily:T.mono, letterSpacing:'0.01em' }}>okosszaki.hu/projektek</span>
          </div>
          <div style={{ width:60 }} />
        </div>

        {/* ── App shell ── */}
        <div style={{ display:'flex', height: INNER_H - 38, background:T.bgBase }}>

          {/* Sidebar */}
          <div style={{ width:52, background:T.bgCard, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:16, gap:4, flexShrink:0 }}>
            {/* Logo */}
            <div style={{ width:28, height:28, borderRadius:8, background:T.navy, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <Hammer size={13} color='#bfdbfe' />
            </div>
            {NAV_ICONS.map((Icon, i) => (
              <div key={i} title={P.nav[i]} style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background: i === 0 ? T.accentLight : 'transparent', color: i === 0 ? T.accent : T.textMuted, cursor:'default' }}>
                <Icon size={16} />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex:1, overflowY:'hidden', display:'flex', flexDirection:'column' }}>
            {/* Top bar */}
            <div style={{ background:T.bgCard, borderBottom:`1px solid ${T.border}`, padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h1 style={{ fontSize:'1.1rem', fontWeight:800, color:T.textPrimary, letterSpacing:'-0.025em', margin:0, fontFamily:T.font }}>{P.pageTitle}</h1>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.3rem 0.75rem', borderRadius:8, background:T.accent, color:'#fff', fontSize:'0.75rem', fontWeight:700, fontFamily:T.font }}>
                <Plus size={13} /> {P.newProject}
              </div>
            </div>

            {/* Cards grid */}
            <div style={{ flex:1, padding:'14px 18px', overflowY:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {P.items.map((p, i) => <ProjectCard key={i} project={p} statLabels={P.statLabels} addBtn={P.addBtn} settledLabel={P.settled} />)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
