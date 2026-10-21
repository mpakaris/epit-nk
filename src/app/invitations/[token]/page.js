'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, CheckCircle2, XCircle, Loader2, AlertCircle, Lock, User, Check } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function InvitationPage({ params }) {
  const [token, setToken]           = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [pageState, setPageState]   = useState('loading');
  // loading | login | register | accept_direct | done_accept | done_decline | retracted | error

  // Session check
  const [sessionEmail, setSessionEmail] = useState(null); // logged-in user's email, if any

  // Register fields
  const [name, setName]             = useState('');
  const [password, setPassword]     = useState('');
  const [password2, setPassword2]   = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [pageError, setPageError]   = useState('');

  useEffect(() => {
    Promise.resolve(params).then(p => setToken(p.token));
  }, [params]);

  const fetchInvitation = useCallback(async (tok) => {
    // Check current session in parallel with fetching invitation
    const supabase = createClient();
    const [invRes, { data: { session } }] = await Promise.all([
      fetch(`/api/invitations/${tok}`),
      supabase.auth.getSession(),
    ]);

    const data = await invRes.json();
    if (!invRes.ok) { setPageState('error'); setPageError(data.error || 'A meghívó nem található'); return; }

    const inv         = data.invitation;
    const loggedEmail = session?.user?.email?.toLowerCase() ?? null;
    setInvitation(inv);
    setSessionEmail(loggedEmail);

    if (inv.status === 'retracted')  { setPageState('retracted');     return; }
    if (inv.status === 'accepted')   { setPageState('done_accept');   return; }
    if (inv.status === 'declined')   { setPageState('done_decline');  return; }

    // If this is a decline link, handle it immediately — never show the auth form
    const isDeclineLink = new URLSearchParams(window.location.search).get('decline') === '1';
    if (isDeclineLink) {
      const res  = await fetch(`/api/invitations/${tok}/decline`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setPageState('error'); setPageError(body.error); return; }
      setPageState('done_decline');
      return;
    }

    // Determine which state to show
    if (loggedEmail && loggedEmail === inv.email.toLowerCase()) {
      setPageState('accept_direct');
    } else if (inv.is_existing_user) {
      setPageState('login');
    } else {
      setPageState('register');
    }
  }, []);

  useEffect(() => { if (token) fetchInvitation(token); }, [token, fetchInvitation]);

  // Reset the workspace-switcher tooltip so the new member sees it when they land in the app
  const resetWsTooltip = () => {
    try {
      localStorage.removeItem('ws_tooltip_first');
      sessionStorage.removeItem('ws_tooltip_dismissed');
    } catch { /* storage blocked */ }
  };

  const handleDecline = async (tok = token) => {
    const res  = await fetch(`/api/invitations/${token}/decline`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setPageError(data.error); return; }
    setPageState('done_decline');
  };

  const handleAcceptDirect = async () => {
    setSubmitting(true);
    const res  = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setFormError(data.error); return; }
    resetWsTooltip();
    setPageState('done_accept');
  };

  // Google OAuth — redirect back here after auth
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=invitations/${token}`,
      },
    });
  };

  // Case 1: existing user — login then accept
  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password,
    });
    if (signInErr) { setFormError('Hibás jelszó. Próbáld újra.'); setSubmitting(false); return; }

    const res  = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error); setSubmitting(false); return; }
    resetWsTooltip();
    setPageState('done_accept');
  };

  // Case 2: new user — register then sign in then accept
  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (password !== password2)  { setFormError('A két jelszó nem egyezik.'); return; }
    if (password.length < 8)     { setFormError('A jelszó legalább 8 karakter legyen.'); return; }
    if (!/[A-Z]/.test(password)) { setFormError('Legyen benne legalább egy nagybetű.'); return; }
    if (!/[0-9]/.test(password)) { setFormError('Legyen benne legalább egy szám.'); return; }
    setSubmitting(true);

    const regRes  = await fetch(`/api/invitations/${token}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password }),
    });
    const regData = await regRes.json();

    if (!regRes.ok) {
      if (regData.error === 'RETRACTED')       setPageState('retracted');
      else if (regData.error === 'ALREADY_EXISTS') setFormError('Ez az e-mail cím már regisztrálva van. Kérjük, jelentkezz be.');
      else setFormError(regData.error || 'Hiba a regisztráció során.');
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
    if (signInErr) { setFormError(signInErr.message); setSubmitting(false); return; }

    const accRes  = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const accData = await accRes.json();
    if (!accRes.ok) { setFormError(accData.error); setSubmitting(false); return; }

    resetWsTooltip();
    setPageState('done_accept');
  };

  // ── Shell ─────────────────────────────────────────────────────────────────
  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e293b', borderRadius: 10, padding: '0.5rem 1rem' }}>
            <Users size={16} color="#94a3b8" />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Epiteq</span>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );

  // ── Terminal states ────────────────────────────────────────────────────────
  if (pageState === 'loading') return shell(
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <Loader2 size={28} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (pageState === 'error') return shell(
    <div style={{ padding: '2.5rem', textAlign: 'center' }}>
      <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>A meghívó nem található</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{pageError}</p>
    </div>
  );

  if (pageState === 'retracted') return shell(
    <div style={{ padding: '2.5rem', textAlign: 'center' }}>
      <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>Ez a meghívó már nem érvényes</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7 }}>
        Kérjük, vedd fel a kapcsolatot azzal a személlyel, aki meghívott.
      </p>
    </div>
  );

  if (pageState === 'done_accept') return shell(
    <div style={{ padding: '2.5rem', textAlign: 'center' }}>
      <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>Sikeresen csatlakoztál!</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Mostantól tagja vagy a(z) <strong style={{ color: '#1e293b' }}>{invitation?.collective_name}</strong> kollektívának.
      </p>
      <a href="/projektek" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#1e293b', color: '#fff', borderRadius: 9, fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}>
        Ugrás az irányítópultra
      </a>
    </div>
  );

  if (pageState === 'done_decline') return shell(
    <div style={{ padding: '2.5rem', textAlign: 'center' }}>
      <XCircle size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>Meghívó visszautasítva</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
        Visszautasítottad a(z) <strong>{invitation?.collective_name}</strong> kollektíva meghívóját. A tulajdonos értesítést kapott.
      </p>
    </div>
  );

  // ── Invitation header (shared) ─────────────────────────────────────────────
  const invHeader = (
    <div style={{ background: '#1e293b', padding: '1.75rem 2rem' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Meghívta: <strong style={{ color: '#94a3b8' }}>{invitation?.inviter_name}</strong>
      </p>
      <h1 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>
        {invitation?.collective_name}
      </h1>
    </div>
  );

  const freeNote = (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
      <p style={{ margin: '0 0 5px', fontWeight: 800, fontSize: '0.85rem', color: '#15803d' }}>
        Ingyenes fiók — bankkártya és előfizetés nélkül
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {['Részt vehetsz a közös projektekben', 'Bármikor válthatsz Prémiumra'].map(item => (
          <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#166534' }}>
            <Check size={12} style={{ flexShrink: 0 }} />{item}
          </li>
        ))}
      </ul>
    </div>
  );

  const formErrorBlock = formError && (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem', borderRadius: 8, fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '1rem' }}>
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{formError}</span>
    </div>
  );

  const emailField = (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>E-mail cím</label>
      <input
        type="email" value={invitation?.email || ''} readOnly
        style={{ width: '100%', padding: '0.72rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', background: '#f8fafc', color: '#94a3b8', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'not-allowed' }}
      />
    </div>
  );

  const submitBtn = (label) => (
    <button type="submit" disabled={submitting}
      style={{ width: '100%', padding: '13px', background: submitting ? '#334155' : '#16a34a', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
      {submitting ? 'Kérjük várj…' : label}
    </button>
  );

  // ── Case: already logged in with matching email ────────────────────────────
  if (pageState === 'accept_direct') return shell(
    <>
      {invHeader}
      <div style={{ padding: '1.75rem 2rem' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#1d4ed8', lineHeight: 1.6 }}>
          Be vagy jelentkezve mint <strong>{sessionEmail}</strong>.
        </div>
        {formErrorBlock}
        <button
          onClick={handleAcceptDirect} disabled={submitting}
          style={{ width: '100%', padding: '13px', background: submitting ? '#334155' : '#16a34a', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.65rem' }}>
          {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
          {submitting ? 'Kérjük várj…' : 'Meghívó elfogadása'}
        </button>
        <button onClick={handleDecline} style={{ width: '100%', padding: '13px', background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 9, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          <XCircle size={15} style={{ display: 'inline', marginRight: 6 }} />Visszautasítás
        </button>
      </div>
    </>
  );

  // ── Case 1: existing user — login ──────────────────────────────────────────
  if (pageState === 'login') return shell(
    <>
      {invHeader}
      <div style={{ padding: '1.75rem 2rem' }}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
          Van már Epiteq fiókod. Jelentkezz be a meghívó elfogadásához.
        </p>

        {/* Google OAuth button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.72rem', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1rem' }}
        >
          <GoogleIcon /> Google-lel folytatom
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>vagy jelszóval</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {formErrorBlock}
        <form onSubmit={handleLogin}>
          {emailField}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Jelszó *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password" required autoFocus placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.72rem 0.875rem 0.72rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <Lock size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          {submitBtn('Bejelentkezés és csatlakozás')}
        </form>
      </div>
    </>
  );

  // ── Case 2: new user — register ────────────────────────────────────────────
  return shell(
    <>
      {invHeader}
      <div style={{ padding: '1.75rem 2rem' }}>
        {/* What is Epiteq */}
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
          <strong style={{ color: '#1e293b' }}>Epiteq</strong> egy közös munkaterület projektek kezelésére és csapatmunkára — ajánlatoktól a naplóig. Meghívtak, hogy együttdolgozzatok a <strong style={{ color: '#1e293b' }}>{invitation?.collective_name}</strong> kollektívában.
        </p>

        {freeNote}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.72rem', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1rem' }}
        >
          <GoogleIcon /> Google-lel regisztrálok
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>vagy e-mail és jelszó</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {formErrorBlock}
        <form onSubmit={handleRegister}>
          {emailField}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Teljes neved *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text" required autoFocus placeholder="Kovács János"
                value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '0.72rem 0.875rem 0.72rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <User size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Jelszó *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password" required placeholder="min. 8 karakter, nagybetű, szám"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.72rem 0.875rem 0.72rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <Lock size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Jelszó megerősítése *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password" required placeholder="••••••••"
                value={password2} onChange={e => setPassword2(e.target.value)}
                style={{ width: '100%', padding: '0.72rem 0.875rem 0.72rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <Lock size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          {submitBtn('Fiók létrehozása és csatlakozás')}
        </form>
      </div>
    </>
  );
}
