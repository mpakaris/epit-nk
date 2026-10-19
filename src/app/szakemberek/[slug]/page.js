'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Phone, Mail, Award, ChevronDown, ChevronUp, Star, Loader2, CheckCircle2, AlertCircle, ArrowRight, Eye, X as XIcon, Play, ExternalLink } from 'lucide-react';

const TikTokIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const InstagramIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const WhatsAppIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163C.786 16.013.25 14.017.25 12 .25 5.634 5.384.5 11.75.5S23.25 5.634 23.25 12s-5.134 11.5-11.5 11.5c-1.95 0-3.81-.493-5.47-1.43L.057 24zm6.597-3.807c1.609.955 3.26 1.523 5.346 1.523 5.374 0 9.75-4.376 9.75-9.75S17.374 2.25 12 2.25 2.25 6.626 2.25 12c0 2.193.637 3.877 1.7 5.47l-.97 3.544 3.674-.821zm10.557-5.048c-.075-.124-.272-.198-.57-.347l-1.742-.857c-.297-.149-.471-.149-.669.15l-.694.996c-.124.173-.297.198-.545.074-1.28-.64-2.126-1.137-2.985-2.577-.223-.374-.05-.571.173-.793l.496-.57c.124-.149.174-.298.025-.521l-.793-1.963c-.223-.546-.47-.446-.669-.446h-.57c-.198 0-.52.074-.793.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074l.025.05c.124.173 1.737 2.747 4.386 3.846.594.248 1.082.397 1.462.521.62.173 1.189.148 1.636.074.496-.074 1.537-.62 1.761-1.24.223-.62.223-1.14.148-1.263z"/>
  </svg>
);

const ViberIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.984 0C5.673 0 .5 4.925.5 11c0 3.27 1.47 6.23 3.813 8.323V22.5l3.266-1.798A12.02 12.02 0 0011.984 22c6.311 0 11.516-4.925 11.516-11S18.295 0 11.984 0zm.016 2c5.238 0 9.5 3.996 9.5 9s-4.262 9-9.5 9c-1.5 0-2.92-.342-4.18-.95l-2.32 1.277v-2.412A8.956 8.956 0 012.5 11C2.5 5.996 6.762 2 12 2zm2.938 5.426c-.174-.043-1.047.207-2.344 1.498-.677.675-1.276 1.475-1.729 2.226-.284.47-.432.872-.397 1.148.044.348.41.798 1.05 1.46.395.41.64.604.864.645.113.02.25-.025.442-.215.193-.19.394-.417.57-.64.174-.22.32-.432.432-.614.146-.237.13-.466-.024-.672-.154-.205-.538-.596-.95-.893-.414-.297-.56-.358-.688-.264a17.94 17.94 0 01-.16.137c-.237.2-.458.256-.658.037-.199-.22-.518-.662-.837-1.143-.318-.481-.59-1.006-.75-1.392-.13-.315-.054-.527.193-.657l.196-.103c.224-.117.427-.32.315-.655-.11-.335-.566-1.24-.748-1.464a.606.606 0 00-.407-.24zm-3.125.574c.12 0 .237.014.35.04l.004.002a6.174 6.174 0 014.734 7.354 6.174 6.174 0 01-6.006 4.78c-.67 0-1.337-.107-1.98-.325l-.034-.012a6.132 6.132 0 01-3.853-3.814 6.166 6.166 0 01.54-5.128A6.179 6.179 0 0111.813 8zm0 1.25a4.932 4.932 0 00-4.195 2.37 4.915 4.915 0 00-.43 4.1 4.882 4.882 0 003.07 3.048l.026.01a4.912 4.912 0 005.33-1.472 4.928 4.928 0 001.06-3.18 4.928 4.928 0 00-4.86-4.876z"/>
  </svg>
);
import { useSearchParams } from 'next/navigation';
import { resolveTheme } from '@/lib/websiteThemes';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => null });

// ---- helpers ----------------------------------------------------------------

function formatHunPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let num = digits;
  if (num.startsWith('36')) num = num.slice(2);
  else if (num.startsWith('06')) num = num.slice(2);
  else if (num.startsWith('0')) num = num.slice(1);
  num = num.slice(0, 9);
  let out = '+36';
  if (num.length >= 1) out += ' ' + num.slice(0, 2);
  if (num.length >= 3) out += ' ' + num.slice(2, 5);
  if (num.length >= 6) out += ' ' + num.slice(5, 7);
  if (num.length >= 8) out += ' ' + num.slice(7, 9);
  return out;
}

function getInitials(name) {
  return (name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function contrastFor(rgbString) {
  const [r, g, b] = (rgbString || '249,115,22').split(',').map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '');
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

// ---- default tokens (overridden by theme at render time) --------------------

const C = {
  dark:    '#0a0f1a',
  accent:  '#f97316',
  white:   '#ffffff',
  offWhite:'#f8fafc',
  slate:   '#f1f5f9',
  border:  '#e2e8f0',
  text:    '#0f172a',
  muted:   '#64748b',
  light:   '#94a3b8',
};

// ---- global CSS (mobile-first) ----------------------------------------------
// T() — read a themed color, falls back to C defaults when no theme applied
function makeThemeCss(scheme, typo) {
  return `
    :root {
      --sp-hero:    ${scheme.hero};
      --sp-accent:  ${scheme.accent};
      --sp-acrgb:   ${scheme.accentRgb};
      --sp-light:   ${scheme.light};
      --sp-slate:   ${scheme.slate};
      --sp-border:  ${scheme.border};
      --sp-text:    ${scheme.text};
      --sp-muted:   ${scheme.muted};
      --sp-hfont:   ${typo.headingFont};
      --sp-bfont:   ${typo.bodyFont};
      --sp-hw:      ${typo.headingWeight};
      --sp-htrac:   ${typo.headingTracking};
      --sp-page-bg: ${scheme.darkHero ? '#060a12' : '#eef0f2'};
    }
  `;
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; background: var(--sp-page-bg, #eef0f2); }
  ::placeholder { color: #94a3b8; }
  input:focus, textarea:focus { outline: none; border-color: var(--sp-accent) !important; }

  .sp-page { font-family: var(--sp-bfont, 'Plus Jakarta Sans', sans-serif); color: var(--sp-text, #0f172a); }

  .sp-page { background: transparent; }
  .sp-section { padding: 4rem 1.25rem; margin: 1.25rem 0.75rem; border-radius: 15px; overflow: hidden; }
  @media (min-width: 1280px) { .sp-section { margin-left: 0; margin-right: 0; } }
  .sp-container { max-width: 680px; margin: 0 auto; width: 100%; }
  .sp-container--wide { max-width: 1000px; margin: 0 auto; width: 100%; }

  .sp-eyebrow {
    display: inline-block;
    font-size: clamp(0.7rem, 2vw, 1rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--sp-accent, #f97316);
    margin-bottom: 0.4rem;
  }
  .sp-h2 {
    font-family: var(--sp-hfont, 'Plus Jakarta Sans', sans-serif);
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    font-weight: var(--sp-hw, 800);
    letter-spacing: var(--sp-htrac, -0.02em);
    line-height: 1.15;
    color: var(--sp-text, #0f172a);
    margin: 0 0 1rem;
  }
  .sp-h2--light { color: #ffffff; }
  .sp-lead {
    font-size: 1.05rem;
    color: var(--sp-muted, #64748b);
    line-height: 1.8;
    margin: 0;
  }

  /* Services numbered list */
  .sp-service-item {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 0 1rem;
    align-items: start;
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--sp-border, #e2e8f0);
  }
  .sp-service-item:last-child { border-bottom: none; }
  .sp-service-num {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--sp-accent, #f97316);
    letter-spacing: 0.04em;
    padding-top: 0.15rem;
    opacity: 0.7;
  }

  /* Contact form inputs */
  .sp-input {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #f1f5f9;
    padding: 0.75rem 1rem;
    font-size: 0.925rem;
    font-family: inherit;
  }
  .sp-input::placeholder { color: #475569; }

  /* Gallery grid */
  .sp-gallery-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }
  @media (min-width: 640px) { .sp-gallery-grid { grid-template-columns: repeat(5, 1fr); gap: 0.5rem; } }

  /* Hero avatar ring */
  @keyframes ring-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.35); }
    50%       { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
  }
  @keyframes bounce-y {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%       { transform: translateX(-50%) translateY(7px); }
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* Mobile: about stacks vertically */
  .sp-about-2col { grid-template-columns: 1fr !important; }
  .sp-about-2col img { height: 260px !important; }

  /* Desktop tweaks */
  @media (min-width: 640px) {
    .sp-section { padding: 5.5rem 3rem; margin: 1.5rem 0.75rem; }
    .sp-service-item { grid-template-columns: 3rem 1fr; gap: 0 1.5rem; }
    .sp-about-2col { grid-template-columns: minmax(220px, 300px) 1fr !important; }
    .sp-about-2col img { height: 340px !important; }
    .sp-about-grid { display: grid; grid-template-columns: auto 1fr; gap: 2.5rem; align-items: start; }
    .sp-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start; }
    .sp-services-grid { columns: 2; column-gap: 0; }
    .sp-service-item { break-inside: avoid; }
  }
  @media (min-width: 900px) {
    .sp-services-grid { columns: 1; }
    .sp-services-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 3rem; }
  }
  .sp-pricing-grid { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
  @media (min-width: 640px) { .sp-pricing-grid-2 { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 640px) { .sp-pricing-grid-3 { grid-template-columns: repeat(3, 1fr); } }
  .sp-testimonials-grid { grid-template-columns: 1fr !important; }
  @media (min-width: 640px) { .sp-testimonials-grid { grid-template-columns: repeat(2, 1fr) !important; } }
  .sp-faq-grid { display: flex; flex-direction: column; gap: 0.5rem; }
  @media (min-width: 640px) { .sp-faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; align-items: start; } }
  .sp-certs-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  @media (min-width: 640px) { .sp-certs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; } }
`;

// ---- hero -------------------------------------------------------------------

function HeroSection({ content, website, aboutPhotoUrl, T }) {
  const hasBg    = !!content.hero_image_url;
  const hasPhoto = !!aboutPhotoUrl;
  // With a bg image: always dark overlay + white text (for readability)
  // Without a bg image: follow the scheme's darkHero setting
  const isDark   = hasBg || T?.darkHero !== false;
  const accent   = T?.accent    || C.accent;
  const accentRgb= T?.accentRgb || '249,115,22';
  const heroColor= T?.hero      || C.dark;

  const nameColor     = isDark ? '#ffffff'               : (T?.text  || C.text);
  const taglineColor  = isDark ? 'rgba(255,255,255,0.92)' : (T?.text  || C.text);
  const subtitleColor = isDark ? 'rgba(255,255,255,0.75)' : (T?.muted || C.muted);
  const scrollColor   = isDark ? 'rgba(255,255,255,0.3)'  : (T?.muted || C.muted);

  const bgStyle = hasBg
    ? `linear-gradient(to bottom right, rgba(10,15,26,0.55) 0%, rgba(10,15,26,0.78) 100%), url(${content.hero_image_url}) center/cover no-repeat`
    : heroColor;

  return (
    <section className="sp-section" style={{
      minHeight: 'clamp(440px, 65vh, 720px)',
      display: 'flex', alignItems: 'center',
      padding: '5rem 2.5rem',
      marginTop: 20,
      borderRadius: 15,
      position: 'relative', overflow: 'hidden',
      background: bgStyle,
    }}>
      {/* Orb glow (no bg image) */}
      {!hasBg && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 70% at 20% 50%, rgba(${accentRgb},${isDark ? '0.14' : '0.08'}) 0%, transparent 70%)`,
        }} />
      )}

      {/* Content — left-aligned in a max-width container */}
      <div style={{ maxWidth: 1060, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 620 }}>

              {/* Trade badge */}
          {website.trade?.name_hu && (
            <span style={{
              display: 'inline-block', marginBottom: '0.75rem',
              padding: '0.3rem 0.9rem', borderRadius: 99,
              background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)',
              fontSize: 'clamp(0.7rem, 2vw, 1rem)', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {website.trade.name_hu}
            </span>
          )}

          {/* Name */}
          <h1 style={{
            fontFamily: 'var(--sp-hfont)',
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 'var(--sp-hw, 900)',
            color: nameColor, margin: '0 0 0.75rem', lineHeight: 1.05,
            letterSpacing: 'var(--sp-htrac, -0.03em)',
          }}>
            {website.owner_name}
          </h1>

          {/* Tagline */}
          {content.tagline && (
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', color: taglineColor, fontWeight: 500,
              margin: '0 0 0.5rem', lineHeight: 1.55,
            }}>
              {content.tagline}
            </p>
          )}

          {/* Subtitle */}
          {content.subtitle && (
            <p style={{
              fontSize: '0.925rem', color: subtitleColor,
              margin: '0 0 2rem', lineHeight: 1.7,
            }}>
              {content.subtitle}
            </p>
          )}

          {!content.tagline && !content.subtitle && <div style={{ marginBottom: '2rem' }} />}

          {/* CTA */}
          <button
            type="button"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.75rem', borderRadius: 99,
              background: accent, color: contrastFor(accentRgb), border: 'none',
              fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 20px rgba(${accentRgb},0.35)`,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Kapcsolatba lépek <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', color: scrollColor, animation: 'bounce-y 2.5s ease-in-out infinite' }}>
        <ChevronDown size={18} />
      </div>
    </section>
  );
}

// ---- about ------------------------------------------------------------------

function AboutSection({ content, T }) {
  if (!content.text && !content.photo_url) return null;
  return (
    <section className="sp-section" style={{ background: T?.light || C.white }} id="rolam">
      <div className="sp-container--wide">
        <div style={{
          display: 'grid',
          gridTemplateColumns: content.photo_url ? 'minmax(220px, 300px) 1fr' : '1fr',
          gap: '3rem',
          alignItems: 'start',
        }}
          className="sp-about-2col"
        >
          {/* Left — image */}
          {content.photo_url && (
            <img
              src={content.photo_url} alt="Profilkép"
              style={{
                width: '100%', height: 340, borderRadius: 15,
                objectFit: 'cover', display: 'block',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              }}
            />
          )}

          {/* Right — all text */}
          <div>
            <span className="sp-eyebrow">Rólam</span>
            <h2 className="sp-h2">Bemutatkozom</h2>
            {content.text && (
              <p className="sp-lead" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{content.text}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- services ---------------------------------------------------------------

function ServicesSection({ content, T, isPremium }) {
  const all   = (content.items || []).filter(i => i.title);
  const items = isPremium ? all.slice(0, 8) : all.slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.slate || C.slate }} id="szolgaltatasok">
      <div className="sp-container--wide">
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="sp-eyebrow">Szolgáltatások</span>
          <h2 className="sp-h2">Mit vállalok</h2>
        </div>
        <div className="sp-services-cols">
          {items.map((item, i) => (
            <div key={i} className="sp-service-item">
              <span className="sp-service-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '1rem', color: T?.text || C.text, lineHeight: 1.3 }}>{item.title}</p>
                {item.description && <p style={{ margin: 0, fontSize: '0.875rem', color: T?.muted || C.muted, lineHeight: 1.65 }}>{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- certifications ---------------------------------------------------------

function CertificationsSection({ content, T }) {
  const items = (content.items || []).filter(i => i.title);
  if (!items.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.light || C.white }} id="kepesitesek">
      <div className="sp-container--wide">
        <span className="sp-eyebrow">Képesítések</span>
        <h2 className="sp-h2">Végzettségeim</h2>
        <div className="sp-certs-grid">
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
              padding: '1rem 1.25rem', borderRadius: 15,
              background: T?.slate || C.slate, border: `1px solid ${T?.border || C.border}`,
            }}>
              <Award size={18} style={{ color: T?.accent || C.accent, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: T?.text || C.text }}>{item.title}</p>
                {(item.issuer || item.year) && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: T?.muted || C.muted }}>
                    {[item.issuer, item.year].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- gallery ----------------------------------------------------------------

function GallerySection({ content, T }) {
  const items = (content.items || []).filter(i => i.url);
  if (!items.length) return null;
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (lightbox !== null) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [lightbox]);

  return (
    <section className="sp-section" style={{ background: T?.slate || C.slate, overflow: 'visible' }} id="galeria">
      <div className="sp-container--wide" style={{ marginBottom: '1.5rem' }}>
        <span className="sp-eyebrow">Galéria</span>
        <h2 className="sp-h2">Munkáim</h2>
      </div>

      <div className="sp-container--wide">
        {(() => {
          const images = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type !== 'video');
          const videos = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type === 'video');
          const renderThumb = (item) => (
            <button key={item._i} type="button" onClick={() => setLightbox(item._i)} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%' }}>
              {item.type === 'video' ? (
                <video src={item.url} muted preload="metadata" playsInline style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
              ) : (
                <img src={item.url} alt={item.caption || ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} loading="lazy" />
              )}
              {item.type === 'video' && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                  <Play size={22} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                </span>
              )}
              {item.caption && (
                <p style={{ position: 'absolute', bottom: 0, left: 0, right: 0, margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', textAlign: 'left' }}>{item.caption}</p>
              )}
            </button>
          );
          return (
            <>
              {images.length > 0 && <div className="sp-gallery-grid">{images.map(renderThumb)}</div>}
              {images.length > 0 && videos.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: T?.border || C.border }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T?.muted || C.muted }}>Videók</span>
                  <div style={{ flex: 1, height: 1, background: T?.border || C.border }} />
                </div>
              )}
              {videos.length > 0 && <div className="sp-gallery-grid">{videos.map(renderThumb)}</div>}
            </>
          );
        })()}
      </div>

      {lightbox !== null && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <button type="button" onClick={e => { e.stopPropagation(); setLightbox(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XIcon size={18} />
          </button>
          {lightbox > 0 && (
            <button type="button" onClick={e => { e.stopPropagation(); setLightbox(l => l - 1); }} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          )}
          {lightbox < items.length - 1 && (
            <button type="button" onClick={e => { e.stopPropagation(); setLightbox(l => l + 1); }} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          )}
          {items[lightbox].type === 'video' ? (
            <video key={items[lightbox].url} src={items[lightbox].url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '85vh', borderRadius: 8, display: 'block', cursor: 'default' }} />
          ) : (
            <img src={items[lightbox].url} alt={items[lightbox].caption || ''} onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, display: 'block', cursor: 'default' }} />
          )}
          {items[lightbox].caption && (
            <p style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0, padding: '0 2rem' }}>{items[lightbox].caption}</p>
          )}
        </div>
      )}
    </section>
  );
}

// ---- pricing ----------------------------------------------------------------

function normalisePricingCards(content) {
  const raw = content.items || [];
  return raw.map(item =>
    item.entries !== undefined
      ? item
      : { title: item.service || '', vat: 'gross', entries: item.price ? [{ label: item.note || '', price: item.price, unit: item.unit || 'm²' }] : [] }
  ).filter(c => c.title || c.entries?.length);
}

function PricingSection({ content, T }) {
  const cards = normalisePricingCards(content);
  if (!cards.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.light || C.white }} id="arak">
      <div className="sp-container--wide">
        <span className="sp-eyebrow">Áraink</span>
        <h2 className="sp-h2">Díjszabás</h2>
        <div className="sp-pricing-grid sp-pricing-grid-3">
          {cards.map((card, i) => (
            <div key={i} style={{ background: T?.slate || C.slate, border: `1px solid ${T?.border || C.border}`, borderRadius: 15, padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: T?.text || C.text }}>{card.title}</p>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0, background: card.vat === 'net' ? 'rgba(14,165,233,0.12)' : 'rgba(22,163,74,0.12)', color: card.vat === 'net' ? '#0284c7' : '#16a34a', border: `1px solid ${card.vat === 'net' ? 'rgba(14,165,233,0.3)' : 'rgba(22,163,74,0.3)'}` }}>
                  {card.vat === 'net' ? 'Nettó' : 'Bruttó'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(card.entries || []).filter(e => e.label || e.price).map((entry, j, arr) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: j < arr.length - 1 ? `1px solid ${T?.border || C.border}` : 'none' }}>
                    <span style={{ fontSize: '0.875rem', color: T?.text || C.text }}>{entry.label}</span>
                    {entry.price && (
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: T?.text || C.text, whiteSpace: 'nowrap' }}>
                        {parseInt(entry.price).toLocaleString('hu-HU')} Ft
                        {entry.unit && entry.unit !== 'átalány' && <span style={{ fontSize: '0.7rem', fontWeight: 400, color: T?.muted || C.muted }}>/{entry.unit}</span>}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: T?.muted || C.muted }}>* Árak tájékoztató jellegűek.</p>
      </div>
    </section>
  );
}

// ---- testimonials -----------------------------------------------------------

function TestimonialsSection({ content, T }) {
  const items = (content.items || []).filter(i => i.text);
  if (!items.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.slate || C.slate }} id="velemenyek">
      <div className="sp-container--wide">
        <span className="sp-eyebrow">Vélemények</span>
        <h2 className="sp-h2">Mit mondanak rólam</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="sp-testimonials-grid">
          {items.map((item, i) => (
            <div key={i} style={{
              background: T?.light || C.white, borderRadius: 15,
              padding: '1.5rem', position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', gap: '0.15rem', marginBottom: '0.85rem' }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={13} style={{ color: T?.accent || C.accent, fill: T?.accent || C.accent }} />)}
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: T?.text || C.text, lineHeight: 1.75, fontStyle: 'italic' }}>
                "{item.text}"
              </p>
              {item.name && (
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: T?.muted || C.muted }}>— {item.name}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- faq --------------------------------------------------------------------

function FaqSection({ content, T }) {
  const items = (content.items || []).filter(i => i.question);
  const [open, setOpen] = useState(null);
  if (!items.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.light || C.white }} id="gyik">
      <div className="sp-container--wide">
        <span className="sp-eyebrow">GYIK</span>
        <h2 className="sp-h2">Gyakori kérdések</h2>
        <div className="sp-faq-grid">
          {items.map((item, i) => (
            <div key={i} style={{
              borderRadius: 15, overflow: 'hidden',
              border: `1px solid ${open === i ? (T?.accent || C.accent) : (T?.border || C.border)}`,
              transition: 'border-color 0.15s',
            }}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%',
                  background: open === i
                    ? `rgba(${T?.accentRgb || '249,115,22'}, 0.08)`
                    : (T?.light || C.white),
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem 1.25rem', gap: '0.75rem',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: T?.text || C.text }}>{item.question}</span>
                {open === i
                  ? <ChevronUp size={16} style={{ color: T?.accent || C.accent, flexShrink: 0 }} />
                  : <ChevronDown size={16} style={{ color: T?.muted || C.muted, flexShrink: 0 }} />}
              </button>
              {open === i && (
                <div style={{ padding: '0 1.25rem 1.1rem', borderTop: `1px solid ${T?.border || C.border}` }}>
                  <p style={{ margin: '0.8rem 0 0', fontSize: '0.9rem', color: T?.muted || C.muted, lineHeight: 1.75 }}>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- service area -----------------------------------------------------------

function ServiceAreaSection({ content, T }) {
  const { lat, lng, radius_km } = content;
  if (!lat || !lng) return null;
  return (
    <section className="sp-section" style={{ background: T?.slate || C.slate }} id="munkaterulet">
      <div className="sp-container--wide">
        <span className="sp-eyebrow">Munkaterület</span>
        <h2 className="sp-h2">Hol dolgozom</h2>
        <p style={{ margin: '0 0 1.5rem', color: T?.muted || C.muted, fontSize: '0.95rem', lineHeight: 1.7 }}>
          Körülbelül <strong style={{ color: T?.text || C.text }}>{radius_km} km</strong>-es körzetben vállalok munkát.
        </p>
        <div style={{ borderRadius: 15, overflow: 'hidden', border: `1px solid ${T?.border || C.border}` }}>
          <ServiceAreaMap lat={lat} lng={lng} radiusKm={radius_km} editable={false} height={320} />
        </div>
      </div>
    </section>
  );
}

// ---- contact ----------------------------------------------------------------

function ContactSection({ content, slug, T, isPremium, photoUrl }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Kérjük add meg a neved!'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setErr('Email cím vagy telefonszám megadása kötelező!'); return; }
    setSending(true); setErr('');
    try {
      const r = await fetch(`/api/szakemberek/${slug}/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); setErr(d.error || 'Hiba történt'); return; }
      setSent(true);
    } catch { setErr('Hálózati hiba, kérjük próbáld újra.'); }
    finally { setSending(false); }
  };

  // Contact section is always dark — use scheme's dark hero color,
  // or fall back to the scheme's text color (which is always dark) for light schemes
  const bg        = T?.darkHero !== false ? (T?.hero || C.dark) : (T?.text || C.dark);
  const accent    = T?.accent    || C.accent;
  const accentRgb = T?.accentRgb || '249,115,22';
  const iconColor = contrastFor(hexToRgb(bg));

  return (
    <section className="sp-section" style={{ background: bg }} id="contact">
      <div className="sp-container--wide">
        <div className="sp-contact-grid">
          {/* Info */}
          <div>
            <span className="sp-eyebrow" style={{ color: accent }}>Kapcsolat</span>

            {/* Photo + heading 2-col */}
            <div style={{ display: 'grid', gridTemplateColumns: photoUrl ? 'auto 1fr' : '1fr', gap: '1rem', alignItems: 'center', margin: '0.5rem 0 1rem' }}>
              {photoUrl && (
                <img src={photoUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', display: 'block', border: `3px solid rgba(${accentRgb},0.45)`, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', flexShrink: 0 }} />
              )}
              <h2 className="sp-h2" style={{ color: '#ffffff', fontFamily: 'var(--sp-hfont)', fontWeight: 'var(--sp-hw)', letterSpacing: 'var(--sp-htrac)', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', lineHeight: 1.15, margin: 0 }}>
                Dolgozzunk együtt
              </h2>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.75, margin: '0 0 2rem' }}>
              Szívesen válaszolok kérdéseidre és adok díjmentes tájékoztatót.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!isPremium && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                  Ezen az oldalon az Epitünk appon keresztül vehetsz fel kapcsolatot a szakemberrel.
                </p>
              )}
              {isPremium && content.phone && (
                <a href={`tel:${content.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={15} style={{ color: iconColor }} />
                  </span>
                  {content.phone}
                </a>
              )}
              {content.email && (
                <a href={`mailto:${content.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={15} style={{ color: iconColor }} />
                  </span>
                  {content.email}
                </a>
              )}
              {isPremium && content.whatsapp && (
                <a href={`https://wa.me/${content.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
                    <WhatsAppIcon size={16} />
                  </span>
                  WhatsApp
                </a>
              )}
              {isPremium && content.viber && (
                <a href={`viber://chat?number=${content.viber.replace(/[^0-9+]/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
                    <ViberIcon size={16} />
                  </span>
                  Viber
                </a>
              )}
              {isPremium && content.tiktok && (
                <a href={`https://www.tiktok.com/@${content.tiktok.replace(/^@/,'')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
                    <TikTokIcon size={16} />
                  </span>
                  TikTok
                </a>
              )}
              {isPremium && content.instagram && (
                <a href={`https://www.instagram.com/${content.instagram.replace(/^@/,'')}/`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
                    <InstagramIcon size={16} />
                  </span>
                  Instagram
                </a>
              )}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 15, padding: '1.75rem', marginTop: '2rem' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <CheckCircle2 size={44} style={{ color: '#22c55e', marginBottom: '1rem' }} />
                <h3 style={{ color: '#ffffff', fontWeight: 700, margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Üzenet elküldve!</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.875rem' }}>Hamarosan felveszem veled a kapcsolatot.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { label: 'Neved *',      key: 'name',    type: 'text',  ph: 'Horváth Béla' },
                  { label: 'E-mail cím',   key: 'email',   type: 'email', ph: 'email@domain.hu' },
                  { label: 'Telefonszám',  key: 'phone',   type: 'tel',   ph: '+36 70 123 45 67' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem', letterSpacing: '0.03em' }}>{f.label}</label>
                    <input className="sp-input" type={f.type} value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      onBlur={f.type === 'tel' ? e => setForm(p => ({ ...p, phone: formatHunPhone(e.target.value) })) : undefined}
                      placeholder={f.ph} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem', letterSpacing: '0.03em' }}>Üzenet</label>
                  <textarea className="sp-input" rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Miben segíthetek?" style={{ resize: 'none' }} />
                </div>
                {err && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <AlertCircle size={13} /> {err}
                  </p>
                )}
                <button type="submit" disabled={sending} style={{
                  padding: '0.875rem', borderRadius: 12, background: accent,
                  color: contrastFor(accentRgb), border: 'none', fontSize: '0.95rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: sending ? 0.7 : 1,
                }}>
                  {sending ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Küldés…</> : <>Üzenet küldése <ArrowRight size={15} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- banner -----------------------------------------------------------------

function BannerSection({ content }) {
  if (!content.image_url) return null;
  return (
    <div className="sp-section" style={{ padding: 0, overflow: 'hidden' }}>
      <img
        src={content.image_url}
        alt={content.alt_text || ''}
        style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />
    </div>
  );
}

// ---- footer -----------------------------------------------------------------

function Footer({ name, trade }) {
  return (
    <footer className="sp-section" style={{ background: '#000000', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 1.25rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
        {name}{trade ? ` · ${trade}` : ''}
      </p>
      <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
        Epitünk szakember oldal ·{' '}
        <a href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Légy te is szakember az Epitünkön</a>
      </p>
    </footer>
  );
}

// ---- section router ---------------------------------------------------------

function renderSection(section, website, aboutPhotoUrl, scheme, isPremium) {
  const c = section.content || {};
  const T = scheme;
  switch (section.section_type) {
    case 'hero':           return <HeroSection key="hero" content={c} website={website} aboutPhotoUrl={aboutPhotoUrl} T={T} />;
    case 'about':          return <AboutSection key="about" content={c} T={T} />;
    case 'services':       return <ServicesSection key="services" content={c} T={T} isPremium={isPremium} />;
    case 'certifications': return <CertificationsSection key="certifications" content={c} T={T} />;
    case 'gallery':        return <GallerySection key="gallery" content={c} T={T} />;
    case 'banner':         return <BannerSection key="banner" content={c} />;
    case 'pricing':        return <PricingSection key="pricing" content={c} T={T} />;
    case 'testimonials':   return <TestimonialsSection key="testimonials" content={c} T={T} />;
    case 'faq':            return <FaqSection key="faq" content={c} T={T} />;
    case 'service_area':   return <ServiceAreaSection key="service_area" content={c} T={T} />;
    case 'contact':        return <ContactSection key="contact" content={c} slug={website.slug} T={T} isPremium={isPremium} photoUrl={aboutPhotoUrl} />;
    default:               return null;
  }
}

// ---- page -------------------------------------------------------------------

export default function SzakemberPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug;
  const isPreview = searchParams?.get('preview') === '1';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/szakemberek/${slug}${isPreview ? '?preview=1' : ''}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return; }
        const apiData = await r.json();
        // For the demo slug, overlay any editor changes saved in localStorage
        if (slug === 'nemes-peter-felujito') {
          try {
            const raw = localStorage.getItem('epitek_demo_website_builder');
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved.sections) {
                // Merge: keep API photo_url if localStorage section doesn't have one
                apiData.sections = saved.sections.map(lsSection => {
                  const apiSection = apiData.sections?.find(s => s.section_type === lsSection.section_type);
                  if (apiSection?.content?.photo_url && !lsSection.content?.photo_url) {
                    return { ...lsSection, content: { ...lsSection.content, photo_url: apiSection.content.photo_url } };
                  }
                  return lsSection;
                });
              }
              if (saved.theme) apiData.website = { ...apiData.website, theme: saved.theme };
            }
          } catch {}
        }
        setData(apiData);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const _pageBgForEffect = data?.website ? (resolveTheme(data.website.theme).scheme.darkHero ? '#060a12' : '#eef0f2') : null;
  useEffect(() => {
    if (!_pageBgForEffect) return;
    document.body.style.background = _pageBgForEffect;
    document.documentElement.style.background = _pageBgForEffect;
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, [_pageBgForEffect]);

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <Loader2 size={28} style={{ color: '#1e293b', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound || !data || !data.website) return (
    <div style={{ position: 'fixed', inset: 0, background: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, color: C.white }}>
      <p style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', fontWeight: 900, color: '#1e293b' }}>404</p>
      <p style={{ color: '#334155', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>Ez az oldal nem található</p>
      <a href="/" style={{ color: C.accent, fontSize: '0.875rem', textDecoration: 'none' }}>← Vissza a főoldalra</a>
    </div>
  );

  const { website, sections } = data;
  const { scheme, typo } = resolveTheme(website.theme);
  const isPremium = website.is_premium || false;
  const pageBg = scheme.darkHero ? '#060a12' : '#eef0f2';
  const aboutSection = sections.find(s => s.section_type === 'about');
  const aboutPhotoUrl = aboutSection?.content?.photo_url || null;
  const heroSection = sections.find(s => s.section_type === 'hero');
  const contactSection = sections.find(s => s.section_type === 'contact');
  const middleSections = sections.filter(s => s.section_type !== 'hero' && s.section_type !== 'contact' && s.section_type !== 'banner');
  const banners = (website.theme?.banners || []).filter(b => b?.image_url);
  const b1pos = banners.length >= 2 ? 2 : 1; // after 3rd section (premium) or 2nd section (free)

  return (
    <>
      {typo.fontUrl && <link rel="stylesheet" href={typo.fontUrl} />}
      <style>{makeThemeCss(scheme, typo)}{GLOBAL_CSS}</style>

      {/* Preview banner */}
      {isPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#1e293b', color: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1rem', gap: '0.75rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.825rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ color: '#94a3b8' }}>Előnézet</span>
            <span style={{ color: '#334155' }}>·</span>
            <span style={{ color: website.status === 'published' ? '#22c55e' : '#f97316' }}>
              {website.status === 'published' ? 'Az oldal élő' : 'Az oldal nincs közzétéve'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {website.status !== 'published' && (
              <a
                href="/weboldalam"
                style={{ padding: '0.3rem 0.75rem', borderRadius: 99, background: '#f97316', color: 'white', textDecoration: 'none', fontSize: '0.775rem', fontWeight: 700 }}
              >
                Közzétesz
              </a>
            )}
            <button
              type="button"
              onClick={() => window.close()}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', overflowX: 'hidden', paddingTop: isPreview ? 44 : 0, background: pageBg }} className="sp-page">
        {heroSection && renderSection(heroSection, website, aboutPhotoUrl, scheme, isPremium)}
        {middleSections.map((s, i) => (
          <React.Fragment key={s.section_type}>
            {renderSection(s, website, aboutPhotoUrl, scheme, isPremium)}
            {i === b1pos && banners[0] && (
              <div className="sp-section" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={banners[0].image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', display: 'block' }} loading="lazy" />
              </div>
            )}
            {i === 5 && banners[1] && (
              <div className="sp-section" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={banners[1].image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', display: 'block' }} loading="lazy" />
              </div>
            )}
          </React.Fragment>
        ))}
        {contactSection && renderSection(contactSection, website, aboutPhotoUrl, scheme, isPremium)}
        <Footer name={website.owner_name} trade={website.trade?.name_hu} />
      </div>
    </>
  );
}
