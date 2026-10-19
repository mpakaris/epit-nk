'use client';

import React, { useRef, useState } from 'react';
import { Hammer, ArrowRight, Menu, X } from 'lucide-react';
import AuthModal from '@/components/AuthModal';

const accent  = '#2563EB';
const navy900 = '#0F172A';
const navy700 = '#334155';
const slate100 = '#F1F5F9';
const slate200 = '#E2E8F0';

export default function LandingHeader({ activePage = '' }) {
  const [authOpen, setAuthOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authViewRef = useRef('login');

  const openLogin    = () => { authViewRef.current = 'login';    setAuthOpen(true); };
  const openRegister = () => { authViewRef.current = 'register'; setAuthOpen(true); };

  return (
    <>
      <style>{`
        .lp-nav-link { color:${navy700}; font-size:0.875rem; font-weight:600; text-decoration:none; transition:color 0.15s; font-family:'Inter',system-ui,sans-serif; }
        .lp-nav-link:hover { color:${accent}; }
        @media (min-width: 768px) { .lp-hidden-mobile { display:flex !important; } .lp-show-mobile { display:none !important; } }
        @media (max-width: 767px) { .lp-hidden-mobile { display:none !important; } .lp-show-mobile  { display:block !important; } }
      `}</style>

      <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${slate200}`, fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ maxWidth:1152, margin:'0 auto', padding:'0 1.25rem', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* Logo */}
          <a href="/" style={{ display:'flex', alignItems:'center', gap:'0.5rem', textDecoration:'none' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:navy900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Hammer size={18} color="#DBEAFE" />
            </div>
            <span style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.03em', color:navy900 }}>Epitek</span>
          </a>

          {/* Desktop Nav */}
          <nav style={{ display:'flex', alignItems:'center', gap:'1.5rem' }} className="lp-hidden-mobile">
            <a href="/#features" className="lp-nav-link">Funkciók</a>
            <a href="/#pricing"  className="lp-nav-link">Árazás</a>
            <a href="/#faq"      className="lp-nav-link">GYIK</a>
            <a href="/about"     className="lp-nav-link" style={activePage === 'about' ? { color: accent } : {}}>Rólunk</a>
          </nav>

          {/* Desktop Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }} className="lp-hidden-mobile">
            <button onClick={openLogin} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.875rem', color:navy700, padding:'0.4rem 0.75rem' }}>
              Bejelentkezés
            </button>
            <button onClick={openRegister} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1.1rem', background:accent, color:'#fff', fontWeight:700, fontSize:'0.875rem', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              Ingyenes regisztráció <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(v => !v)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'0.4rem', borderRadius:8, color:navy700 }} className="lp-show-mobile">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div style={{ background:'#fff', borderTop:`1px solid ${slate200}`, padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem', fontFamily:"'Inter',system-ui,sans-serif" }}>
            <a href="/#features" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Funkciók</a>
            <a href="/#pricing"  className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Árazás</a>
            <a href="/#faq"      className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>GYIK</a>
            <a href="/about"     className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Rólunk</a>
            <div style={{ borderTop:`1px solid ${slate200}`, paddingTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              <button onClick={() => { openLogin();    setMobileMenuOpen(false); }} style={{ padding:'0.65rem', borderRadius:10, background:slate100, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, color:navy900 }}>Bejelentkezés</button>
              <button onClick={() => { openRegister(); setMobileMenuOpen(false); }} style={{ padding:'0.65rem', borderRadius:10, background:accent, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, color:'#fff' }}>Ingyenes regisztráció</button>
            </div>
          </div>
        )}
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} initialView={authViewRef.current} />}
    </>
  );
}
