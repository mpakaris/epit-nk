'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Hammer, ArrowRight, Menu, X } from 'lucide-react';
import AuthModal from '@/components/AuthModal';

const accent   = '#2563EB';
const navy900  = '#0F172A';
const navy700  = '#334155';
const slate100 = '#F1F5F9';
const slate200 = '#E2E8F0';

export default function LandingHeader({ activePage = '' }) {
  const [authOpen,       setAuthOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authViewRef = useRef('login');

  const openLogin    = () => { authViewRef.current = 'login';    setAuthOpen(true); };
  const openRegister = () => { authViewRef.current = 'register'; setAuthOpen(true); };

  const openMenu  = () => { setMobileMenuOpen(true);  document.body.style.overflow = 'hidden'; };
  const closeMenu = () => { setMobileMenuOpen(false); document.body.style.overflow = '';       };

  // Clean up scroll lock if the component unmounts while open
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  const handleNavClick = (e, href) => {
    closeMenu();
    // Let the browser follow the href naturally
  };

  return (
    <>
      <style>{`
        .lp-nav-link { color:${navy700}; font-size:0.875rem; font-weight:600; text-decoration:none; transition:color 0.15s; font-family:'Inter',system-ui,sans-serif; }
        .lp-nav-link:hover { color:${accent}; }
        @media (min-width: 768px) { .lp-hidden-mobile { display:flex !important; } .lp-show-mobile { display:none !important; } }
        @media (max-width: 767px) { .lp-hidden-mobile { display:none !important; } .lp-show-mobile  { display:block !important; } }
        @keyframes lp-slide-up { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
      `}</style>

      <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${slate200}`, fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ maxWidth:1152, margin:'0 auto', padding:'0 1.25rem', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* Logo */}
          <a href="/" style={{ display:'flex', alignItems:'center', gap:'0.5rem', textDecoration:'none' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:navy900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Hammer size={18} color="#DBEAFE" />
            </div>
            <span style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.03em', color:navy900 }}>OkosSzaki</span>
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
          <button
            onClick={mobileMenuOpen ? closeMenu : openMenu}
            style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'0.4rem', borderRadius:8, color:navy700 }}
            className="lp-show-mobile"
            aria-label="Menü"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile bottom-sheet nav */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:9000 }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigáció"
            style={{
              position:'fixed', bottom:0, left:0, right:0, zIndex:9001,
              background:'#fff',
              borderRadius:'20px 20px 0 0',
              boxShadow:'0 -4px 32px rgba(0,0,0,0.14)',
              animation:'lp-slide-up .28s cubic-bezier(.32,1,.6,1)',
              fontFamily:"'Inter',system-ui,sans-serif",
              paddingBottom:'env(safe-area-inset-bottom)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:slate200 }} />
            </div>

            {/* Close row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 1.25rem 0.75rem', borderBottom:`1px solid ${slate200}` }}>
              <span style={{ fontWeight:800, fontSize:'1rem', color:navy900 }}>Menü</span>
              <button onClick={closeMenu} style={{ background:'none', border:'none', cursor:'pointer', padding:'0.35rem', borderRadius:8, color:navy700, display:'flex' }}>
                <X size={20} />
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ display:'flex', flexDirection:'column' }}>
              {[
                { href:'/#features', label:'Funkciók' },
                { href:'/#pricing',  label:'Árazás'   },
                { href:'/#faq',      label:'GYIK'     },
                { href:'/about',     label:'Rólunk'   },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => closeMenu()}
                  style={{
                    display:'block', padding:'0.95rem 1.25rem',
                    fontSize:'1.05rem', fontWeight:600, color:navy900,
                    textDecoration:'none', borderBottom:`1px solid ${slate200}`,
                    transition:'background 0.1s',
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Auth buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', padding:'1rem 1.25rem' }}>
              <button
                onClick={() => { openLogin(); closeMenu(); }}
                style={{ padding:'0.8rem', borderRadius:10, background:slate100, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.95rem', color:navy900 }}
              >
                Bejelentkezés
              </button>
              <button
                onClick={() => { openRegister(); closeMenu(); }}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', padding:'0.8rem', borderRadius:10, background:accent, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.95rem', color:'#fff' }}
              >
                Ingyenes regisztráció <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} initialView={authViewRef.current} />}
    </>
  );
}
