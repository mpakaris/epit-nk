'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';

function usePreviewScale(innerWidth, defaultScale) {
  const [scale, setScale] = useState(defaultScale);
  useLayoutEffect(() => {
    const update = () => {
      const available = window.innerWidth - 40;
      setScale(available < innerWidth * defaultScale
        ? Math.max(0.35, available / innerWidth)
        : defaultScale);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [innerWidth, defaultScale]);
  return scale;
}
import {
  Check, ArrowRight, Users, User,
  Ruler, Camera, Home, Plus, FileText,
  Globe, Share2, Clock, CheckCircle2,
  ClipboardList, FolderKanban, TrendingUp,
  Hammer, ChevronRight,
} from 'lucide-react';
import ProjectsListPreview from './ProjectsListPreview';

// ─── Design tokens (mirror globals.css) ─────────────────────────────────────
const T = {
  accent:        '#2563eb',
  accentHover:   '#1d4ed8',
  accentLight:   '#eff6ff',
  accentBorder:  '#bfdbfe',
  successBg:     '#ecfdf5',
  successBorder: '#a7f3d0',
  successText:   '#065f46',
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#64748b',
  textLight:     '#94a3b8',
  border:        '#e2e8f0',
  bgBase:        '#f8fafc',
  bgSubtle:      '#f1f5f9',
  bgCard:        '#ffffff',
  navy:          '#0f172a',
  purple:        '#7c3aed',
  purpleLight:   '#ede9fe',
  font:          "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:          "'JetBrains Mono', monospace",
};

const fmt = (n) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft';

// ─── Collective avatars (CSS-only, no external deps) ────────────────────────
const AVATARS = [
  { initials: 'KA', bg: T.accent,  name: 'Kovács Attila' },
  { initials: 'BÉ', bg: T.purple,  name: 'Balogh Éva' },
  { initials: 'TM', bg: '#059669', name: 'Tóth Márton' },
];

function CollectiveHeads({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'absolute', top: -18, right: 12,
      display: 'flex', alignItems: 'center', zIndex: 20,
      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))',
    }}>
      {AVATARS.map((a, i) => (
        <div key={i} title={a.name} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: a.bg, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 800,
          border: '2.5px solid #fff',
          marginLeft: i === 0 ? 0 : -10,
          fontFamily: T.font,
        }}>
          {a.initials}
        </div>
      ))}
      <div title="és mások" style={{
        width: 34, height: 34, borderRadius: '50%',
        background: T.textLight, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.62rem', fontWeight: 800,
        border: '2.5px solid #fff',
        marginLeft: -10,
        fontFamily: T.font,
      }}>+2</div>
    </div>
  );
}

// ─── Reusable browser frame wrapper ─────────────────────────────────────────
const INNER_W        = 600;
const DEFAULT_SCALE  = 0.72;

function BrowserFrame({ url, children, innerHeight = 520 }) {
  const scale  = usePreviewScale(INNER_W, DEFAULT_SCALE);
  const outerW = Math.round(INNER_W * scale);
  const outerH = Math.round(innerHeight * scale);

  return (
    <div style={{
      width: outerW, height: outerH,
      overflow: 'hidden', borderRadius: 14, flexShrink: 0,
      boxShadow: '0 20px 56px rgba(15,23,42,0.18), 0 4px 12px rgba(15,23,42,0.08)',
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ width: INNER_W, height: innerHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>

        {/* Chrome */}
        <div style={{ background: T.navy, height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#f87171','#fbbf24','#34d399'].map((c, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 320, background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '0.22rem 0.7rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: T.mono }}>{url}</span>
          </div>
        </div>

        {/* App shell with sidebar */}
        <div style={{ display: 'flex', height: innerHeight - 38, background: T.bgBase, fontFamily: T.font }}>
          {/* Sidebar */}
          <div style={{ width: 52, background: T.bgCard, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 4, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Hammer size={13} color={T.accentBorder} />
            </div>
            {[ClipboardList, FileText, FolderKanban, Globe].map((Icon, i) => (
              <div key={i} style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textLight }}>
                <Icon size={15} />
              </div>
            ))}
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Survey preview ──────────────────────────────────────────────────────────
const ROOMS = [
  { name: 'Nappali',    size: 32, photos: 4, h: 2.75 },
  { name: 'Fürdőszoba', size:  8, photos: 7, h: 2.50 },
  { name: 'Konyha',     size: 14, photos: 2, h: 2.75 },
  { name: 'Háló 1',     size: 18, photos: 3, h: 2.60 },
];

function SurveyPreview() {
  return (
    <BrowserFrame url="epitek.hu/felmeresek/B-2024-12" innerHeight={520}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Felmérés</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>Bakos villa – Teljes felmérés</h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: T.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
          <Plus size={12} /> Szoba hozzáadása
        </div>
      </div>

      {/* Rooms grid */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start', overflowY: 'hidden' }}>
        {ROOMS.map((r) => (
          <div key={r.name} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={13} color={T.accent} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: T.textPrimary }}>{r.name}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[`${r.size} m²`, `${r.h} m`, `${r.photos} fotó`].map((val) => (
                <span key={val} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 999, background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textSecondary }}>{val}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgCard, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600 }}>4 szoba · 72 m² összesen</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: T.successBg, color: T.successText, border: `1px solid ${T.successBorder}`, fontSize: '0.72rem', fontWeight: 700 }}>
          <FileText size={12} /> Ajánlat generálása
        </div>
      </div>
    </BrowserFrame>
  );
}

// ─── Offer preview ───────────────────────────────────────────────────────────
const OFFER_SECTIONS = [
  {
    name: 'Fürdőszoba',
    items: [
      { desc: 'Burkolás (falicsempe)', qty: '24 m²', unit: '4 500', total: '108 000' },
      { desc: 'Szaniter szerelés',     qty: '1 db',  unit: '85 000', total: '85 000' },
    ],
    subtotal: '193 000',
  },
  {
    name: 'Nappali',
    items: [
      { desc: 'Gipszkarton álmennyezet', qty: '32 m²', unit: '3 200', total: '102 400' },
      { desc: 'Festés (2 réteg)',        qty: '80 m²', unit: '1 200', total: '96 000'  },
    ],
    subtotal: '198 400',
  },
];

function OfferPreview() {
  return (
    <BrowserFrame url="epitek.hu/ajanlatok/A-0047" innerHeight={560}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Árajánlat #A-0047</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>Bakos villa – Teljes felújítás</h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: T.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
          <FileText size={12} /> PDF
        </div>
      </div>

      {/* Client row */}
      <div style={{ padding: '8px 18px', background: T.accentLight, borderBottom: `1px solid ${T.accentBorder}`, fontSize: '0.72rem', color: T.accent, fontWeight: 600, display: 'flex', gap: 16 }}>
        <span>Bakos Péter</span>
        <span style={{ color: T.textMuted }}>1124 Budapest, Alkotás u. 33.</span>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'hidden' }}>
        {OFFER_SECTIONS.map((sec) => (
          <div key={sec.name} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: T.bgSubtle, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: T.textPrimary }}>{sec.name}</span>
              <span style={{ fontSize: '0.7rem', fontFamily: T.mono, fontWeight: 700, color: T.successText, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '0.1rem 0.45rem', borderRadius: 999 }}>{fmt(parseInt(sec.subtotal.replace(' ', ''), 10))}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 68px 72px', gap: 0 }}>
              {/* Header */}
              {['Megnevezés','Menny.','Egységár','Összeg'].map((h) => (
                <div key={h} style={{ padding: '4px 8px', fontSize: '0.6rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${T.border}` }}>{h}</div>
              ))}
              {/* Rows */}
              {sec.items.map((it) => (
                <React.Fragment key={it.desc}>
                  <div style={{ padding: '5px 8px', fontSize: '0.72rem', color: T.textPrimary, fontWeight: 600, borderBottom: `1px solid ${T.bgSubtle}` }}>{it.desc}</div>
                  <div style={{ padding: '5px 8px', fontSize: '0.72rem', color: T.textSecondary, textAlign: 'right', fontFamily: T.mono, borderBottom: `1px solid ${T.bgSubtle}` }}>{it.qty}</div>
                  <div style={{ padding: '5px 8px', fontSize: '0.72rem', color: T.textSecondary, textAlign: 'right', fontFamily: T.mono, borderBottom: `1px solid ${T.bgSubtle}` }}>{it.unit} Ft</div>
                  <div style={{ padding: '5px 8px', fontSize: '0.72rem', color: T.textPrimary, fontWeight: 700, textAlign: 'right', fontFamily: T.mono, borderBottom: `1px solid ${T.bgSubtle}` }}>{it.total} Ft</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Total footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgCard, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textSecondary }}>Nettó végösszeg</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: T.accent, fontFamily: T.mono }}>391 400 Ft</span>
      </div>
    </BrowserFrame>
  );
}

// ─── Website preview (phone frame) ───────────────────────────────────────────
function WebsitePreview() {
  const PHONE_W     = 280;
  const PHONE_H     = 520;
  const phoneScale  = usePreviewScale(PHONE_W, 1);
  const services = ['Kőművesmunka', 'Burkolás', 'Gipszkarton', 'Festés', 'Vízszerelés', 'Tetőfedés'];

  return (
    <div style={{
      width: Math.round(PHONE_W * phoneScale),
      height: Math.round(PHONE_H * phoneScale),
      flexShrink: 0,
      borderRadius: 28, overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 20px 56px rgba(15,23,42,0.18), 0 4px 12px rgba(15,23,42,0.08)',
      border: `6px solid ${T.navy}`,
      fontFamily: T.font,
    }}>
      <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${phoneScale})`, transformOrigin: 'top left', display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <div style={{ background: T.navy, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 60, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      {/* Fake browser bar */}
      <div style={{ background: T.bgSubtle, borderBottom: `1px solid ${T.border}`, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${T.border}` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ fontSize: 9, color: T.textMuted, fontFamily: T.mono }}>nemes-renovalo.epitek.hu</span>
        </div>
      </div>

      {/* Website body */}
      <div style={{ flex: 1, overflowY: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Hero strip */}
        <div style={{ width: '100%', background: T.navy, padding: '16px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>NR</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>Nemes Renováló Kft.</div>
            <div style={{ fontSize: '0.62rem', color: T.textLight, marginTop: 2 }}>Engedéllyel rendelkező kivitelező · Budapest</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {['⭐ 4.9','32 projekt'].map(b => (
              <span key={b} style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 7px', borderRadius: 999 }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Services */}
        <div style={{ width: '100%', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, marginBottom: 6 }}>Szolgáltatások</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
            {services.map(s => (
              <div key={s} style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 6px', fontSize: '0.58rem', fontWeight: 600, color: T.textPrimary, textAlign: 'center' }}>{s}</div>
            ))}
          </div>
        </div>

        {/* Photo strip */}
        <div style={{ width: '100%', padding: '0 12px 10px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, marginBottom: 6 }}>Referenciák</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {['#bfdbfe','#ddd6fe','#bbf7d0','#fed7aa','#fecaca','#e0f2fe'].map((bg, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={12} color={T.textLight} />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ width: '100%', padding: '0 12px' }}>
          <div style={{ background: T.accent, color: '#fff', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700 }}>
            Ajánlatot kérek <ChevronRight size={13} />
          </div>
        </div>
      </div>
      </div>{/* end scale wrapper */}
    </div>
  );
}

// ─── Client portal preview ───────────────────────────────────────────────────
const TIMELINE = [
  { label: 'Ajánlat elfogadva',    done: true  },
  { label: 'Munka megkezdve',      done: true  },
  { label: 'Burkolás folyamatban', active: true },
  { label: 'Festés és befejezés',  done: false  },
  { label: 'Átadás és ellenőrzés', done: false  },
];

function ClientPortalPreview() {
  return (
    <BrowserFrame url="epitek.hu/portal/bakos-villa" innerHeight={520}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Ügyfélportál</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>Bakos villa – Teljes felújítás</h1>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>Folyamatban</span>
      </div>

      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'hidden' }}>
        {/* Progress */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.85rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textMuted, marginBottom: 10 }}>Projekt állapota</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {TIMELINE.map((step, i) => {
              const isActive = step.active;
              const isDone   = step.done;
              const color = isDone ? T.successText : isActive ? T.accent : T.textLight;
              const bg    = isDone ? T.successBg   : isActive ? T.accentLight : T.bgSubtle;
              const Icon  = isDone ? CheckCircle2 : isActive ? Clock : Clock;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={12} color={color} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: isDone || isActive ? 700 : 500, color }}>{step.label}</span>
                  {isActive && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: T.accent, color: '#fff', padding: '1px 6px', borderRadius: 999, marginLeft: 'auto' }}>Aktív</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo strip */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textMuted, marginBottom: 8 }}>Legutóbbi fotók</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {['#bfdbfe','#ddd6fe','#bbf7d0','#fed7aa'].map((bg, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={13} color={T.textLight} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ─── Feature row data ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'survey',
    overline: '01 · Felmérés',
    title: 'Minden méret rögzítve, mielőtt elhagyod a helyszínt',
    desc: 'Szobák, méretek, fotók, megjegyzések azonnal a telefonon. Nincs elveszett papír, nincs kézzel rajzolt vázlat. Az ügyfél még jelen van, te már kész vagy a dokumentációval.',
    bullets: [
      'Szobák és méretek felvitele a helyszínen',
      'Fotók és vázlatok közvetlenül a projekthez rendelve',
      'Felmérésből árajánlat egyetlen gombnyomásra',
    ],
    collectiveBullet: 'Csapatban végzett felmérés: minden tag látja a szobákat és a fotókat',
    Preview: SurveyPreview,
    imageFirst: true,
  },
  {
    id: 'offer',
    overline: '02 · Árajánlat',
    title: 'Profi ajánlat percek alatt, nem órák alatt',
    desc: 'Tételes, helyiségekre bontott árajánlat, amit az ügyfél e-mailben kap meg és egyetlen kattintással elfogad. Vége az Excel-táblázatoknak és a kézzel kitöltött nyomtatványoknak.',
    bullets: [
      'Tételek helyiségekre és munkafázisokra bontva',
      'PDF generálás és közvetlen e-mail küldés',
      'Ügyfél jóváhagyás online, papír nélkül',
    ],
    collectiveBullet: 'Közös ajánlat: minden alvállalkozó hozzáadja a saját tételeit',
    Preview: OfferPreview,
    imageFirst: false,
  },
  {
    id: 'projects',
    overline: '03 · Projektek',
    title: 'Projekt és pénz, mindig kéz alatt',
    desc: 'Számlák, munkadíjak, fotók egy helyen. Pontosan látod, melyik projekten mennyit költöttél, ki mennyit dolgozott, és hol állsz a büdzsével szemben.',
    bullets: [
      'Számlák és munkadíjak rögzítése fotóval',
      'AI-alapú számlafelismerés (OCR)',
      'Kategóriákra és szekciókra bontott kimutatás',
    ],
    collectiveBullet: 'Résztvevők hozzájárulása: ki mennyit fizetett és végzett el',
    Preview: () => <ProjectsListPreview />,
    imageFirst: true,
  },
  {
    id: 'website',
    overline: '04 · Weboldal',
    title: 'Saját weboldal, minden fiókhoz ingyen',
    desc: 'Nincs szükség webfejlesztőre vagy havi tárhelydíjra. Az Epitek automatikusan létrehoz egy letisztult weblapot a vállalkozásodnak. Az ügyfeleid megtalálnak és ajánlatot kérhetnek.',
    bullets: [
      'Saját alcím: neved.epitek.hu',
      'Galéria, szolgáltatások, elérhetőség',
      'Beérkező ajánlatkérések közvetlenül a telefonodra',
    ],
    collectiveBullet: 'Közös csapatoldal: a cégetek egységes arculattal jelenik meg',
    Preview: WebsitePreview,
    imageFirst: false,
  },
  {
    id: 'portal',
    overline: '05 · Ügyfélportál',
    title: 'Az ügyfeled mindig képben van, és nem zavarnak folyton',
    desc: 'Nincs több "Hol tart a munkával?" telefonhívás. Az ügyfeled saját portálon követi a projektet, jóváhagyja az ajánlatot, látja a fotókat és a fizetési tervet.',
    bullets: [
      'Valós idejű projekt státusz az ügyfélnek',
      'Ajánlat elfogadás és fizetési mérföldkövek',
      'Naplóbejegyzések és fotók megosztása',
    ],
    collectiveBullet: 'Az ügyfél látja az összes résztvevőt és azok munkáját',
    Preview: ClientPortalPreview,
    imageFirst: true,
    comingSoon: true,
  },
];

// ─── Single feature row ───────────────────────────────────────────────────────
function FeatureRow({ feature, isCollective, onRegister }) {
  const { Preview, imageFirst, overline, title, desc, bullets, collectiveBullet, comingSoon } = feature;

  const previewCol = (
    <div className="feature-preview-col" style={{ position: 'relative', display: 'flex', justifyContent: imageFirst ? 'flex-start' : 'flex-end' }}>
      <Preview />
      <CollectiveHeads show={isCollective} />
    </div>
  );

  const textCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
      <div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.6rem' }}>{overline}</span>
        <h3 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
          {title}
        </h3>
        {comingSoon && (
          <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.68rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.15rem 0.6rem', borderRadius: 999 }}>Hamarosan</span>
        )}
      </div>

      <p style={{ fontSize: '0.9rem', color: T.textSecondary, lineHeight: 1.7, margin: 0 }}>{desc}</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {bullets.map(b => (
          <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: T.textPrimary, fontWeight: 600 }}>
            <Check size={15} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} /> {b}
          </li>
        ))}
        {isCollective && collectiveBullet && (
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: T.purple, fontWeight: 600, padding: '0.5rem 0.75rem', background: T.purpleLight, borderRadius: 8, border: '1px solid #ddd6fe' }}>
            <Users size={15} color={T.purple} style={{ flexShrink: 0, marginTop: 2 }} /> {collectiveBullet}
          </li>
        )}
      </ul>

      <div className="feature-row-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
        <button
          onClick={onRegister}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', background: T.accent, color: '#fff', fontWeight: 700, fontSize: '0.875rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: T.font }}
        >
          Regisztráció <ArrowRight size={15} />
        </button>
        <a
          href="/demo"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', background: T.bgSubtle, color: T.textSecondary, fontWeight: 700, fontSize: '0.875rem', borderRadius: 10, border: `1px solid ${T.border}`, textDecoration: 'none', fontFamily: T.font }}
        >
          Demo megtekintése
        </a>
      </div>
    </div>
  );

  return (
    <div className="feature-showcase-row" style={{ display: 'grid', gap: '3rem', alignItems: 'center', padding: '4rem 0', borderBottom: `1px solid ${T.border}` }}>
      {imageFirst ? previewCol : textCol}
      {imageFirst ? textCol : previewCol}
    </div>
  );
}

// ─── Workspace explainer cards ────────────────────────────────────────────────
function WorkspaceCards({ isCollective, onToggle }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
      {[
        {
          key: 'personal',
          icon: User,
          iconBg: T.accentLight,
          iconColor: T.accent,
          title: 'Személyes munkaterület',
          desc: 'A saját projektjeid, ajánlataid és ügyfeleid. Teljesen privát, csak te látod. Ideális egyéni kivitelezőknek.',
          active: !isCollective,
        },
        {
          key: 'collective',
          icon: Users,
          iconBg: T.purpleLight,
          iconColor: T.purple,
          title: 'Kollektív munkaterület',
          desc: 'Közös projektek alvállalkozókkal. Megosztott felmérések, ajánlatok, elszámolás. Ideális csapatoknak és több szakembert összefogó vállalkozásoknak.',
          active: isCollective,
        },
      ].map(({ key, icon: Icon, iconBg, iconColor, title, desc, active }) => (
        <div
          key={key}
          onClick={() => onToggle(key === 'collective')}
          style={{
            background: T.bgCard,
            border: `2px solid ${active ? iconColor : T.border}`,
            borderRadius: 16, padding: '1.25rem 1.5rem',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem',
            boxShadow: active ? `0 4px 20px ${iconColor}22` : '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.18s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={iconColor} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: T.textPrimary, fontFamily: T.font }}>{title}</span>
              {active && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: iconColor, color: '#fff', padding: '1px 7px', borderRadius: 999 }}>Aktív</span>}
            </div>
          </div>
          <p style={{ fontSize: '0.825rem', color: T.textSecondary, lineHeight: 1.6, margin: 0, fontFamily: T.font }}>{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FeatureShowcase({ onRegister }) {
  const [isCollective, setIsCollective] = useState(false);

  return (
    <section className="feature-section" style={{ padding: '4rem 0', borderBottom: `1px solid ${T.border}` }}>
      <style>{`
        .feature-showcase-row { grid-template-columns: 1fr 1fr; }
        @media (max-width: 900px) {
          .feature-showcase-row { grid-template-columns: 1fr !important; }
          .feature-showcase-row > *:first-child { order: 1; }
          .feature-showcase-row > *:last-child  { order: 2; }
        }
        @media (max-width: 639px) {
          .feature-section       { padding: 2.5rem 0 !important; }
          .feature-showcase-row  { padding: 2rem 0 !important; gap: 1.5rem !important; }
          .feature-preview-col   { display: flex !important; justify-content: flex-start !important; }
          .feature-row-btns a,
          .feature-row-btns button { width: 100% !important; justify-content: center; box-sizing: border-box; }
          .feature-row-btns       { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 1.25rem' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.75rem', borderRadius: 999, background: T.accentLight, border: `1px solid ${T.accentBorder}`, color: T.accent, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Hogyan működik?
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.03em', margin: '0 0 0.5rem', fontFamily: T.font }}>
            Kétféle munkaterület, egy alkalmazás
          </h2>
          <p style={{ color: T.textSecondary, fontSize: '0.9rem', maxWidth: 520, margin: '0 auto', fontFamily: T.font }}>
            Válaszd ki, melyik nézetet szeretnéd látni, és fedezd fel a funkciókat.
          </p>
        </div>

        {/* Workspace toggle cards */}
        <WorkspaceCards isCollective={isCollective} onToggle={setIsCollective} />

        {/* Feature rows */}
        {FEATURES.map(f => (
          <FeatureRow key={f.id} feature={f} isCollective={isCollective} onRegister={onRegister} />
        ))}
      </div>
    </section>
  );
}
