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
  Check, ArrowRight, Users,
  Ruler, Camera, Home, Plus, FileText,
  Globe, Share2, Clock, CheckCircle2,
  ClipboardList, FolderKanban, TrendingUp,
  Hammer, ChevronRight,
} from 'lucide-react';
import ProjectsListPreview from './ProjectsListPreview';
import { LANDING_I18N } from '@/lib/landingI18n';

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
function SurveyPreview({ locale = 'hu' }) {
  const P = (LANDING_I18N[locale] || LANDING_I18N.hu).preview.survey;
  return (
    <BrowserFrame url="okosszaki.hu/felmeresek/B-2024-12" innerHeight={520}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{P.label}</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>{P.title}</h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: T.accent, color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
          <Plus size={12} /> {P.addRoom}
        </div>
      </div>

      {/* Rooms grid */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start', overflowY: 'hidden' }}>
        {P.rooms.map((r) => (
          <div key={r.name} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={13} color={T.accent} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: T.textPrimary }}>{r.name}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[`${r.size} m²`, `${r.h} m`, `${r.photos} ${P.photoSuffix}`].map((val) => (
                <span key={val} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 999, background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textSecondary }}>{val}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgCard, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600 }}>{P.summary}</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 8, background: T.successBg, color: T.successText, border: `1px solid ${T.successBorder}`, fontSize: '0.72rem', fontWeight: 700 }}>
          <FileText size={12} /> {P.genQuote}
        </div>
      </div>
    </BrowserFrame>
  );
}

// ─── Offer preview ───────────────────────────────────────────────────────────
function OfferPreview({ locale = 'hu' }) {
  const P = (LANDING_I18N[locale] || LANDING_I18N.hu).preview.offer;
  return (
    <BrowserFrame url="okosszaki.hu/ajanlatok/A-0047" innerHeight={560}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{P.label}</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>{P.title}</h1>
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
        {P.sections.map((sec) => (
          <div key={sec.name} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: T.bgSubtle, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: T.textPrimary }}>{sec.name}</span>
              <span style={{ fontSize: '0.7rem', fontFamily: T.mono, fontWeight: 700, color: T.successText, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '0.1rem 0.45rem', borderRadius: 999 }}>{fmt(parseInt(sec.subtotal.replace(' ', ''), 10))}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 68px 72px', gap: 0 }}>
              {P.colHeaders.map((h) => (
                <div key={h} style={{ padding: '4px 8px', fontSize: '0.6rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${T.border}` }}>{h}</div>
              ))}
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
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textSecondary }}>{P.netTotal}</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: T.accent, fontFamily: T.mono }}>391 400 Ft</span>
      </div>
    </BrowserFrame>
  );
}

// ─── Website preview (phone frame) ───────────────────────────────────────────
function WebsitePreview({ locale = 'hu' }) {
  const PHONE_W     = 280;
  const PHONE_H     = 520;
  const phoneScale  = usePreviewScale(PHONE_W, 1);
  const P = (LANDING_I18N[locale] || LANDING_I18N.hu).preview.website;
  const services = P.services;

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
          <span style={{ fontSize: 9, color: T.textMuted, fontFamily: T.mono }}>nemes-renovalo.okosszaki.hu</span>
        </div>
      </div>

      {/* Website body */}
      <div style={{ flex: 1, overflowY: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Hero strip */}
        <div style={{ width: '100%', background: T.navy, padding: '16px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>NR</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>Nemes Renováló Kft.</div>
            <div style={{ fontSize: '0.62rem', color: T.textLight, marginTop: 2 }}>{P.credential}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {['⭐ 4.9','32 projekt'].map(b => (
              <span key={b} style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 7px', borderRadius: 999 }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Services */}
        <div style={{ width: '100%', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, marginBottom: 6 }}>{P.servicesLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
            {services.map(s => (
              <div key={s} style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 6px', fontSize: '0.58rem', fontWeight: 600, color: T.textPrimary, textAlign: 'center' }}>{s}</div>
            ))}
          </div>
        </div>

        {/* Photo strip */}
        <div style={{ width: '100%', padding: '0 12px 10px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, marginBottom: 6 }}>{P.refsLabel}</div>
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
            {P.cta} <ChevronRight size={13} />
          </div>
        </div>
      </div>
      </div>{/* end scale wrapper */}
    </div>
  );
}

// ─── Client portal preview ───────────────────────────────────────────────────
function ClientPortalPreview({ locale = 'hu' }) {
  const P = (LANDING_I18N[locale] || LANDING_I18N.hu).preview.portal;
  return (
    <BrowserFrame url="okosszaki.hu/portal/bakos-villa" innerHeight={520}>
      {/* Top bar */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{P.label}</div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: T.textPrimary, margin: 0 }}>{P.title}</h1>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>{P.status}</span>
      </div>

      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'hidden' }}>
        {/* Progress */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.85rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textMuted, marginBottom: 10 }}>{P.projectStatus}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {P.timeline.map((step, i) => {
              const isActive = step.active;
              const isDone   = step.done;
              const color = isDone ? T.successText : isActive ? T.accent : T.textLight;
              const bg    = isDone ? T.successBg   : isActive ? T.accentLight : T.bgSubtle;
              const Icon  = isDone ? CheckCircle2 : Clock;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={12} color={color} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: isDone || isActive ? 700 : 500, color }}>{step.label}</span>
                  {isActive && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: T.accent, color: '#fff', padding: '1px 6px', borderRadius: 999, marginLeft: 'auto' }}>{P.activePill}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo strip */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textMuted, marginBottom: 8 }}>{P.recentPhotos}</div>
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

// Static (non-translated) parts per feature slot
const FEATURE_STATICS = [
  { id: 'survey',   Preview: SurveyPreview,              imageFirst: true,  demoHref: '/demo/felmeresek' },
  { id: 'offer',    Preview: OfferPreview,               imageFirst: false, demoHref: '/demo/ajanlatok'  },
  { id: 'projects', Preview: ProjectsListPreview,          imageFirst: true, demoHref: '/demo/projektek' },
  { id: 'website',  Preview: WebsitePreview,             imageFirst: false, demoHref: '/demo/weboldalam' },
  { id: 'portal',   Preview: ClientPortalPreview,        imageFirst: true,  demoHref: '/portal' },
];

// ─── Single feature row ───────────────────────────────────────────────────────
function FeatureRow({ staticData, i18nItem, comingSoonLabel, registerBtn, demoBtn, onRegister, locale }) {
  const { Preview, imageFirst, demoHref } = staticData;
  const { overline, title, desc, bullets, collectiveBullet } = i18nItem;

  const previewCol = (
    <div className="feature-preview-col" style={{ display: 'flex', justifyContent: imageFirst ? 'flex-start' : 'flex-end' }}>
      <Preview locale={locale} />
    </div>
  );

  const textCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
      <div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.6rem' }}>{overline}</span>
        <h3 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
          {title}
        </h3>
        {staticData.comingSoon && (
          <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.68rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.15rem 0.6rem', borderRadius: 999 }}>{comingSoonLabel}</span>
        )}
      </div>

      <p style={{ fontSize: '0.9rem', color: T.textSecondary, lineHeight: 1.7, margin: 0 }}>{desc}</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {bullets.map(b => (
          <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: T.textPrimary, fontWeight: 600 }}>
            <Check size={15} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} /> {b}
          </li>
        ))}
        {collectiveBullet && (
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: T.purple, fontWeight: 600, padding: '0.5rem 0.75rem', background: T.purpleLight, borderRadius: 8, border: '1px solid #ddd6fe', marginTop: '0.25rem' }}>
            <Users size={15} color={T.purple} style={{ flexShrink: 0, marginTop: 2 }} /> {collectiveBullet}
          </li>
        )}
      </ul>

      <div className="feature-row-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
        <button
          onClick={onRegister}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', background: T.accent, color: '#fff', fontWeight: 700, fontSize: '0.875rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: T.font }}
        >
          {registerBtn} <ArrowRight size={15} />
        </button>
        <a
          href={demoHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', background: T.bgSubtle, color: T.textSecondary, fontWeight: 700, fontSize: '0.875rem', borderRadius: 10, border: `1px solid ${T.border}`, textDecoration: 'none', fontFamily: T.font }}
        >
          {demoBtn}
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

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FeatureShowcase({ onRegister, locale = 'hu' }) {
  const tf = (LANDING_I18N[locale] || LANDING_I18N.hu).features;

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
            {tf.sectionPill}
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.03em', margin: '0 0 0.5rem', fontFamily: T.font }}>
            {tf.sectionHeading}
          </h2>
          <p style={{ color: T.textSecondary, fontSize: '0.9rem', maxWidth: 540, margin: '0 auto', fontFamily: T.font }}>
            {tf.sectionSubtitle}
          </p>
        </div>

        {/* Feature rows */}
        {FEATURE_STATICS.map((staticData, i) => (
          <FeatureRow
            key={staticData.id}
            staticData={staticData}
            i18nItem={tf.items[i]}
            comingSoonLabel={tf.comingSoon}
            registerBtn={tf.registerBtn}
            demoBtn={tf.demoBtn}
            onRegister={onRegister}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
