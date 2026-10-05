'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Building2, Lock, Mail, AlertCircle, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Hiba a bejelentkezés során. Ellenőrizze az adatokat!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '420px', paddingTop: '2.5rem' }}>
      <div className="card" style={{ padding: '2rem 1.75rem', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              margin: '0 auto 0.85rem', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Building2 size={24} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Epitünk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Közösségi koordináció és költségmegosztó
          </p>
        </div>

        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger-text)', 
              padding: '0.65rem 0.85rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email cím</label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                required
                className="form-control"
                placeholder="pelda@epitek.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
              <Mail 
                size={16} 
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">Jelszó</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
              <Lock 
                size={16} 
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full btn-touch" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Bejelentkezés...' : 'Belépés'}
          </button>
        </form>

      </div>
    </div>
  );
}
