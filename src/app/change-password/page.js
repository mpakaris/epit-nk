'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

function ChangePasswordInner() {
  const { currentUser, changePassword } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isResetFlow = !!resetToken;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A jelszónak legalább 8 karakterből kell állnia.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A megadott jelszavak nem egyeznek meg.');
      return;
    }

    setLoading(true);
    try {
      if (isResetFlow) {
        const res = await fetch('/api/auth/confirm-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Hiba történt.');
        setSuccess(true);
        setTimeout(() => router.push('/'), 2500);
      } else {
        await changePassword(password);
      }
    } catch (err) {
      setError(err.message || 'Hiba történt a jelszó megváltoztatásakor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', paddingTop: '3.5rem' }}>
      <div className="card" style={{ padding: '2.25rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px', height: '52px', margin: '0 auto 1rem',
            borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <KeyRound size={26} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Jelszó módosítása
          </h1>
          {!isResetFlow && currentUser?.must_change_password ? (
            <p style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>
              Biztonsági okokból első belépéskor új jelszót kell beállítania!
            </p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Adja meg új hozzáférési jelszavát.
            </p>
          )}
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Jelszó sikeresen megváltoztatva!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Átirányítás a bejelentkezési oldalra…</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem',
              }}>
                <AlertCircle size={18} /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">Új jelszó</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoFocus
                  className="form-control"
                  placeholder="Legalább 8 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" htmlFor="confirm-password">Jelszó megerősítése</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  className="form-control"
                  placeholder="Ismételje meg a jelszót"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? 'Mentés…' : 'Jelszó mentése'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordInner />
    </Suspense>
  );
}
