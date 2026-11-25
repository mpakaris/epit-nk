'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, CheckCircle2, XCircle, Loader2, AlertCircle, Lock, User } from 'lucide-react';

// ── Design tokens (matches dk system) ────────────────────────────────────────
const T = {
  sand:     '#EDEBE5',
  sandDark: '#D5D2C8',
  white:    '#FFFFFF',
  ink:      '#0E1116',
  inkMid:   '#3A3F4A',
  inkMute:  '#6B7080',
  navy:     '#1F2A3C',
  green:    '#0A6B5E',
  greenBg:  '#D4EDE9',
  red:      '#B71C1C',
  redBg:    '#FDECEC',
  blue:     '#1D4ED8',
  blueBg:   '#EFF6FF',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ── Shell wrapper ─────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.sand,
      fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: T.ink,
        }}>
          okosszaki<span style={{ color: '#6F93FF' }}>.</span>
        </span>
      </div>

      {/* Card */}
      <div style={{
        maxWidth: 480, width: '100%',
        background: T.white,
        borderRadius: 24,
        boxShadow: 'inset 0 1px 0 #fff, 0 16px 48px -12px rgba(14,17,22,0.18), 0 4px 10px -4px rgba(14,17,22,0.08)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────
function CollectiveHeader({ invitation }) {
  return (
    <div style={{ background: T.navy, padding: '24px 28px' }}>
      {/* Glow decoration */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -120, width: 280, height: 280, borderRadius: 140, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Meghívta: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{invitation?.inviter_name}</strong>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={20} color="rgba(255,255,255,0.8)" aria-hidden="true" />
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {invitation?.collective_name}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, readOnly, placeholder, autoFocus, icon: Icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.inkMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={15} color={T.inkMute} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: Icon ? '12px 14px 12px 38px' : '12px 14px',
            border: `1.5px solid ${readOnly ? T.sandDark : T.sandDark}`,
            borderRadius: 14, fontSize: 15, outline: 'none',
            background: readOnly ? T.sand : T.white,
            color: readOnly ? T.inkMute : T.ink,
            fontFamily: 'inherit',
            cursor: readOnly ? 'not-allowed' : 'text',
          }}
        />
      </div>
    </div>
  );
}

function PrimaryBtn({ onClick, type = 'button', disabled, loading, children, color = T.green }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', height: 52, border: 0, borderRadius: 26,
        background: loading || disabled ? T.sandDark : color,
        color: loading || disabled ? T.inkMute : '#fff',
        fontWeight: 800, fontSize: 16, cursor: loading || disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.15s',
      }}
    >
      {loading && <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', height: 48, border: `1.5px solid ${T.sandDark}`, borderRadius: 24,
        background: T.white, color: T.red,
        fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10,
      }}
    >
      {children}
    </button>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: '#FDECEC', border: `1px solid #FECACA`, color: T.red, padding: '10px 14px', borderRadius: 12, fontSize: 14, display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start' }}>
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{message}</span>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: T.sandDark }} />
      <span style={{ fontSize: 12, color: T.inkMute, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.sandDark }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvitationPage({ params }) {
  const [token, setToken]           = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [pageState, setPageState]   = useState('loading');
  const [sessionEmail, setSessionEmail] = useState(null);
  const [name, setName]             = useState('');
  const [password, setPassword]     = useState('');
  const [password2, setPassword2]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [pageError, setPageError]   = useState('');

  useEffect(() => { Promise.resolve(params).then(p => setToken(p.token)); }, [params]);

  const fetchInvitation = useCallback(async (tok) => {
    const supabase = createClient();
    const [invRes, { data: { session } }] = await Promise.all([
      fetch(`/api/invitations/${tok}`),
      supabase.auth.getSession(),
    ]);
    const data = await invRes.json();
    if (!invRes.ok) { setPageState('error'); setPageError(data.error || 'A meghívó nem található'); return; }

    const inv = data.invitation;
    const loggedEmail = session?.user?.email?.toLowerCase() ?? null;
    setInvitation(inv);
    setSessionEmail(loggedEmail);

    if (inv.status === 'retracted') { setPageState('retracted'); return; }
    if (inv.status === 'accepted')  { setPageState('done_accept'); return; }
    if (inv.status === 'declined')  { setPageState('done_decline'); return; }

    const isDeclineLink = new URLSearchParams(window.location.search).get('decline') === '1';
    if (isDeclineLink) {
      const res = await fetch(`/api/invitations/${tok}/decline`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setPageState('error'); setPageError(body.error); return; }
      setPageState('done_decline');
      return;
    }

    if (loggedEmail && loggedEmail === inv.email.toLowerCase()) setPageState('accept_direct');
    else if (inv.is_existing_user) setPageState('login');
    else setPageState('register');
  }, []);

  useEffect(() => { if (token) fetchInvitation(token); }, [token, fetchInvitation]);

  const resetWsTooltip = () => {
    try { localStorage.removeItem('ws_tooltip_first'); sessionStorage.removeItem('ws_tooltip_dismissed'); } catch {}
  };

  const handleDecline = async () => {
    const res = await fetch(`/api/invitations/${token}/decline`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setPageError(data.error); return; }
    setPageState('done_decline');
  };

  const handleAcceptDirect = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setFormError(data.error); return; }
    resetWsTooltip();
    setPageState('done_accept');
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=invitations/${token}` },
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
    if (signInErr) { setFormError('Hibás jelszó. Próbáld újra.'); setSubmitting(false); return; }
    const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error); setSubmitting(false); return; }
    resetWsTooltip();
    setPageState('done_accept');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (password !== password2)  { setFormError('A két jelszó nem egyezik.'); return; }
    if (password.length < 8)     { setFormError('A jelszó legalább 8 karakter legyen.'); return; }
    if (!/[A-Z]/.test(password)) { setFormError('Legyen benne legalább egy nagybetű.'); return; }
    if (!/[0-9]/.test(password)) { setFormError('Legyen benne legalább egy szám.'); return; }
    setSubmitting(true);
    const regRes = await fetch(`/api/invitations/${token}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      if (regData.error === 'RETRACTED') setPageState('retracted');
      else if (regData.error === 'ALREADY_EXISTS') setFormError('Ez az e-mail cím már regisztrálva van. Kérjük, jelentkezz be.');
      else setFormError(regData.error || 'Hiba a regisztráció során.');
      setSubmitting(false);
      return;
    }
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
    if (signInErr) { setFormError(signInErr.message); setSubmitting(false); return; }
    const accRes = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    const accData = await accRes.json();
    if (!accRes.ok) { setFormError(accData.error); setSubmitting(false); return; }
    resetWsTooltip();
    setPageState('done_accept');
  };

  // ── Terminal states ───────────────────────────────────────────────────────

  if (pageState === 'loading') return (
    <Shell>
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={30} color={T.navy} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  );

  if (pageState === 'error') return (
    <Shell>
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={28} color={T.red} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontWeight: 800, color: T.ink, fontSize: '1.3rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>A meghívó nem található</h2>
        <p style={{ color: T.inkMute, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{pageError}</p>
      </div>
    </Shell>
  );

  if (pageState === 'retracted') return (
    <Shell>
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: '#FFF7E6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={28} color="#B45309" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontWeight: 800, color: T.ink, fontSize: '1.3rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Ez a meghívó már nem érvényes</h2>
        <p style={{ color: T.inkMute, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Kérjük, vedd fel a kapcsolatot azzal a személlyel, aki meghívott.
        </p>
      </div>
    </Shell>
  );

  if (pageState === 'done_accept') return (
    <Shell>
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: T.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={28} color={T.green} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontWeight: 800, color: T.ink, fontSize: '1.3rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Sikeresen csatlakoztál!</h2>
        <p style={{ color: T.inkMute, fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Mostantól tagja vagy a(z) <strong style={{ color: T.ink }}>{invitation?.collective_name}</strong> kollektívának.
        </p>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: T.navy, color: '#fff', borderRadius: 22, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
          Ugrás az irányítópultra
        </a>
      </div>
    </Shell>
  );

  if (pageState === 'done_decline') return (
    <Shell>
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: T.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <XCircle size={28} color={T.red} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontWeight: 800, color: T.ink, fontSize: '1.3rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Meghívó visszautasítva</h2>
        <p style={{ color: T.inkMute, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Visszautasítottad a(z) <strong style={{ color: T.ink }}>{invitation?.collective_name}</strong> kollektíva meghívóját. A tulajdonos értesítést kapott.
        </p>
      </div>
    </Shell>
  );

  // ── Active states ─────────────────────────────────────────────────────────

  const body = { padding: '24px 28px' };

  // Already logged in with matching email
  if (pageState === 'accept_direct') return (
    <Shell>
      <CollectiveHeader invitation={invitation} />
      <div style={body}>
        <div style={{ background: T.blueBg, border: `1px solid #BFDBFE`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: T.blue, lineHeight: 1.6 }}>
          Be vagy jelentkezve mint <strong>{sessionEmail}</strong>.
        </div>
        <ErrorBox message={formError} />
        <PrimaryBtn onClick={handleAcceptDirect} loading={submitting}>
          {!submitting && <CheckCircle2 size={17} />}
          {submitting ? 'Kérjük várj…' : 'Meghívó elfogadása'}
        </PrimaryBtn>
        <SecondaryBtn onClick={handleDecline}>
          <XCircle size={16} /> Visszautasítás
        </SecondaryBtn>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Shell>
  );

  // Existing user — login
  if (pageState === 'login') return (
    <Shell>
      <CollectiveHeader invitation={invitation} />
      <div style={body}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: T.inkMid, lineHeight: 1.7 }}>
          Van már OkosSzaki fiókod. Jelentkezz be a meghívó elfogadásához.
        </p>
        <button type="button" onClick={handleGoogleLogin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, border: `1.5px solid ${T.sandDark}`, borderRadius: 24, background: T.white, fontWeight: 700, fontSize: 15, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 }}>
          <GoogleIcon /> Google-lel folytatom
        </button>
        <Divider label="vagy jelszóval" />
        <ErrorBox message={formError} />
        <form onSubmit={handleLogin}>
          <InputField label="E-mail cím" type="email" value={invitation?.email || ''} readOnly />
          <InputField label="Jelszó" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoFocus icon={Lock} />
          <div style={{ marginTop: 20 }}>
            <PrimaryBtn type="submit" loading={submitting}>
              {!submitting && <CheckCircle2 size={17} />}
              {submitting ? 'Kérjük várj…' : 'Bejelentkezés és csatlakozás'}
            </PrimaryBtn>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Shell>
  );

  // New user — register
  return (
    <Shell>
      <CollectiveHeader invitation={invitation} />
      <div style={body}>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: T.inkMid, lineHeight: 1.7 }}>
          <strong style={{ color: T.ink }}>OkosSzaki</strong> egy közös munkaterület projektek és csapatmunka kezelésére. Meghívtak, hogy együttdolgozzatok a <strong style={{ color: T.ink }}>{invitation?.collective_name}</strong> kollektívában.
        </p>

        {/* Free account note */}
        <div style={{ background: T.greenBg, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 13, color: T.green }}>Ingyenes fiók — bankkártya nélkül</p>
          {['Részt vehetsz a közös projektekben', 'Bármikor válthatsz Prémiumra'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0A5C53', marginTop: 4 }}>
              <CheckCircle2 size={13} style={{ flexShrink: 0 }} />{item}
            </div>
          ))}
        </div>

        <button type="button" onClick={handleGoogleLogin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, border: `1.5px solid ${T.sandDark}`, borderRadius: 24, background: T.white, fontWeight: 700, fontSize: 15, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 }}>
          <GoogleIcon /> Google-lel regisztrálok
        </button>

        <Divider label="vagy e-mail és jelszó" />

        <ErrorBox message={formError} />
        <form onSubmit={handleRegister}>
          <InputField label="E-mail cím" type="email" value={invitation?.email || ''} readOnly />
          <InputField label="Teljes neved *" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Kovács János" autoFocus icon={User} />
          <InputField label="Jelszó *" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 8 karakter, nagybetű, szám" icon={Lock} />
          <InputField label="Jelszó megerősítése *" type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" icon={Lock} />
          <div style={{ marginTop: 20 }}>
            <PrimaryBtn type="submit" loading={submitting}>
              {!submitting && <CheckCircle2 size={17} />}
              {submitting ? 'Kérjük várj…' : 'Fiók létrehozása és csatlakozás'}
            </PrimaryBtn>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Shell>
  );
}
