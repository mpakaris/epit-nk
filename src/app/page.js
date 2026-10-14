'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ClipboardList, FileText, TrendingUp, Users, Share2,
  BookUser, Globe, Check, ArrowRight, Hammer,
  Mail, Lock, AlertCircle, X, User, ArrowLeft,
} from 'lucide-react';

const FEATURES = [
  { icon: ClipboardList, title: 'Felmérés',         desc: 'Helyszíni jegyzetek és vázlatok azonnal rögzítve' },
  { icon: FileText,      title: 'Árajánlat',        desc: 'Részletes, professzionális ajánlatok percek alatt' },
  { icon: TrendingUp,    title: 'Projektköltségek', desc: 'Számlák, munkaköltség, fotók és munkafázisok' },
  { icon: Users,         title: 'Alvállalkozók',    desc: 'Koordinált munkavégzés, megosztott költségek' },
  { icon: Share2,        title: 'Ügyfélportál',     desc: 'Az ügyfeled mindig látja, hol tart a projekt' },
  { icon: BookUser,      title: 'Ügyfélkezelés',    desc: 'Minden kapcsolat és előzmény egy helyen' },
  { icon: Globe,         title: 'Saját weboldal',   desc: 'Ingyenes, személyre szabott szakemberlap' },
];

const FREE_ITEMS = [
  '1 aktív projekt', '1 árajánlat', '1 felmérés',
  'Korlátozott weboldal', '1 ügyfélportál', 'Limitált képfeltöltés',
];
const PREMIUM_ITEMS = [
  'Korlátlan projektek', 'Korlátlan árajánlatok', 'Korlátlan felmérések',
  'Teljes weboldal', 'Korlátlan ügyfélportálok', 'Képek és videók',
];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

function AuthModal({ onClose }) {
  const { login, loginWithOAuth, registerWithEmail, resetPasswordEmail } = useApp();
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot'

  // Login state
  const [lEmail, setLEmail] = useState('');
  const [lPassword, setLPassword] = useState('');

  // Register state
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPassword, setRPassword] = useState('');
  const [rPassword2, setRPassword2] = useState('');

  // Forgot state
  const [fEmail, setFEmail] = useState('');
  const [fSent, setFSent] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clearError = () => setError('');

  const switchView = (v) => { setError(''); setView(v); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try { await login(lEmail, lPassword); }
    catch (err) { setError(err.message || 'Hibás e-mail vagy jelszó.'); setSubmitting(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (rPassword !== rPassword2) { setError('A két jelszó nem egyezik.'); return; }
    if (rPassword.length < 6) { setError('A jelszó legalább 6 karakter legyen.'); return; }
    setSubmitting(true);
    try {
      const data = await registerWithEmail(rName.trim(), rEmail.trim(), rPassword);
      if (!data.session) {
        setError('');
        switchView('confirm');
      }
    }
    catch (err) { setError(err.message || 'Hiba a regisztráció során.'); setSubmitting(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try { await resetPasswordEmail(fEmail.trim()); setFSent(true); }
    catch (err) { setError(err.message || 'Hiba történt.'); }
    finally { setSubmitting(false); }
  };

  const handleGoogle = async () => {
    setError('');
    try { await loginWithOAuth('google'); }
    catch (err) { setError(err.message || 'Google bejelentkezés sikertelen.'); }
  };

  const titles = { login: 'Bejelentkezés', register: 'Regisztráció', forgot: 'Elfelejtett jelszó', confirm: 'E-mail megerősítés' };

  return (
    <>
      <style>{`
        .login-overlay { position:fixed; inset:0; z-index:10001; background:rgba(15,23,42,0.6); display:flex; align-items:flex-end; justify-content:center; }
        .login-sheet { background:#fff; width:100%; padding:2rem 1.75rem; border-radius:20px 20px 0 0; animation:slideUp .28s cubic-bezier(.32,1,.6,1); box-shadow:0 -4px 32px rgba(0,0,0,0.14); max-height:92vh; overflow-y:auto; }
        .auth-input { width:100%; padding:0.72rem 0.875rem 0.72rem 2.5rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; outline:none; box-sizing:border-box; font-family:inherit; transition:border-color .15s; }
        .auth-input:focus { border-color:#0f172a; }
        .auth-input-bare { width:100%; padding:0.72rem 0.875rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; outline:none; box-sizing:border-box; font-family:inherit; transition:border-color .15s; }
        .auth-input-bare:focus { border-color:#0f172a; }
        .auth-divider { display:flex; align-items:center; gap:0.75rem; margin:1rem 0; color:#cbd5e1; font-size:0.78rem; font-weight:600; letter-spacing:0.04em; }
        .auth-divider::before,.auth-divider::after { content:''; flex:1; height:1px; background:#e2e8f0; }
        .auth-social { width:100%; display:flex; align-items:center; justify-content:center; gap:0.6rem; padding:0.72rem 1rem; background:#fff; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.875rem; font-weight:600; color:#374151; cursor:pointer; font-family:inherit; transition:background .15s,border-color .15s; }
        .auth-social:hover { background:#f8fafc; border-color:#cbd5e1; }
        .auth-link { background:none; border:none; color:#64748b; font-size:0.82rem; cursor:pointer; font-family:inherit; text-decoration:underline; text-underline-offset:2px; padding:0; }
        .auth-link:hover { color:#0f172a; }
        @media (min-width:600px) {
          .login-overlay { align-items:center; }
          .login-sheet { border-radius:16px; max-width:440px; animation:fadeScale .22s ease; box-shadow:0 16px 48px rgba(0,0,0,0.18); max-height:90vh; }
        }
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fadeScale { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div className="login-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="login-sheet">

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              {view !== 'login' && view !== 'confirm' && (
                <button onClick={() => switchView('login')} style={{ background:'#f1f5f9', border:'none', borderRadius:'7px', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginRight:'0.15rem' }}>
                  <ArrowLeft size={14} color="#64748b" />
                </button>
              )}
              <div>
                <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.03em', margin:0 }}>{titles[view]}</h2>
                <p style={{ fontSize:'0.78rem', color:'#94a3b8', margin:'0.15rem 0 0' }}>Epitek fiók</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <X size={16} color="#64748b" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'0.6rem 0.8rem', borderRadius:'8px', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'1rem' }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <>
              <button className="auth-social" onClick={handleGoogle}>
                <GoogleIcon /> Folytatás Google-lel
              </button>
              <div className="auth-divider">vagy</div>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>E-mail cím</label>
                  <div style={{ position:'relative' }}>
                    <input type="email" required autoFocus placeholder="pelda@email.hu" value={lEmail} onChange={e => setLEmail(e.target.value)} className="auth-input" />
                    <Mail size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'0.5rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Jelszó</label>
                  <div style={{ position:'relative' }}>
                    <input type="password" required placeholder="••••••••" value={lPassword} onChange={e => setLPassword(e.target.value)} className="auth-input" />
                    <Lock size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ textAlign:'right', marginBottom:'1.25rem' }}>
                  <button type="button" className="auth-link" onClick={() => switchView('forgot')}>Elfelejtett jelszó?</button>
                </div>
                <button type="submit" disabled={submitting} style={{ width:'100%', padding:'0.8rem', background: submitting ? '#334155' : '#0f172a', color:'#fff', fontWeight:800, fontSize:'0.9rem', border:'none', borderRadius:'9px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                  {submitting ? 'Belépés…' : 'Belépés'}
                </button>
              </form>
              <p style={{ textAlign:'center', fontSize:'0.82rem', color:'#94a3b8', marginTop:'1.25rem', marginBottom:0 }}>
                Még nincs fiókod?{' '}
                <button className="auth-link" style={{ color:'#0f172a', fontWeight:700 }} onClick={() => switchView('register')}>Regisztrálj</button>
              </p>
            </>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <>
              <button className="auth-social" onClick={handleGoogle}>
                <GoogleIcon /> Folytatás Google-lel
              </button>
              <div className="auth-divider">vagy</div>
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Teljes név</label>
                  <div style={{ position:'relative' }}>
                    <input type="text" required autoFocus placeholder="Kovács János" value={rName} onChange={e => setRName(e.target.value)} className="auth-input" />
                    <User size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>E-mail cím</label>
                  <div style={{ position:'relative' }}>
                    <input type="email" required placeholder="pelda@email.hu" value={rEmail} onChange={e => setREmail(e.target.value)} className="auth-input" />
                    <Mail size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Jelszó</label>
                  <div style={{ position:'relative' }}>
                    <input type="password" required placeholder="min. 6 karakter" value={rPassword} onChange={e => setRPassword(e.target.value)} className="auth-input" />
                    <Lock size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'1.25rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Jelszó megerősítése</label>
                  <div style={{ position:'relative' }}>
                    <input type="password" required placeholder="••••••••" value={rPassword2} onChange={e => setRPassword2(e.target.value)} className="auth-input" />
                    <Lock size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <button type="submit" disabled={submitting} style={{ width:'100%', padding:'0.8rem', background: submitting ? '#334155' : '#0f172a', color:'#fff', fontWeight:800, fontSize:'0.9rem', border:'none', borderRadius:'9px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                  {submitting ? 'Regisztráció…' : 'Regisztráció'}
                </button>
              </form>
              <p style={{ textAlign:'center', fontSize:'0.82rem', color:'#94a3b8', marginTop:'1.25rem', marginBottom:0 }}>
                Már van fiókod?{' '}
                <button className="auth-link" style={{ color:'#0f172a', fontWeight:700 }} onClick={() => switchView('login')}>Jelentkezz be</button>
              </p>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && !fSent && (
            <form onSubmit={handleForgot}>
              <p style={{ fontSize:'0.85rem', color:'#64748b', marginBottom:'1.25rem', lineHeight:1.55 }}>
                Add meg a fiókodhoz tartozó e-mail címet, és küldünk egy visszaállítási linket.
              </p>
              <div style={{ marginBottom:'1.25rem' }}>
                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>E-mail cím</label>
                <div style={{ position:'relative' }}>
                  <input type="email" required autoFocus placeholder="pelda@email.hu" value={fEmail} onChange={e => setFEmail(e.target.value)} className="auth-input" />
                  <Mail size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                </div>
              </div>
              <button type="submit" disabled={submitting} style={{ width:'100%', padding:'0.8rem', background: submitting ? '#334155' : '#0f172a', color:'#fff', fontWeight:800, fontSize:'0.9rem', border:'none', borderRadius:'9px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                {submitting ? 'Küldés…' : 'Link küldése'}
              </button>
            </form>
          )}

          {/* ── FORGOT SENT ── */}
          {view === 'forgot' && fSent && (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:'48px', height:'48px', background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <Check size={22} color="#16a34a" />
              </div>
              <h3 style={{ fontWeight:800, color:'#0f172a', marginBottom:'0.5rem' }}>E-mail elküldve</h3>
              <p style={{ fontSize:'0.85rem', color:'#64748b', lineHeight:1.55 }}>
                Ellenőrizd a postafiókod, és kattints a visszaállítási linkre.
              </p>
              <button className="auth-link" style={{ marginTop:'1.25rem', display:'inline-block' }} onClick={() => switchView('login')}>Vissza a bejelentkezéshez</button>
            </div>
          )}

          {/* ── EMAIL CONFIRM (after register without auto-confirm) ── */}
          {view === 'confirm' && (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:'48px', height:'48px', background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <Mail size={22} color="#16a34a" />
              </div>
              <h3 style={{ fontWeight:800, color:'#0f172a', marginBottom:'0.5rem' }}>Erősítsd meg az e-mailt</h3>
              <p style={{ fontSize:'0.85rem', color:'#64748b', lineHeight:1.55 }}>
                Küldtünk egy megerősítő linket. Kattints rá, hogy aktiváld a fiókodat.
              </p>
              <button className="auth-link" style={{ marginTop:'1.25rem', display:'inline-block' }} onClick={() => switchView('login')}>Vissza a bejelentkezéshez</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useApp();
  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (currentUser.must_change_password) router.replace('/change-password');
        else if (currentUser.role === 'superadmin') router.replace('/superadmin');
        else if (currentUser.role === 'admin') router.replace('/admin');
        else router.replace('/projektek');
      } else {
        setShow(true);
      }
    }
  }, [currentUser, loading, router]);

  if (!show) return null;

  return (
    <>
      <style>{`
        .lp-wrap { position:fixed; inset:0; overflow-y:auto; background:#fff; z-index:9999; font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a; }

        .lp-nav { position:sticky; top:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(1.25rem,5vw,4rem); height:64px; background:rgba(15,23,42,0.97); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.06); }
        .lp-logo { display:flex; align-items:center; gap:0.6rem; color:#fff; font-size:1.15rem; font-weight:800; letter-spacing:-0.03em; }
        .lp-logo-icon { width:30px; height:30px; background:#fff; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-nav-btn { padding:0.45rem 1.1rem; border-radius:8px; background:rgba(255,255,255,0.1); color:#fff; font-weight:700; font-size:0.875rem; border:1px solid rgba(255,255,255,0.18); cursor:pointer; font-family:inherit; transition:background .15s; }
        .lp-nav-btn:hover { background:rgba(255,255,255,0.18); }

        .lp-hero { background:#0f172a; padding:clamp(5rem,12vw,9rem) clamp(1.25rem,5vw,4rem) clamp(4rem,10vw,7rem); text-align:center; }
        .lp-eyebrow { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.07); color:#94a3b8; font-size:0.78rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:0.3rem 0.85rem; border-radius:999px; border:1px solid rgba(255,255,255,0.1); margin-bottom:1.75rem; }
        .lp-h1 { font-size:clamp(2.5rem,6vw,4.25rem); font-weight:800; color:#fff; letter-spacing:-0.04em; line-height:1.08; margin:0 auto 1.25rem; max-width:820px; }
        .lp-h1 em { font-style:normal; color:#e2e8f0; }
        .lp-sub { font-size:clamp(0.95rem,2vw,1.15rem); color:#64748b; max-width:500px; margin:0 auto 2.5rem; line-height:1.65; }
        .lp-ctas { display:flex; gap:0.85rem; justify-content:center; flex-wrap:wrap; }
        .lp-cta-primary { display:inline-flex; align-items:center; gap:0.45rem; padding:0.8rem 1.6rem; background:#fff; color:#0f172a; font-weight:800; font-size:0.95rem; border-radius:10px; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
        .lp-cta-primary:hover { background:#f1f5f9; transform:translateY(-1px); }
        .lp-cta-secondary { display:inline-flex; align-items:center; gap:0.45rem; padding:0.8rem 1.6rem; background:transparent; color:#94a3b8; font-weight:600; font-size:0.95rem; border-radius:10px; border:1px solid rgba(255,255,255,0.12); cursor:pointer; font-family:inherit; transition:all .15s; text-decoration:none; }
        .lp-cta-secondary:hover { color:#fff; border-color:rgba(255,255,255,0.25); }

        .lp-demo-bar { background:#1e293b; padding:2.5rem clamp(1.25rem,5vw,4rem); display:flex; justify-content:center; }
        .lp-demo-box { width:100%; max-width:900px; aspect-ratio:16/7; background:#0f172a; border-radius:12px; border:1px solid #1e293b; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.6rem; }
        .lp-demo-box span { color:#334155; font-size:0.85rem; font-weight:600; }

        .lp-features { padding:clamp(4rem,9vw,7rem) clamp(1.25rem,5vw,4rem); background:#f8fafc; }
        .lp-section-label { text-align:center; margin-bottom:3rem; }
        .lp-overline { display:inline-block; font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:0.6rem; }
        .lp-section-title { font-size:clamp(1.6rem,3.5vw,2.25rem); font-weight:800; color:#0f172a; letter-spacing:-0.03em; margin:0; }
        .lp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr)); gap:1rem; max-width:1100px; margin:0 auto; }
        .lp-card { background:#fff; border-radius:12px; padding:1.4rem 1.5rem; border:1px solid #e2e8f0; transition:box-shadow .2s,transform .2s; }
        .lp-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.07); transform:translateY(-2px); }
        .lp-card-icon { width:40px; height:40px; border-radius:9px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-bottom:0.9rem; }
        .lp-card-title { font-size:0.95rem; font-weight:800; color:#0f172a; margin-bottom:0.3rem; }
        .lp-card-desc { font-size:0.83rem; color:#64748b; line-height:1.55; }

        .lp-pricing { padding:clamp(4rem,9vw,7rem) clamp(1.25rem,5vw,4rem); background:#fff; }
        .lp-pricing-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:1.25rem; max-width:700px; margin:0 auto; }
        .lp-plan { border-radius:14px; padding:2rem 1.75rem; border:1.5px solid #e2e8f0; }
        .lp-plan.premium { background:#0f172a; border-color:#0f172a; }
        .lp-plan-badge { display:inline-block; background:#fff; color:#0f172a; font-size:0.7rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; padding:0.2rem 0.75rem; border-radius:999px; margin-bottom:1rem; }
        .lp-plan-tier { font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:0.5rem; }
        .lp-plan.premium .lp-plan-tier { color:#475569; }
        .lp-plan-price { font-size:2.4rem; font-weight:800; color:#0f172a; letter-spacing:-0.04em; line-height:1; margin-bottom:0.2rem; }
        .lp-plan.premium .lp-plan-price { color:#fff; }
        .lp-plan-price span { font-size:0.95rem; font-weight:600; color:#94a3b8; }
        .lp-plan-sub { font-size:0.8rem; color:#94a3b8; margin-bottom:1.5rem; }
        .lp-plan-list { list-style:none; padding:0; margin:0 0 1.75rem; display:flex; flex-direction:column; gap:0.55rem; }
        .lp-plan-list li { display:flex; align-items:center; gap:0.55rem; font-size:0.855rem; color:#374151; }
        .lp-plan.premium .lp-plan-list li { color:#94a3b8; }
        .lp-plan-btn { display:block; width:100%; text-align:center; padding:0.75rem 1rem; border-radius:10px; font-weight:700; font-size:0.875rem; border:none; cursor:pointer; font-family:inherit; transition:all .15s; box-sizing:border-box; }
        .lp-plan-btn.free { background:#0f172a; color:#fff; }
        .lp-plan-btn.free:hover { background:#1e293b; }
        .lp-plan-btn.prem { background:#fff; color:#0f172a; }
        .lp-plan-btn.prem:hover { background:#f1f5f9; }

        .lp-footer-cta { background:#0f172a; padding:clamp(3.5rem,8vw,6rem) clamp(1.25rem,5vw,4rem); text-align:center; }
        .lp-footer-h { font-size:clamp(1.6rem,3.5vw,2.5rem); font-weight:800; color:#fff; letter-spacing:-0.03em; margin:0 0 0.6rem; }
        .lp-footer-sub { color:#64748b; font-size:0.95rem; margin:0 0 2rem; }
        .lp-footer-copy { padding:1.25rem clamp(1.25rem,5vw,4rem); background:#080e1a; text-align:center; color:#334155; font-size:0.78rem; }

        @media (max-width:600px) {
          .lp-cta-primary,.lp-cta-secondary { width:100%; justify-content:center; }
          .lp-ctas { flex-direction:column; align-items:stretch; max-width:300px; margin:0 auto; }
        }
      `}</style>

      <div className="lp-wrap">
        <nav className="lp-nav">
          <div className="lp-logo">
            <span className="lp-logo-icon"><Hammer size={16} color="#0f172a" /></span>
            Epitek
          </div>
          <button className="lp-nav-btn" onClick={() => setAuthOpen(true)}>Bejelentkezés</button>
        </nav>

        <section className="lp-hero">
          <div className="lp-eyebrow"><Hammer size={11} /> Szakembereknek</div>
          <h1 className="lp-h1">Az építkezés <em>profi eszköze.</em></h1>
          <p className="lp-sub">Felmérés, árajánlat, projektköltség, ügyfélportál — minden egy helyen.</p>
          <div className="lp-ctas">
            <button className="lp-cta-primary" onClick={() => setAuthOpen(true)}>
              Kezdj el ingyen <ArrowRight size={15} />
            </button>
            <a href="#features" className="lp-cta-secondary">Megnézem a funkciókat</a>
          </div>
        </section>

        <div className="lp-demo-bar">
          <div className="lp-demo-box">
            <Globe size={24} color="#1e293b" />
            <span>Videók és interaktív demo — hamarosan</span>
          </div>
        </div>

        <section className="lp-features" id="features">
          <div className="lp-section-label">
            <div className="lp-overline">Funkciók</div>
            <h2 className="lp-section-title">Mindent megkap, ami számít</h2>
          </div>
          <div className="lp-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="lp-card">
                <div className="lp-card-icon"><Icon size={18} color="#334155" /></div>
                <div className="lp-card-title">{title}</div>
                <div className="lp-card-desc">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-pricing" id="pricing">
          <div className="lp-section-label">
            <div className="lp-overline">Árazás</div>
            <h2 className="lp-section-title">Egyszerű, átlátható</h2>
          </div>
          <div className="lp-pricing-grid">
            <div className="lp-plan">
              <div className="lp-plan-tier">Ingyenes</div>
              <div className="lp-plan-price">0 <span>Ft</span></div>
              <div className="lp-plan-sub">Örökre ingyenes — kártya nélkül</div>
              <ul className="lp-plan-list">
                {FREE_ITEMS.map(f => <li key={f}><Check size={13} color="#94a3b8" />{f}</li>)}
              </ul>
              <button className="lp-plan-btn free" onClick={() => setAuthOpen(true)}>Regisztráció</button>
            </div>
            <div className="lp-plan premium">
              <div className="lp-plan-badge">Ajánlott</div>
              <div className="lp-plan-tier">Prémium</div>
              <div className="lp-plan-price">6 999 <span>Ft / hó</span></div>
              <div className="lp-plan-sub">Minden funkció, korlátok nélkül</div>
              <ul className="lp-plan-list">
                {PREMIUM_ITEMS.map(f => <li key={f}><Check size={13} color="#475569" />{f}</li>)}
              </ul>
              <button className="lp-plan-btn prem" onClick={() => setAuthOpen(true)}>Váltás prémiumra</button>
            </div>
          </div>
        </section>

        <section className="lp-footer-cta">
          <h2 className="lp-footer-h">Készen állsz?</h2>
          <p className="lp-footer-sub">Ingyenesen kezdhetsz, bármikor.</p>
          <button className="lp-cta-primary" onClick={() => setAuthOpen(true)}>
            Bejelentkezés <ArrowRight size={15} />
          </button>
        </section>

        <div className="lp-footer-copy">© {new Date().getFullYear()} Epitek · Minden jog fenntartva</div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
