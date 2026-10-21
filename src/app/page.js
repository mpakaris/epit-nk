'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AuthModal from '@/components/AuthModal';
import CookieBanner from '@/components/CookieBanner';
import {
  Check, ArrowRight, Hammer,
  ChevronDown, Menu, X, Users, Globe,
} from 'lucide-react';
import ProjectsListPreview from '@/components/preview/ProjectsListPreview';
import FeatureShowcase from '@/components/preview/FeatureShowcase';

const FREE_ITEMS    = ['Max. 1 projekt', 'Max. 5 árajánlat', 'Max. 5 felmérés', 'Személyes weboldal (szakemberlap)', 'Meghívható kollektívákba'];
const PREMIUM_ITEMS = ['Korlátlan projektek, ajánlatok, felmérések', 'Kollektíva létrehozása csapatnak', 'Teljes weboldal funkciók', 'Korlátlan képfeltöltés', 'Naptár és ügyféltár'];

const FAQS = [
  { q: 'Kell-e technikai tudás a használathoz?',        a: 'Semmi. Ha tudsz SMS-t küldeni, az OkosSzakiet is tudod használni. Egyszerű felület, nagy gombok, mobilra tervezve.' },
  { q: 'A saját weboldal valóban ingyenes?',            a: 'Igen. Minden fiókhoz jár egy ingyenes szakemberlap, ahol az ügyfeleid megtekinthetik a munkáidat, képeidet, és ajánlatot kérhetnek.' },
  { q: 'Meg tudom osztani a projektet alvállalkozóval?', a: 'Igen. Meghívhatsz más szakembereket egy közös munkaterületre, ahol látják a feladatokat és a helyszíni feljegyzéseket, de a saját áraidat és pénzügyeidet nem.' },
  { q: 'Mikor éri meg a prémium csomagra váltani?',     a: 'Ha rendszeresen több projekten dolgozol egyszerre, vagy csapatban végezel munkát. A prémium csomaggal korlátlanul használhatsz minden funkciót.' },
];

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useApp();
  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const authViewRef = useRef('login');
  const openLogin    = () => { authViewRef.current = 'login';    setAuthOpen(true); };
  const openRegister = () => { authViewRef.current = 'register'; setAuthOpen(true); };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [heroImageUrl, setHeroImageUrl] = useState(null);

  useEffect(() => {
    fetch('/api/platform/hero').then(r => r.json()).then(d => { if (d.url) setHeroImageUrl(d.url); }).catch(() => {});
  }, []);

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

  if (!show) return null;

  const accent   = '#2563EB';
  const accentHv = '#1D4ED8';
  const accentLt = '#EFF6FF';
  const accentSf = '#DBEAFE';
  const navy900  = '#0F172A';
  const navy800  = '#1E293B';
  const navy700  = '#334155';
  const navy600  = '#475569';
  const slate200 = '#E2E8F0';
  const slate100 = '#F1F5F9';
  const slate50  = '#F8FAFC';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .lp-root { position:fixed; inset:0; overflow-y:auto; background:${slate50}; z-index:9999; font-family:'Inter',system-ui,sans-serif; color:${navy800}; -webkit-font-smoothing:antialiased; }
        .lp-container { max-width:1152px; margin:0 auto; padding:0 1.25rem; }
        @media(min-width:640px){ .lp-container { padding:0 1.5rem; } }
        .lp-pill { display:inline-flex; align-items:center; gap:0.35rem; padding:0.2rem 0.75rem; border-radius:999px; background:${accentLt}; border:1px solid ${accent}33; color:${accent}; font-size:0.72rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; }
        .lp-section-tag { text-align:center; margin-bottom:0.75rem; }
        .feature-card:hover { border-color:${accent}55 !important; transform:translateY(-2px); box-shadow:0 8px 24px rgba(37,99,235,0.08) !important; }
        .feature-card { transition:all 0.18s ease; }
        .faq-chevron { transition:transform 0.2s ease; }
        .nav-link { color:${navy700}; font-size:0.875rem; font-weight:600; text-decoration:none; transition:color 0.15s; }
        .nav-link:hover { color:${accent}; }
        .lp-section { padding:4rem 0; }
        @media(max-width:639px){
          .lp-section { padding:2.5rem 0; }
          .lp-hero { padding:2.25rem 0 2.75rem !important; }
          .lp-cta-row { flex-direction:column !important; }
          .lp-cta-row a, .lp-cta-row button { width:100% !important; justify-content:center; box-sizing:border-box; }
          .lp-hero-preview { display:none !important; }
          .lp-h2 { font-size:1.45rem !important; }
          .lp-pricing-grid { gap:1rem !important; }
          .lp-bottom-cta { padding:2.5rem 0 !important; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── NAVBAR ── */}
        <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${slate200}` }}>
          <div className="lp-container" style={{ height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:navy900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Hammer size={18} color={accentSf} />
              </div>
              <span style={{ fontWeight:800, fontSize:'1.15rem', letterSpacing:'-0.03em', color:navy900 }}>OkosSzaki</span>
            </div>

            {/* Desktop Nav */}
            <nav style={{ display:'flex', alignItems:'center', gap:'1.5rem' }} className="hidden-mobile">
              <a href="#features" className="nav-link">Funkciók</a>
              <a href="#pricing"  className="nav-link">Árazás</a>
              <a href="#faq"      className="nav-link">GYIK</a>
              <a href="/about"    className="nav-link" target="_blank" rel="noopener noreferrer">Rólunk</a>
            </nav>

            {/* Desktop Actions */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }} className="hidden-mobile">
              <button onClick={openLogin} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.875rem', color:navy700, padding:'0.4rem 0.75rem' }}>
                Bejelentkezés
              </button>
              <button onClick={openRegister} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1.1rem', background:accent, color:'#fff', fontWeight:700, fontSize:'0.875rem', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                Ingyenes regisztráció <ArrowRight size={14} />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(v => !v)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'0.4rem', borderRadius:8, color:navy700 }} className="show-mobile">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile drawer */}
          {mobileMenuOpen && (
            <div style={{ background:'#fff', borderTop:`1px solid ${slate200}`, padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Funkciók</a>
              <a href="#pricing"  className="nav-link" onClick={() => setMobileMenuOpen(false)}>Árazás</a>
              <a href="#faq"      className="nav-link" onClick={() => setMobileMenuOpen(false)}>GYIK</a>
              <div style={{ borderTop:`1px solid ${slate200}`, paddingTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <button onClick={() => { openLogin();    setMobileMenuOpen(false); }} style={{ padding:'0.65rem', borderRadius:10, background:slate100, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, color:navy900 }}>Bejelentkezés</button>
                <button onClick={() => { openRegister(); setMobileMenuOpen(false); }} style={{ padding:'0.65rem', borderRadius:10, background:accent, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, color:'#fff' }}>Ingyenes regisztráció</button>
              </div>
            </div>
          )}
        </header>

        {/* ── HERO ── */}
        <section className="lp-hero" style={{ background:'#fff', padding:'3.5rem 0 4rem', borderBottom:`1px solid ${slate200}` }}>
          <div className="lp-container">
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'2.5rem', alignItems:'center' }} className="hero-grid">

              {/* Left copy */}
              <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                <span className="lp-pill"><Hammer size={12} /> Szakembereknek &amp; kivitelezőknek</span>

                <h1 style={{ fontSize:'clamp(2rem,5vw,3.25rem)', fontWeight:800, color:navy900, letterSpacing:'-0.04em', lineHeight:1.1, margin:0 }}>
                  Az építkezés profi eszköze — kézben tartva.
                </h1>

                <p style={{ fontSize:'clamp(0.95rem,1.8vw,1.1rem)', color:navy600, lineHeight:1.7, margin:0, maxWidth:520 }}>
                  Felmérés, árajánlat, projektköltség, ügyfélportál — minden egy helyen. Nincs bonyolult beállítás, nincs felesleges funkció.
                </p>

                {/* Trust checklist */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem 1.5rem' }}>
                  {['2 perces beállítás', 'Ingyenes weboldal', 'Mobilon is tökéletes'].map(t => (
                    <span key={t} style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.85rem', fontWeight:600, color:navy700 }}>
                      <Check size={15} color={accent} /> {t}
                    </span>
                  ))}
                </div>

                {/* CTAs */}
                <div className="lp-cta-row" style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginTop:'0.25rem' }}>
                  <button onClick={openRegister} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.85rem 1.6rem', background:accent, color:'#fff', fontWeight:800, fontSize:'0.95rem', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 14px ${accent}44` }}>
                    Kezdj el ingyen <ArrowRight size={16} />
                  </button>
                  <a href="/demo" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.85rem 1.6rem', background:slate100, color:navy800, fontWeight:700, fontSize:'0.95rem', borderRadius:12, textDecoration:'none' }}>
                    Demo megtekintése
                  </a>
                </div>
                <a
                  href="/szakemberek/nemes-peter-felujito?preview=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', marginTop:'0.75rem', fontSize:'0.825rem', color:navy600, textDecoration:'none', fontWeight:600 }}
                  onMouseOver={e => e.currentTarget.style.color = accent}
                  onMouseOut={e => e.currentTarget.style.color = navy600}
                >
                  <Globe size={13} /> Weboldal sablon megtekintése ↗
                </a>
              </div>

              {/* Right: app preview — hidden on mobile */}
              <div className="lp-hero-preview" style={{ display:'flex', justifyContent:'center' }}>
                <ProjectsListPreview />
              </div>

            </div>
          </div>
        </section>

        {/* ── FEATURE SHOWCASE ── */}
        <FeatureShowcase onRegister={openRegister} />

        {/* ── PRICING ── */}
        <section id="pricing" className="lp-section" style={{ padding:'4rem 0', background:slate50, borderBottom:`1px solid ${slate200}` }}>
          <div className="lp-container">
            <div style={{ textAlign:'center', marginBottom:'3rem' }}>
              <div className="lp-section-tag"><span className="lp-pill">Átlátható árazás</span></div>
              <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, color:navy900, margin:'0.5rem 0 0.5rem', letterSpacing:'-0.03em' }}>Egyszerű, becsületes árak</h2>
              <p style={{ color:navy600, fontSize:'0.9rem', margin:0 }}>Kezdj ingyenesen — váltj prémiumra, ha a vállalkozásod nő.</p>
            </div>

            <div className="lp-pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap:'1.5rem', maxWidth:680, margin:'0 auto' }}>
              {/* Free */}
              <div style={{ background:'#fff', borderRadius:20, padding:'2rem', border:`1px solid ${slate200}`, boxShadow:'0 2px 8px rgba(0,0,0,0.04)', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'1.5rem' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                    <h3 style={{ fontSize:'1.05rem', fontWeight:800, color:navy900, margin:0 }}>Ingyenes</h3>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, background:slate100, color:navy700, padding:'0.2rem 0.65rem', borderRadius:999 }}>Örökre ingyenes</span>
                  </div>
                  <p style={{ fontSize:'0.8rem', color:navy600, margin:'0 0 1rem' }}>Tökéletes kezdéshez, néhány megbízás kezeléséhez.</p>
                  <div style={{ fontSize:'2.25rem', fontWeight:800, color:navy900, letterSpacing:'-0.04em', marginBottom:'1.25rem' }}>0 Ft <span style={{ fontSize:'0.875rem', fontWeight:500, color:'#94a3b8' }}> / hó</span></div>
                  <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {FREE_ITEMS.map(f => (
                      <li key={f} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.825rem', color:navy700 }}>
                        <Check size={14} color={accent} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={openRegister} style={{ padding:'0.75rem', borderRadius:12, background:slate100, color:navy900, fontWeight:700, fontSize:'0.875rem', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background=slate200} onMouseOut={e => e.currentTarget.style.background=slate100}>
                  Regisztráció ingyen
                </button>
              </div>

              {/* Premium */}
              <div style={{ background:'#fff', borderRadius:20, padding:'2rem', border:`2px solid ${accent}`, boxShadow:`0 4px 20px ${accent}22`, display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'1.5rem', position:'relative' }}>
                <div style={{ position:'absolute', top:-13, right:'1.5rem', background:accent, color:'#fff', fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', padding:'0.2rem 0.75rem', borderRadius:999 }}>Ajánlott</div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                    <h3 style={{ fontSize:'1.05rem', fontWeight:800, color:navy900, margin:0 }}>Prémium</h3>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, background:accentLt, color:accent, padding:'0.2rem 0.65rem', borderRadius:999 }}>Teljes csomag</span>
                  </div>
                  <p style={{ fontSize:'0.8rem', color:navy600, margin:'0 0 1rem' }}>Korlátlan projektek, csapatmunka, teljes weboldal.</p>
                  <div style={{ fontSize:'2.25rem', fontWeight:800, color:navy900, letterSpacing:'-0.04em', marginBottom:'1.25rem' }}>6 999 Ft <span style={{ fontSize:'0.875rem', fontWeight:500, color:'#94a3b8' }}> / hó</span></div>
                  <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {PREMIUM_ITEMS.map(f => (
                      <li key={f} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.825rem', color:navy700 }}>
                        <Check size={14} color={accent} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={openRegister} style={{ padding:'0.75rem', borderRadius:12, background:accent, color:'#fff', fontWeight:700, fontSize:'0.875rem', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background=accentHv} onMouseOut={e => e.currentTarget.style.background=accent}>
                  14 napos próba ingyen
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="lp-section" style={{ padding:'4rem 0', background:'#fff', borderBottom:`1px solid ${slate200}` }}>
          <div className="lp-container" style={{ maxWidth:720, margin:'0 auto', padding:'0 1.25rem' }}>
            <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
              <div className="lp-section-tag"><span className="lp-pill">Kérdések</span></div>
              <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, color:navy900, margin:'0.5rem 0 0', letterSpacing:'-0.03em' }}>Gyakran ismételt kérdések</h2>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {FAQS.map(({ q, a }, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ background:'#fff', borderRadius:14, border:`1px solid ${isOpen ? accent + '55' : slate200}`, overflow:'hidden', transition:'border-color 0.2s' }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)} style={{ width:'100%', padding:'1rem 1.25rem', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.9rem', color:navy900, gap:'0.75rem' }}>
                      <span>{q}</span>
                      <ChevronDown size={16} color={navy600} className="faq-chevron" style={{ flexShrink:0, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding:'0 1.25rem 1rem', fontSize:'0.85rem', color:navy600, lineHeight:1.7, borderTop:`1px solid ${slate100}` }}>
                        {a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="lp-bottom-cta" style={{ background:navy900, padding:'4rem 0', color:'#fff' }}>
          <div className="lp-container" style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem' }}>
            <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.5rem)', fontWeight:800, letterSpacing:'-0.03em', margin:0 }}>
              Készen állsz egyszerűbbé tenni a munkádat?
            </h2>
            <p style={{ fontSize:'0.95rem', color:'#94a3b8', maxWidth:480, margin:0, lineHeight:1.65 }}>
              Csatlakozz azokhoz a szakemberekhez, akik hetente órákat spórolnak az OkosSzakikel.
            </p>
            <button onClick={openRegister} style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.95rem 2rem', background:accent, color:'#fff', fontWeight:800, fontSize:'0.95rem', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 20px ${accent}66`, marginTop:'0.5rem' }}>
              Ingyenes próba most <ArrowRight size={16} />
            </button>
            <p style={{ fontSize:'0.75rem', color:'#475569', margin:0 }}>Bankkártya nem szükséges · Beállítás 2 perc alatt</p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background:'#080e1a', padding:'1.5rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Hammer size={14} color="#fff" />
            </div>
            <span style={{ fontWeight:800, fontSize:'0.9rem', color:'#fff' }}>OkosSzaki</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1.25rem', flexWrap:'wrap' }}>
            <a href="/about"       target="_blank" rel="noopener noreferrer" style={{ fontSize:'0.75rem', color:'#475569', textDecoration:'none' }}>Rólunk</a>
            <a href="/impressum"   target="_blank" rel="noopener noreferrer" style={{ fontSize:'0.75rem', color:'#475569', textDecoration:'none' }}>Impresszum</a>
            <a href="/adatkezeles" target="_blank" rel="noopener noreferrer" style={{ fontSize:'0.75rem', color:'#475569', textDecoration:'none' }}>Adatkezelés</a>
            <a href="/aszf"        target="_blank" rel="noopener noreferrer" style={{ fontSize:'0.75rem', color:'#475569', textDecoration:'none' }}>ÁSZF</a>
            <p style={{ fontSize:'0.75rem', color:'#334155', margin:0 }}>© {new Date().getFullYear()} MPPM Consulting Kft.</p>
          </div>
        </footer>

        {/* Responsive helpers */}
        <style>{`
          @media (min-width: 1024px) {
            .hero-grid { grid-template-columns: 7fr 5fr !important; }
          }
          @media (min-width: 768px) {
            .hidden-mobile { display: flex !important; }
            .show-mobile    { display: none !important; }
          }
          @media (max-width: 767px) {
            .hidden-mobile  { display: none !important; }
            .show-mobile    { display: block !important; }
          }
          @media (max-width: 639px) {
            .hero-grid      { gap: 1.5rem !important; }
          }
        `}</style>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} initialView={authViewRef.current} />}
      <CookieBanner />
    </>
  );
}
