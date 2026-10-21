'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Mail, Lock, AlertCircle, X, User, ArrowLeft, Check } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

/**
 * Shared auth modal (login / register / forgot password).
 *
 * Props:
 *  onClose      — called when the user dismisses the modal
 *  initialView  — 'login' | 'register' (default 'login')
 *  onSuccess    — optional callback(data) called after successful auth
 *                 when provided, AppContext will NOT redirect automatically
 *  initialEmail — pre-fill the email field
 */
export default function AuthModal({ onClose, initialView = 'login', onSuccess, initialEmail = '' }) {
  const { login, loginWithOAuth, registerWithEmail, resetPasswordEmail } = useApp();
  const [view, setView] = useState(initialView);

  const [lEmail, setLEmail]       = useState(initialEmail);
  const [lPassword, setLPassword] = useState('');

  const [rName, setRName]         = useState('');
  const [rEmail, setREmail]       = useState(initialEmail);
  const [rPassword, setRPassword] = useState('');
  const [rPassword2, setRPassword2] = useState('');
  const [rGdpr, setRGdpr]         = useState(false);
  const [rAszf, setRAszf]         = useState(false);

  const [fEmail, setFEmail]       = useState('');
  const [fSent, setFSent]         = useState(false);

  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchView = (v) => { setError(''); setView(v); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const data = await login(lEmail, lPassword, { noRedirect: !!onSuccess });
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.message || 'Hibás e-mail vagy jelszó.');
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (rPassword !== rPassword2)           { setError('A két jelszó nem egyezik.'); return; }
    if (rPassword.length < 8)               { setError('A jelszó legalább 8 karakter legyen.'); return; }
    if (!/[A-Z]/.test(rPassword))           { setError('A jelszónak tartalmaznia kell legalább egy nagybetűt.'); return; }
    if (!/[0-9]/.test(rPassword))           { setError('A jelszónak tartalmaznia kell legalább egy számot.'); return; }
    if (!/[^A-Za-z0-9]/.test(rPassword))   { setError('A jelszónak tartalmaznia kell legalább egy speciális karaktert (!@#$%...).'); return; }
    if (!rGdpr || !rAszf)                   { setError('Az adatkezelési tájékoztató és az ÁSZF elfogadása kötelező.'); return; }
    setSubmitting(true);
    try {
      const data = await registerWithEmail(rName.trim(), rEmail.trim(), rPassword, new Date().toISOString(), { noRedirect: !!onSuccess });
      if (!data.session) { switchView('confirm'); setSubmitting(false); return; }
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.message || 'Hiba a regisztráció során.');
      setSubmitting(false);
    }
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

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              {view !== 'login' && view !== 'confirm' && (
                <button onClick={() => switchView('login')} style={{ background:'#f1f5f9', border:'none', borderRadius:'7px', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginRight:'0.15rem' }}>
                  <ArrowLeft size={14} color="#64748b" />
                </button>
              )}
              <div>
                <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.03em', margin:0 }}>{titles[view]}</h2>
                <p style={{ fontSize:'0.78rem', color:'#94a3b8', margin:'0.15rem 0 0' }}>OkosSzaki fiók</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <X size={16} color="#64748b" />
            </button>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'0.6rem 0.8rem', borderRadius:'8px', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'1rem' }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}

          {view === 'login' && (
            <>
              <button className="auth-social" onClick={handleGoogle}><GoogleIcon /> Folytatás Google-lel</button>
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

          {view === 'register' && (
            <>
              <button className="auth-social" onClick={handleGoogle}><GoogleIcon /> Folytatás Google-lel</button>
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
                    <input type="password" required placeholder="min. 8 kar., nagybetű, szám, spec. karakter" value={rPassword} onChange={e => setRPassword(e.target.value)} className="auth-input" />
                    <Lock size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'0.75rem' }}>
                  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:'0.3rem' }}>Jelszó megerősítése</label>
                  <div style={{ position:'relative' }}>
                    <input type="password" required placeholder="••••••••" value={rPassword2} onChange={e => setRPassword2(e.target.value)} className="auth-input" />
                    <Lock size={14} color="#94a3b8" style={{ position:'absolute', left:'0.85rem', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.25rem' }}>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', fontSize:'0.8rem', color:'#374151', lineHeight:1.5 }}>
                    <input type="checkbox" checked={rGdpr} onChange={e => setRGdpr(e.target.checked)} style={{ marginTop:'2px', flexShrink:0 }} />
                    <span>Elolvastam és elfogadom az <a href="/adatkezeles" target="_blank" style={{ color:'#0f172a', fontWeight:700 }}>Adatkezelési Tájékoztatót</a>.</span>
                  </label>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', cursor:'pointer', fontSize:'0.8rem', color:'#374151', lineHeight:1.5 }}>
                    <input type="checkbox" checked={rAszf} onChange={e => setRAszf(e.target.checked)} style={{ marginTop:'2px', flexShrink:0 }} />
                    <span>Elfogadom az <a href="/aszf" target="_blank" style={{ color:'#0f172a', fontWeight:700 }}>Általános Szerződési Feltételeket</a>.</span>
                  </label>
                </div>
                {(() => {
                  const valid = rName.trim().length > 0 && rEmail.trim().length > 0
                    && rPassword.length >= 8 && /[A-Z]/.test(rPassword)
                    && /[0-9]/.test(rPassword) && /[^A-Za-z0-9]/.test(rPassword)
                    && rPassword === rPassword2 && rGdpr && rAszf;
                  return (
                    <button type="submit" disabled={submitting || !valid} style={{ width:'100%', padding:'0.8rem', background: submitting ? '#334155' : valid ? '#0f172a' : '#cbd5e1', color: valid ? '#fff' : '#94a3b8', fontWeight:800, fontSize:'0.9rem', border:'none', borderRadius:'9px', cursor: (submitting || !valid) ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'background .2s,color .2s' }}>
                      {submitting ? 'Regisztráció…' : 'Regisztráció'}
                    </button>
                  );
                })()}
              </form>
              <p style={{ textAlign:'center', fontSize:'0.82rem', color:'#94a3b8', marginTop:'1.25rem', marginBottom:0 }}>
                Már van fiókod?{' '}
                <button className="auth-link" style={{ color:'#0f172a', fontWeight:700 }} onClick={() => switchView('login')}>Jelentkezz be</button>
              </p>
            </>
          )}

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

          {view === 'forgot' && fSent && (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:'48px', height:'48px', background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <Check size={22} color="#16a34a" />
              </div>
              <h3 style={{ fontWeight:800, color:'#0f172a', marginBottom:'0.5rem' }}>E-mail elküldve</h3>
              <p style={{ fontSize:'0.85rem', color:'#64748b', lineHeight:1.55 }}>Ellenőrizd a postafiókod, és kattints a visszaállítási linkre.</p>
              <button className="auth-link" style={{ marginTop:'1.25rem', display:'inline-block' }} onClick={() => switchView('login')}>Vissza a bejelentkezéshez</button>
            </div>
          )}

          {view === 'confirm' && (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:'48px', height:'48px', background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <Mail size={22} color="#16a34a" />
              </div>
              <h3 style={{ fontWeight:800, color:'#0f172a', marginBottom:'0.5rem' }}>Erősítsd meg az e-mailt</h3>
              <p style={{ fontSize:'0.85rem', color:'#64748b', lineHeight:1.55 }}>
                Küldtünk egy megerősítő linket. Kattints rá, hogy aktiváld a fiókodat, majd gyere vissza erre az oldalra a meghívó elfogadásához.
              </p>
              <button className="auth-link" style={{ marginTop:'1.25rem', display:'inline-block' }} onClick={() => switchView('login')}>Vissza a bejelentkezéshez</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
