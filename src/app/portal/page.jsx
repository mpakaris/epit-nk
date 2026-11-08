'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import { PORTAL_I18N } from '@/lib/landingI18n';
import { useLandingLocale } from '@/hooks/useLandingLocale';

const BRAND = '#0f172a';
const ACCENT = '#2563eb';
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const PORTAL_AUTH_KEY = 'portal_auth_at';

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const [locale] = useLandingLocale();
  const i = PORTAL_I18N[locale] || PORTAL_I18N.hu;

  const [supabase] = useState(() => createClient());
  const [step, setStep]         = useState('email');
  const [email, setEmail]       = useState(prefillEmail);
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError]       = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/portal/dashboard');
      else setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
      setCooldown(60);
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e) {
      setError(e.message || i.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
      localStorage.setItem(PORTAL_AUTH_KEY, String(Date.now()));
      router.replace('/portal/dashboard');
    } catch (e) {
      setError(i.errInvalidOtp);
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div style={{
      minHeight: '100vh', background: '#f1f5f9',
      fontFamily: FONT, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        <div style={{ background: BRAND, padding: '2rem 2rem 1.75rem', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.3rem' }}>🏗</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>{i.title}</h1>
          <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            {step === 'email' ? i.emailStepSubtitle : `${i.otpStepSubtitle} ${email}`}
          </p>
        </div>

        <div style={{ padding: '1.75rem 1.75rem 2rem' }}>
          {step === 'email' ? (
            <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
                  {i.emailLabel}
                </label>
                <input
                  type="email" autoFocus required value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder={i.emailPh}
                  style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.95rem', outline: 'none', fontFamily: FONT, background: '#f8fafc' }}
                />
              </div>
              {error && <p style={{ margin: 0, fontSize: '0.825rem', color: '#dc2626' }}>{error}</p>}
              <button type="submit" disabled={loading || !email.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.8rem', background: loading || !email.trim() ? '#e2e8f0' : ACCENT, color: loading || !email.trim() ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontSize: '0.925rem', fontWeight: 700, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', fontFamily: FONT, transition: 'background 0.15s' }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {i.sendingBtn}</> : <>{i.sendCodeBtn} <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
                  {i.otpLabel}
                </label>
                <input
                  ref={codeRef} type="text" inputMode="numeric" maxLength={6} required
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="123456"
                  style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '1.4rem', letterSpacing: '0.25em', textAlign: 'center', outline: 'none', fontFamily: 'monospace', background: '#f8fafc' }}
                />
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>{i.otpHint}</p>
              </div>
              {error && <p style={{ margin: 0, fontSize: '0.825rem', color: '#dc2626' }}>{error}</p>}
              <button type="submit" disabled={loading || code.trim().length !== 6}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.8rem', background: loading || code.trim().length !== 6 ? '#e2e8f0' : ACCENT, color: loading || code.trim().length !== 6 ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontSize: '0.925rem', fontWeight: 700, cursor: loading || code.trim().length !== 6 ? 'not-allowed' : 'pointer', fontFamily: FONT, transition: 'background 0.15s' }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {i.loggingIn}</> : <>{i.loginBtn} <ArrowRight size={16} /></>}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b', fontFamily: FONT, padding: 0 }}>
                  {i.backEmail}
                </button>
                <button type="button" onClick={cooldown > 0 ? undefined : sendOtp} disabled={cooldown > 0 || loading}
                  style={{ background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: '0.8rem', color: cooldown > 0 ? '#94a3b8' : ACCENT, fontFamily: FONT, padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <RotateCcw size={12} />
                  {cooldown > 0 ? i.resendCooldown.replace('{s}', cooldown) : i.resendBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.775rem', color: '#94a3b8', textAlign: 'center' }}>
        {i.noRegNote}
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PortalLoginPage() {
  return <Suspense><PortalLoginForm /></Suspense>;
}
