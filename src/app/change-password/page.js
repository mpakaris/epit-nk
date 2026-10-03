'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const { currentUser, changePassword } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A jelszónak legalább 6 karakterből kell állnia!');
      return;
    }
    if (password !== confirmPassword) {
      setError('A megadott jelszavak nem egyeznek meg!');
      return;
    }

    setLoading(true);
    try {
      await changePassword(password);
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
          <div 
            style={{ 
              width: '52px', 
              height: '52px', 
              margin: '0 auto 1rem', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-light)'
            }}
          >
            <KeyRound size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Jelszó módosítása
          </h1>
          {currentUser?.must_change_password ? (
            <p style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>
              Biztonsági okokból első belépéskor új jelszót kell beállítania!
            </p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Adja meg új hozzáférési jelszavát.
            </p>
          )}
        </div>

        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger)', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">Új jelszó</label>
            <input
              id="new-password"
              type="password"
              required
              className="form-control"
              placeholder="Legalább 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="confirm-password">Új jelszó megerősítése</label>
            <input
              id="confirm-password"
              type="password"
              required
              className="form-control"
              placeholder="Ismételje meg a jelszót"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full btn-lg" 
            disabled={loading}
          >
            {loading ? 'Mentés folyamatban...' : 'Jelszó mentése és tovább'}
          </button>
        </form>
      </div>
    </div>
  );
}
