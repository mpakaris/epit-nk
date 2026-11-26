'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AuthModal from '@/components/AuthModal';
import CookieBanner from '@/components/CookieBanner';
import { useLandingLocale } from '@/hooks/useLandingLocale';
import { LANDING_I18N } from '@/lib/landingI18n';
import { Check, ArrowRight, Hammer, ChevronDown, Menu, X, Globe } from 'lucide-react';
import ProjectsListPreview from '@/components/preview/ProjectsListPreview';
import FeatureShowcase from '@/components/preview/FeatureShowcase';

const CSS = `
  .lp-root {
    position: fixed; inset: 0; overflow-y: auto;
    background: #f5f5f7; z-index: 9999;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    color: #1d1d1f; -webkit-font-smoothing: antialiased;
  }
  .lp-container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  @media(min-width:640px){ .lp-container { padding: 0 32px; } }

  /* ── Navbar ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    transition: background 0.35s ease, border-bottom-color 0.35s ease;
    border-bottom: 1px solid transparent;
  }
  .lp-nav.lp-scrolled {
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom-color: rgba(0,0,0,0.08);
  }
  .lp-nav-inner {
    height: 56px; display: flex; align-items: center;
    justify-content: space-between; gap: 24px;
  }
  .lp-logo {
    display: flex; align-items: center; gap: 8px; text-decoration: none;
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800; font-size: 1.1rem; letter-spacing: -0.03em;
    color: #fff; transition: color 0.35s ease;
  }
  .lp-nav.lp-scrolled .lp-logo { color: #1d1d1f; }
  .lp-logo-mark {
    width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: #1d1d1f; transition: background 0.35s ease;
  }
  .lp-nav.lp-scrolled .lp-logo-mark { background: #1d1d1f; }
  .lp-nav-links { display: flex; align-items: center; gap: 20px; }
  .lp-nav-link {
    font-size: 14px; font-weight: 600;
    color: rgba(255,255,255,0.72); text-decoration: none;
    transition: color 0.15s ease;
  }
  .lp-nav-link:hover { color: #fff; }
  .lp-nav.lp-scrolled .lp-nav-link { color: #6e6e73; }
  .lp-nav.lp-scrolled .lp-nav-link:hover { color: #1d1d1f; }

  /* ── Buttons ── */
  .lp-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 22px; border-radius: 980px; border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-weight: 700; font-size: 15px; white-space: nowrap; text-decoration: none;
    transition: transform 150ms cubic-bezier(0.25,1,0.5,1),
                background 150ms ease,
                box-shadow 150ms ease,
                border-color 150ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  .lp-btn:active { transform: scale(0.97); transition-duration: 80ms; }
  .lp-btn-sm { padding: 10px 18px; font-size: 14px; }
  .lp-btn-primary { background: #2563EB; color: #fff; }
  .lp-btn-primary:hover { background: #1d4ed8; box-shadow: 0 4px 18px rgba(37,99,235,0.35); }
  .lp-btn-ghost { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
  .lp-btn-ghost:hover { background: rgba(255,255,255,0.18); }
  .lp-btn-dark { background: #1d1d1f; color: #fff; }
  .lp-btn-dark:hover { background: #2d2d2f; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
  .lp-btn-outline { background: transparent; color: #1d1d1f; border: 1.5px solid rgba(0,0,0,0.14); }
  .lp-btn-outline:hover { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.22); }
  .lp-btn-login {
    background: none; border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-weight: 700; font-size: 14px;
    color: rgba(255,255,255,0.72);
    padding: 10px 14px; border-radius: 980px;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .lp-btn-login:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .lp-nav.lp-scrolled .lp-btn-login { color: #6e6e73; }
  .lp-nav.lp-scrolled .lp-btn-login:hover { color: #1d1d1f; background: rgba(0,0,0,0.05); }

  /* ── Lang switcher ── */
  .lp-lang { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: rgba(255,255,255,0.1); }
  .lp-nav.lp-scrolled .lp-lang { background: rgba(0,0,0,0.06); }
  .lp-lang-btn {
    padding: 4px 9px; border-radius: 7px; border: none; cursor: pointer;
    font-family: inherit; font-weight: 800; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.05em;
    transition: background 0.15s ease, color 0.15s ease;
  }

  /* ── Hero ── */
  .lp-hero {
    background: #000; padding: 96px 24px 112px;
    text-align: center; position: relative; overflow: hidden;
  }
  .lp-hero::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 80% 50% at 50% -5%,
      rgba(37,99,235,0.2) 0%, transparent 68%);
  }
  .lp-hero::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  }
  .lp-hero-content { position: relative; z-index: 1; }

  .lp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 980px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  }
  .lp-pill-dark { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.12); }
  .lp-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

  .lp-display {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800; font-size: clamp(2.4rem,7vw,4.25rem);
    letter-spacing: -0.04em; line-height: 1.0; color: #fff; margin: 0;
  }
  .lp-h2 {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700; font-size: clamp(1.6rem,3.5vw,2.25rem);
    letter-spacing: -0.03em; line-height: 1.1; color: #1d1d1f; margin: 0;
  }

  .lp-trust-row { display: flex; flex-wrap: wrap; gap: 14px 24px; justify-content: center; }
  .lp-trust-item { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.68); }

  .lp-cta-row { display: flex; align-items: center; gap: 12px; justify-content: center; flex-wrap: wrap; }
  @media(max-width:480px){
    .lp-cta-row { flex-direction: column; align-items: stretch; }
    .lp-cta-row .lp-btn { justify-content: center; }
  }

  .lp-hero-preview-wrap {
    max-width: 720px; margin: 64px auto 0;
    border-radius: 20px; overflow: hidden;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05);
  }

  /* ── Sections ── */
  .lp-section { padding: 80px 0; }
  .lp-section-sm { padding: 56px 0; }
  .lp-section-white { background: #fff; }
  .lp-section-gray  { background: #f5f5f7; }
  .lp-section-dark  { background: #1d1d1f; color: #fff; }
  .lp-section-black { background: #000; color: #fff; }
  .lp-section-header { text-align: center; margin-bottom: 52px; }
  @media(max-width:639px){ .lp-section { padding: 56px 0; } }

  /* ── Pricing ── */
  .lp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit,minmax(min(100%,300px),1fr));
    gap: 20px; max-width: 680px; margin: 0 auto;
  }
  .lp-price-card {
    background: #fff; border-radius: 24px; padding: 32px;
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    display: flex; flex-direction: column; gap: 24px; position: relative;
    transition: transform 220ms cubic-bezier(0.25,1,0.5,1), box-shadow 220ms ease;
  }
  .lp-price-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.1); }
  .lp-price-card.featured { border: 2px solid #2563EB; }
  .lp-price-featured-badge {
    position: absolute; top: -13px; right: 24px;
    background: #2563EB; color: #fff;
    font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 3px 12px; border-radius: 980px;
  }
  .lp-price-items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .lp-price-item { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; color: #6e6e73; font-weight: 500; }

  /* ── FAQ ── */
  .lp-faq-list { display: flex; flex-direction: column; gap: 8px; }
  .lp-faq-item {
    background: #fff; border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.08); overflow: hidden;
    transition: border-color 0.2s ease;
  }
  .lp-faq-item.open { border-color: rgba(37,99,235,0.3); }
  .lp-faq-trigger {
    width: 100%; padding: 20px 24px;
    text-align: left; display: flex; justify-content: space-between; align-items: center;
    background: none; border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-weight: 700; font-size: 15px; color: #1d1d1f; gap: 16px;
    transition: background 0.1s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .lp-faq-trigger:active { background: rgba(0,0,0,0.03); }
  .lp-faq-chevron { flex-shrink: 0; color: #86868b; transition: transform 0.28s cubic-bezier(0.25,1,0.5,1); }
  .lp-faq-chevron.open { transform: rotate(180deg); }
  .lp-faq-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s cubic-bezier(0.25,1,0.5,1); }
  .lp-faq-body.open { grid-template-rows: 1fr; }
  .lp-faq-body-inner { overflow: hidden; }
  .lp-faq-body-content {
    padding: 16px 24px 20px; font-size: 15px; color: #6e6e73; line-height: 1.65;
    border-top: 1px solid rgba(0,0,0,0.06);
  }

  /* ── Mobile sheet ── */
  .lp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.42); z-index: 10000;
    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
  }
  .lp-sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 10001;
    background: #fff; border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 48px rgba(0,0,0,0.2);
    animation: lp-sheet-up 0.32s cubic-bezier(0.32,1.1,0.6,1);
    padding-bottom: env(safe-area-inset-bottom);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    touch-action: none; will-change: transform;
  }
  @keyframes lp-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .lp-sheet-handle {
    width: 36px; height: 4px; border-radius: 2px; background: #d1d5db;
    margin: 12px auto 4px; cursor: grab; -webkit-tap-highlight-color: transparent;
  }

  /* ── Scroll reveal ── */
  .lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.65s ease, transform 0.65s cubic-bezier(0.25,1,0.5,1); }
  .lp-reveal.visible { opacity: 1; transform: none; }
  .lp-reveal-d1 { transition-delay: 0.08s; }
  .lp-reveal-d2 { transition-delay: 0.16s; }
  .lp-reveal-d3 { transition-delay: 0.24s; }

  /* ── Responsive utilities ── */
  @media(min-width:768px){ .lp-show-mobile { display: none !important; } }
  @media(max-width:767px){ .lp-hide-mobile { display: none !important; } }

  /* ── Reduced motion ── */
  @media(prefers-reduced-motion:reduce){
    .lp-btn, .lp-btn:active { transform: none !important; }
    .lp-btn { transition: background 0.15s ease, box-shadow 0.15s ease !important; }
    .lp-faq-body { transition: none !important; }
    .lp-faq-body-inner { overflow: visible; }
    .lp-faq-chevron { transition: none !important; }
    .lp-reveal, .lp-reveal.visible { opacity: 1 !important; transform: none !important; transition: none !important; }
    .lp-price-card, .lp-price-card:hover { transform: none !important; transition: none !important; }
    .lp-sheet { animation: none !important; }
    .lp-nav, .lp-logo, .lp-nav-link, .lp-btn-login { transition: none !important; }
  }

  /* ── Reduced transparency ── */
  @media(prefers-reduced-transparency:reduce){
    .lp-nav.lp-scrolled {
      background: rgba(255,255,255,0.98) !important;
      backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
    }
    .lp-overlay { background: rgba(0,0,0,0.65); backdrop-filter: none; -webkit-backdrop-filter: none; }
  }
`;

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useApp();
  const [locale, setLocale] = useLandingLocale();
  const T = LANDING_I18N[locale] || LANDING_I18N.hu;

  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const authViewRef = useRef('login');
  const openLogin    = () => { authViewRef.current = 'login';    setAuthOpen(true); };
  const openRegister = () => { authViewRef.current = 'register'; setAuthOpen(true); };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Drag-to-dismiss state
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (currentUser.must_change_password) router.replace('/change-password');
        else if (currentUser.role === 'superadmin') router.replace('/superadmin');
        else if (currentUser.role === 'admin') router.replace('/admin');
        else router.replace('/dashboard');
      } else {
        setShow(true);
      }
    }
  }, [currentUser, loading, router]);

  // Scroll-aware navbar
  useEffect(() => {
    if (!show) return;
    const root = document.querySelector('.lp-root');
    if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 72);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [show]);

  // Scroll-reveal
  useEffect(() => {
    if (!show) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [show]);

  if (!show) return null;

  // Mobile sheet drag handlers
  const onSheetPointerDown = (e) => {
    dragStartRef.current = { y: e.clientY, time: Date.now() };
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onSheetPointerMove = (e) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dy = e.clientY - dragStartRef.current.y;
    if (dy > 0) setDragY(dy);
  };
  const onSheetPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dy = dragY;
    const elapsed = Date.now() - (dragStartRef.current?.time ?? Date.now());
    const velocity = dy / Math.max(elapsed, 1); // px/ms
    dragStartRef.current = null;
    setDragY(0);
    if (dy > 100 || velocity > 0.5) setMobileMenuOpen(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-root">

        {/* ── NAVBAR ── */}
        <header className={`lp-nav${scrolled ? ' lp-scrolled' : ''}`}>
          <div className="lp-container">
            <div className="lp-nav-inner">

              {/* Logo */}
              <a href="/" className="lp-logo" style={{ gap: 8 }}>
                <div className="lp-logo-mark">
                  <Hammer size={16} color="#93c5fd" />
                </div>
                OkosSzaki
              </a>

              {/* Desktop nav */}
              <nav className="lp-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <a href="#features" className="lp-nav-link">{T.nav.features}</a>
                <a href="#pricing"  className="lp-nav-link">{T.nav.pricing}</a>
                <a href="#faq"      className="lp-nav-link">{T.nav.faq}</a>
                <a href="/about"    className="lp-nav-link" target="_blank" rel="noopener noreferrer">{T.nav.about}</a>
              </nav>

              {/* Desktop actions */}
              <div className="lp-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Lang */}
                <div className="lp-lang">
                  {['hu','de','en'].map(loc => {
                    const active = locale === loc;
                    const baseStyle = { background: active ? (scrolled ? '#fff' : 'rgba(255,255,255,0.18)') : 'transparent', color: active ? (scrolled ? '#1d1d1f' : '#fff') : (scrolled ? '#6e6e73' : 'rgba(255,255,255,0.6)'), boxShadow: active && scrolled ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' };
                    return (
                      <button key={loc} type="button" className="lp-lang-btn" style={baseStyle} onClick={() => setLocale(loc)}>
                        {loc}
                      </button>
                    );
                  })}
                </div>
                <button onClick={openLogin} className="lp-btn-login">{T.nav.login}</button>
                <button onClick={openRegister} className="lp-btn lp-btn-sm lp-btn-primary">{T.nav.register} <ArrowRight size={13} /></button>
              </div>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileMenuOpen(true)} className="lp-show-mobile"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: scrolled ? '#1d1d1f' : '#fff', display: 'flex' }}
                aria-label="Menü">
                <Menu size={22} />
              </button>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero-content">
            <div style={{ marginBottom: 24 }}>
              <span className="lp-pill lp-pill-dark"><Hammer size={11} /> {T.hero.pill}</span>
            </div>

            <h1 className="lp-display" style={{ maxWidth: 760, margin: '0 auto 24px' }}>
              {T.hero.headline}
            </h1>

            <p style={{ fontSize: 'clamp(1rem,1.8vw,1.1rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.68, margin: '0 auto 32px', maxWidth: 520, fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
              {T.hero.subtitle}
            </p>

            <div className="lp-trust-row" style={{ marginBottom: 32 }}>
              {[T.hero.trust1, T.hero.trust2, T.hero.trust3].map(item => (
                <span key={item} className="lp-trust-item">
                  <Check size={14} color="#60a5fa" /> {item}
                </span>
              ))}
            </div>

            <div className="lp-cta-row" style={{ marginBottom: 20 }}>
              <button onClick={openRegister} className="lp-btn lp-btn-primary">
                {T.hero.cta1} <ArrowRight size={15} />
              </button>
              <a href="/demo" target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-ghost">
                {T.hero.cta2}
              </a>
            </div>

            <a href="/pro/nemes-peter-felujito?preview=1" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.15s ease' }}
              onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <Globe size={12} /> {T.hero.websitePreview}
            </a>
          </div>

          {/* Product preview — desktop only */}
          <div className="lp-hero-preview-wrap lp-hide-mobile">
            <ProjectsListPreview locale={locale} />
          </div>
        </section>

        {/* ── FEATURES ── */}
        <div id="features">
          <FeatureShowcase onRegister={openRegister} locale={locale} />
        </div>

        {/* ── PRICING ── */}
        <section id="pricing" className="lp-section lp-section-gray">
          <div className="lp-container">
            <div className="lp-section-header lp-reveal">
              <span className="lp-pill lp-pill-blue" style={{ marginBottom: 16 }}>{T.pricing.pill}</span>
              <h2 className="lp-h2" style={{ marginBottom: 8 }}>{T.pricing.headline}</h2>
              <p style={{ color: '#6e6e73', fontSize: 15, margin: 0 }}>{T.pricing.subtitle}</p>
            </div>

            <div className="lp-pricing-grid">
              {/* Free */}
              <div className="lp-price-card lp-reveal lp-reveal-d1">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>{T.pricing.freeName}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#f5f5f7', color: '#6e6e73', padding: '3px 10px', borderRadius: 980 }}>{T.pricing.freeTag}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#86868b', margin: '0 0 20px' }}>{T.pricing.freeDesc}</p>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', fontFamily: "'Bricolage Grotesque',sans-serif", marginBottom: 20 }}>
                    {T.pricing.freePrice} <span style={{ fontSize: 14, fontWeight: 500, color: '#a1a1aa' }}>{T.pricing.perMonth}</span>
                  </div>
                  <ul className="lp-price-items">
                    {T.pricing.freeItems.map(f => (
                      <li key={f} className="lp-price-item"><Check size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} /> {f}</li>
                    ))}
                  </ul>
                </div>
                <button onClick={openRegister} className="lp-btn lp-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>{T.pricing.freeBtn}</button>
              </div>

              {/* Premium */}
              <div className="lp-price-card featured lp-reveal lp-reveal-d2">
                <div className="lp-price-featured-badge">{T.pricing.recommended}</div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>{T.pricing.premiumName}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 980 }}>{T.pricing.premiumTag}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#86868b', margin: '0 0 20px' }}>{T.pricing.premiumDesc}</p>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em', fontFamily: "'Bricolage Grotesque',sans-serif", marginBottom: 20 }}>
                    {T.pricing.premiumPrice} <span style={{ fontSize: 14, fontWeight: 500, color: '#a1a1aa' }}>{T.pricing.perMonth}</span>
                  </div>
                  <ul className="lp-price-items">
                    {T.pricing.premiumItems.map(f => (
                      <li key={f} className="lp-price-item"><Check size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} /> {f}</li>
                    ))}
                  </ul>
                </div>
                <button onClick={openRegister} className="lp-btn lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>{T.pricing.premiumBtn}</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="lp-section lp-section-white">
          <div className="lp-container" style={{ maxWidth: 720 }}>
            <div className="lp-section-header lp-reveal">
              <span className="lp-pill lp-pill-blue" style={{ marginBottom: 16 }}>{T.faq.pill}</span>
              <h2 className="lp-h2">{T.faq.headline}</h2>
            </div>

            <div className="lp-faq-list">
              {T.faq.items.map(({ q, a }, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`lp-faq-item${isOpen ? ' open' : ''} lp-reveal`} style={{ transitionDelay: `${i * 0.04}s` }}>
                    <button className="lp-faq-trigger" onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen}>
                      <span>{q}</span>
                      <ChevronDown size={16} className={`lp-faq-chevron${isOpen ? ' open' : ''}`} />
                    </button>
                    <div className={`lp-faq-body${isOpen ? ' open' : ''}`} aria-hidden={!isOpen}>
                      <div className="lp-faq-body-inner">
                        <div className="lp-faq-body-content">{a}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="lp-section lp-section-black">
          <div className="lp-container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div className="lp-reveal">
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.75rem)', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.05, color: '#fff' }}>
                {T.cta.headline}
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.65 }}>
                {T.cta.subtitle}
              </p>
              <button onClick={openRegister} className="lp-btn lp-btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>
                {T.cta.btn} <ArrowRight size={16} />
              </button>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '16px 0 0' }}>{T.cta.note}</p>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: '#050507', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hammer size={13} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '0.9rem', color: '#fff', letterSpacing: '-0.02em' }}>OkosSzaki</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="/about"       target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>{T.footer.about}</a>
            <a href="/impressum"   target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>{T.footer.imprint}</a>
            <a href="/adatkezeles" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>{T.footer.privacy}</a>
            <a href="/aszf"        target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>{T.footer.terms}</a>
            <span style={{ fontSize: 13, color: '#3d3d3f' }}>© {new Date().getFullYear()} MPPM Consulting Kft.</span>
          </div>
        </footer>

      </div>

      {/* ── MOBILE SHEET ── */}
      {mobileMenuOpen && (
        <>
          <div className="lp-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div
            role="dialog" aria-modal="true" aria-label="Navigáció"
            className="lp-sheet"
            style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerUp}
            onPointerCancel={onSheetPointerUp}
          >
            <div className="lp-sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: '1rem', color: '#1d1d1f', letterSpacing: '-0.02em' }}>{T.nav.menu || 'Menü'}</span>
              <button onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#6e6e73', display: 'flex', transition: 'color 0.1s' }}>
                <X size={20} />
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { href: '#features', label: T.nav.features },
                { href: '#pricing',  label: T.nav.pricing  },
                { href: '#faq',      label: T.nav.faq      },
                { href: '/about',    label: T.nav.about    },
              ].map(({ href, label }) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: '14px 20px', fontSize: 16, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {label}
                </a>
              ))}
            </nav>

            <div style={{ display: 'flex', gap: 6, padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {['hu','de','en'].map(loc => (
                <button key={loc} type="button" onClick={() => setLocale(loc)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: locale === loc ? '#1d1d1f' : '#f5f5f7', color: locale === loc ? '#fff' : '#6e6e73', border: 'none', cursor: locale === loc ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {loc}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 20px' }}>
              <button onClick={() => { openLogin(); setMobileMenuOpen(false); }}
                className="lp-btn lp-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                {T.nav.login}
              </button>
              <button onClick={() => { openRegister(); setMobileMenuOpen(false); }}
                className="lp-btn lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {T.nav.register} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} initialView={authViewRef.current} />}
      <CookieBanner />
    </>
  );
}
