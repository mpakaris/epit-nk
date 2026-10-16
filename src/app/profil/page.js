'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ProfilPage() {
  const { currentUser } = useApp();

  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [companyName,     setCompanyName]     = useState('');
  const [street,          setStreet]          = useState('');
  const [streetNumber,    setStreetNumber]    = useState('');
  const [zip,             setZip]             = useState('');
  const [city,            setCity]            = useState('');
  const [taxNumber,       setTaxNumber]       = useState('');
  const [defaultTaxPct,   setDefaultTaxPct]   = useState('27');

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ profile }) => {
        if (!profile) return;
        setFirstName(profile.first_name       || '');
        setLastName(profile.last_name         || '');
        setCompanyName(profile.company_name   || '');
        setStreet(profile.street              || '');
        setStreetNumber(profile.street_number || '');
        setZip(profile.zip                    || '');
        setCity(profile.city                  || '');
        setTaxNumber(profile.tax_number       || '');
        setDefaultTaxPct(profile.default_tax_percent != null ? String(profile.default_tax_percent) : '27');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:          firstName.trim()    || null,
          last_name:           lastName.trim()     || null,
          company_name:        companyName.trim()  || null,
          street:              street.trim()       || null,
          street_number:       streetNumber.trim() || null,
          zip:                 zip.trim()          || null,
          city:                city.trim()         || null,
          tax_number:          taxNumber.trim()    || null,
          default_tax_percent: defaultTaxPct !== '' ? Number(defaultTaxPct) : 27,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a mentéskor');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: '2rem' }}><Loader2 size={20} className="animate-spin" /></div>;

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div style={{ padding: '0.85rem 0 1.5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} /> Profil &amp; fejléc
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Ez az adat jelenik meg az ajánlatok fejlécében a „Tól:" mezőként.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
          </div>
        )}
        {success && (
          <div style={{ background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #86efac)', color: 'var(--success-text, #166534)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />Adatok elmentve!
          </div>
        )}

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Cégnév <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ha van)</span></label>
          <input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="pl. Kovács Építő Kft." />
        </div>

        <div className="grid-2col" style={{ gap: '0.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Keresztnév</label>
            <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. János" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vezetéknév</label>
            <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" />
          </div>
        </div>

        <div className="grid-2col" style={{ gap: '0.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Utca</label>
            <input type="text" className="form-control" value={street} onChange={e => setStreet(e.target.value)} placeholder="pl. Fő utca" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Házszám</label>
            <input type="text" className="form-control" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="pl. 12/A" />
          </div>
        </div>

        <div className="grid-2col" style={{ gap: '0.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Irányítószám</label>
            <input type="text" className="form-control" value={zip} onChange={e => setZip(e.target.value)} placeholder="pl. 1234" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Város</label>
            <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="pl. Budapest" />
          </div>
        </div>

        <div className="grid-2col" style={{ gap: '0.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Adószám</label>
            <input type="text" className="form-control" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="pl. 12345678-2-41" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Alapértelmezett ÁFA (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="form-control" value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} placeholder="27" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" />Mentés…</> : 'Mentés'}
          </button>
        </div>
      </form>
    </div>
  );
}
