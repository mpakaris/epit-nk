'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';

const BRAND = '#0f172a';
const ACCENT = '#2563eb';
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

export default function PortalLoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [step, setStep]           = useState('email'); // 'email' | 'otp'
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);
  const [error, setError]         = useState('');
  const [cooldown, setCooldown]   = useState(0);
  const codeRef = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/portal/dashboard');
      else setChecking(false);
    });
  }, []);

  // Resend cooldown timer
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
      setError(e.message || 'Hiba történt. Próbáld újra.');
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
      router.replace('/portal/dashboard');
    } catch (e) {
      setError('Érvénytelen vagy lejárt kód. Kérj új kódot.');
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

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: BRAND, padding: '2rem 2rem 1.75rem', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.3rem' }}>🏗</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Ügyfél portál</h1>
          <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            {step === 'email' ? 'Add meg az email-címedet a belépéshez' : `Kódot küldtük: ${email}`}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem 1.75rem 2rem' }}>

          {step === 'email' ? (
            <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
                  Email-cím
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="pelda@email.hu"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: 10, padding: '0.7rem 0.9rem',
                    fontSize: '0.95rem', outline: 'none',
                    fontFamily: FONT, background: '#f8fafc',
                  }}
                />
              </div>

              {error && <p style={{ margin: 0, fontSize: '0.825rem', color: '#dc2626' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.8rem',
                  background: loading || !email.trim() ? '#e2e8f0' : ACCENT,
                  color: loading || !email.trim() ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 10, fontSize: '0.925rem',
                  fontWeight: 700, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: FONT, transition: 'background 0.15s',
                }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Küldés…</>
                  : <>Belépési kód küldése <ArrowRight size={16} /></>
                }
              </button>
            </form>

          ) : (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: BRAND, display: 'block', marginBottom: '0.4rem' }}>
                  6 jegyű belépési kód
                </label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="123456"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: 10, padding: '0.7rem 0.9rem',
                    fontSize: '1.4rem', letterSpacing: '0.25em', textAlign: 'center',
                    outline: 'none', fontFamily: 'monospace', background: '#f8fafc',
                  }}
                />
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>
                  Ellenőrizd a spam mappát is. A kód 10 percig érvényes.
                </p>
              </div>

              {error && <p style={{ margin: 0, fontSize: '0.825rem', color: '#dc2626' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || code.trim().length !== 6}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.8rem',
                  background: loading || code.trim().length !== 6 ? '#e2e8f0' : ACCENT,
                  color: loading || code.trim().length !== 6 ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 10, fontSize: '0.925rem',
                  fontWeight: 700, cursor: loading || code.trim().length !== 6 ? 'not-allowed' : 'pointer',
                  fontFamily: FONT, transition: 'background 0.15s',
                }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Belépés…</>
                  : <>Belépés <ArrowRight size={16} /></>
                }
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b', fontFamily: FONT, padding: 0 }}
                >
                  ← Más email
                </button>
                <button
                  type="button"
                  onClick={cooldown > 0 ? undefined : sendOtp}
                  disabled={cooldown > 0 || loading}
                  style={{
                    background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer',
                    fontSize: '0.8rem', color: cooldown > 0 ? '#94a3b8' : ACCENT,
                    fontFamily: FONT, padding: 0,
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  <RotateCcw size={12} />
                  {cooldown > 0 ? `Újraküldés (${cooldown}s)` : 'Új kód küldése'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.775rem', color: '#94a3b8', textAlign: 'center' }}>
        Nem kell regisztrálni. Csak az email-címed szükséges.
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
