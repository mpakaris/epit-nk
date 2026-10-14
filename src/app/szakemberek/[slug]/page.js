'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Phone, Mail, MessageCircle, Award, ChevronDown, ChevronUp, Star, Loader2, CheckCircle2, AlertCircle, ArrowRight, Eye, X as XIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { resolveTheme } from '@/lib/websiteThemes';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => null });

// ---- helpers ----------------------------------------------------------------

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
  @media (min-width: 640px) { .sp-section { margin-left: 0; margin-right: 0; } }
  .sp-container { max-width: 680px; margin: 0 auto; width: 100%; }
  .sp-container--wide { max-width: 1000px; margin: 0 auto; width: 100%; }

  .sp-eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--sp-accent, #f97316);
    margin-bottom: 0.75rem;
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
    border-bottom: 1px solid #e2e8f0;
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

  /* Gallery strip */
  .sp-gallery-strip {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 0.75rem;
    padding: 0 1.25rem 0.25rem;
  }
  .sp-gallery-strip::-webkit-scrollbar { display: none; }

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
    .sp-section { padding: 5.5rem 3rem; margin: 1.5rem 0; }
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
          background: `radial-gradient(ellipse 70% 70% at 20% 50%, rgba(${accentRgb},${dark ? '0.14' : '0.08'}) 0%, transparent 70%)`,
        }} />
      )}

      {/* Content — left-aligned in a max-width container */}
      <div style={{ maxWidth: 1060, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 620 }}>

              {/* Trade badge */}
          {website.trade?.name_hu && (
            <span style={{
              display: 'inline-block', marginBottom: '0.65rem',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: accent,
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

function ServicesSection({ content, T }) {
  const items = (content.items || []).filter(i => i.title);
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
                <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '1rem', color: C.text, lineHeight: 1.3 }}>{item.title}</p>
                {item.description && <p style={{ margin: 0, fontSize: '0.875rem', color: C.muted, lineHeight: 1.65 }}>{item.description}</p>}
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
      <div className="sp-container">
        <span className="sp-eyebrow">Képesítések</span>
        <h2 className="sp-h2">Végzettségeim</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
              padding: '1rem 1.25rem', borderRadius: 15,
              background: T?.slate || C.slate, border: `1px solid ${T?.border || C.border}`,
            }}>
              <Award size={18} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: C.text }}>{item.title}</p>
                {(item.issuer || item.year) && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: C.muted }}>
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
  return (
    <section className="sp-section" style={{ background: T?.slate || C.slate, paddingLeft: 0, paddingRight: 0 }} id="galeria">
      <div style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
        <span className="sp-eyebrow">Galéria</span>
        <h2 className="sp-h2">Munkáim</h2>
      </div>
      <div className="sp-gallery-strip">
        {items.map((item, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 'min(300px, 78vw)',
            borderRadius: 15, overflow: 'hidden',
            scrollSnapAlign: 'start',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <img src={item.url} alt={item.caption || `Kép ${i + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} loading="lazy" />
            {item.caption && (
              <p style={{ margin: 0, padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: T?.muted || C.muted, background: T?.light || C.white }}>{item.caption}</p>
            )}
          </div>
        ))}
        <div style={{ flexShrink: 0, width: '0.25rem' }} />
      </div>
    </section>
  );
}

// ---- pricing ----------------------------------------------------------------

function PricingSection({ content, T }) {
  const items = (content.items || []).filter(i => i.service);
  if (!items.length) return null;
  return (
    <section className="sp-section" style={{ background: T?.light || C.white }} id="arak">
      <div className="sp-container">
        <span className="sp-eyebrow">Áraink</span>
        <h2 className="sp-h2">Díjszabás</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: '1rem', flexWrap: 'wrap',
              padding: '1.1rem 1.25rem', borderRadius: 15,
              background: T?.slate || C.slate, border: `1px solid ${T?.border || C.border}`,
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: C.text }}>{item.service}</p>
                {item.note && <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: C.muted }}>{item.note}</p>}
              </div>
              {item.price && (
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: C.text, whiteSpace: 'nowrap' }}>
                  {parseInt(item.price).toLocaleString('hu-HU')} Ft
                  {item.unit && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: C.muted }}>/{item.unit}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: C.light }}>* Árak tájékoztató jellegűek.</p>
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
      <div className="sp-container">
        <span className="sp-eyebrow">Vélemények</span>
        <h2 className="sp-h2">Mit mondanak rólam</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              background: T?.light || C.white, borderRadius: 15,
              padding: '1.5rem', position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', gap: '0.15rem', marginBottom: '0.85rem' }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={13} style={{ color: C.accent, fill: C.accent }} />)}
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: C.text, lineHeight: 1.75, fontStyle: 'italic' }}>
                "{item.text}"
              </p>
              {item.name && (
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: C.muted }}>— {item.name}</p>
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
      <div className="sp-container">
        <span className="sp-eyebrow">GYIK</span>
        <h2 className="sp-h2">Gyakori kérdések</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              borderRadius: 15, overflow: 'hidden',
              border: `1px solid ${open === i ? C.accent : C.border}`,
              transition: 'border-color 0.15s',
            }}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', background: open === i ? '#fff7f0' : C.white,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem 1.25rem', gap: '0.75rem',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: C.text }}>{item.question}</span>
                {open === i
                  ? <ChevronUp size={16} style={{ color: C.accent, flexShrink: 0 }} />
                  : <ChevronDown size={16} style={{ color: C.muted, flexShrink: 0 }} />}
              </button>
              {open === i && (
                <div style={{ padding: '0 1.25rem 1.1rem', borderTop: `1px solid #f1e8e0` }}>
                  <p style={{ margin: '0.8rem 0 0', fontSize: '0.9rem', color: C.muted, lineHeight: 1.75 }}>{item.answer}</p>
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
      <div className="sp-container">
        <span className="sp-eyebrow">Munkaterület</span>
        <h2 className="sp-h2">Hol dolgozom</h2>
        <p style={{ margin: '0 0 1.5rem', color: C.muted, fontSize: '0.95rem', lineHeight: 1.7 }}>
          Körülbelül <strong style={{ color: C.text }}>{radius_km} km</strong>-es körzetben vállalok munkát.
        </p>
        <div style={{ borderRadius: 15, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <ServiceAreaMap lat={lat} lng={lng} radiusKm={radius_km} editable={false} height={320} />
        </div>
      </div>
    </section>
  );
}

// ---- contact ----------------------------------------------------------------

function ContactSection({ content, slug, T }) {
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
            <h2 className="sp-h2" style={{ color: '#ffffff', fontFamily: 'var(--sp-hfont)', fontWeight: 'var(--sp-hw)', letterSpacing: 'var(--sp-htrac)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: 1.15, margin: '0 0 1rem' }}>
              Lépj kapcsolatba velem
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.75, margin: '0 0 2rem' }}>
              Szívesen válaszolok kérdéseidre és adok díjmentes tájékoztatót.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {content.phone && (
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
              {content.whatsapp && (
                <a href={`https://wa.me/${content.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'rgba(255,255,255,0.88)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageCircle size={15} style={{ color: iconColor }} />
                  </span>
                  WhatsApp
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
                  { label: 'Telefonszám',  key: 'phone',   type: 'tel',   ph: '+36 70 123 4567' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem', letterSpacing: '0.03em' }}>{f.label}</label>
                    <input className="sp-input" type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} />
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
                  color: '#ffffff', border: 'none', fontSize: '0.95rem', fontWeight: 700,
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

// ---- footer -----------------------------------------------------------------

function Footer({ name, trade }) {
  return (
    <footer style={{ background: '#000000', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 1.25rem', textAlign: 'center' }}>
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

function renderSection(section, website, aboutPhotoUrl, scheme) {
  const c = section.content || {};
  const T = scheme; // shorthand — T.accent, T.light, T.slate etc.
  switch (section.section_type) {
    case 'hero':           return <HeroSection key="hero" content={c} website={website} aboutPhotoUrl={aboutPhotoUrl} T={T} />;
    case 'about':          return <AboutSection key="about" content={c} T={T} />;
    case 'services':       return <ServicesSection key="services" content={c} T={T} />;
    case 'certifications': return <CertificationsSection key="certifications" content={c} T={T} />;
    case 'gallery':        return <GallerySection key="gallery" content={c} T={T} />;
    case 'pricing':        return <PricingSection key="pricing" content={c} T={T} />;
    case 'testimonials':   return <TestimonialsSection key="testimonials" content={c} T={T} />;
    case 'faq':            return <FaqSection key="faq" content={c} T={T} />;
    case 'service_area':   return <ServiceAreaSection key="service_area" content={c} T={T} />;
    case 'contact':        return <ContactSection key="contact" content={c} slug={website.slug} T={T} />;
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
        setData(await r.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const _pageBgForEffect = data ? (resolveTheme(data.website.theme).scheme.darkHero ? '#060a12' : '#eef0f2') : null;
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

  if (notFound || !data) return (
    <div style={{ position: 'fixed', inset: 0, background: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, color: C.white }}>
      <p style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', fontWeight: 900, color: '#1e293b' }}>404</p>
      <p style={{ color: '#334155', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>Ez az oldal nem található</p>
      <a href="/" style={{ color: C.accent, fontSize: '0.875rem', textDecoration: 'none' }}>← Vissza a főoldalra</a>
    </div>
  );

  const { website, sections } = data;
  const { scheme, typo } = resolveTheme(website.theme);
  const pageBg = scheme.darkHero ? '#060a12' : '#eef0f2';
  const aboutSection = sections.find(s => s.section_type === 'about');
  const aboutPhotoUrl = aboutSection?.content?.photo_url || null;
  const heroSection = sections.find(s => s.section_type === 'hero');
  const contactSection = sections.find(s => s.section_type === 'contact');
  const middleSections = sections.filter(s => s.section_type !== 'hero' && s.section_type !== 'contact');

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
        {heroSection && renderSection(heroSection, website, aboutPhotoUrl, scheme)}
        {middleSections.map(s => renderSection(s, website, aboutPhotoUrl, scheme))}
        {contactSection && renderSection(contactSection, website, aboutPhotoUrl, scheme)}
        <Footer name={website.owner_name} trade={website.trade?.name_hu} />
      </div>
    </>
  );
}
