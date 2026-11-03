'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import PageSpinner from '@/components/PageSpinner';
import WorkspacePicker from '@/components/mobile/WorkspacePicker';
import { ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const { loading, dataReady, createClient, effectiveCollectives, isDemoMode } = useApp();
  const t = useTranslations('clients');
  const tf = useTranslations('forms');
  const tc = useTranslations('common');

  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const collectives = (effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name }));

  // Mobile step: 1 = workspace info (only if has collectives), 2 = form
  const [mobileStep, setMobileStep] = useState(1);

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gdpr, setGdpr]   = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())  { setError(tf('nameRequired')); return; }
    if (!gdpr)         { setError(t('gdprRequired')); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await createClient({ name: name.trim(), email: email.trim(), phone: phone.trim(), gdprConsent: gdpr });
      router.push(`${navPrefix}/ugyfelek`);
    } catch (err) {
      setError(err.message || t('createError'));
      setIsSubmitting(false);
    }
  };

  if (loading || !dataReady) return <PageSpinner />;

  // ── Mobile step 1: workspace info (personal only) ──
  if (collectives.length > 0 && mobileStep === 1) {
    return (
      <WorkspacePicker
        collectives={collectives}
        selected={null}
        onChange={() => {}}
        onClose={() => router.back()}
        onNext={() => setMobileStep(2)}
        typeLabel="ügyfél"
        personalOnly
      />
    );
  }

  return (
    <div className="container page-body" style={{ maxWidth: '480px' }}>

      {/* ── Mobile step-2 top bar ── */}
      <div className="show-mobile" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button
            type="button"
            onClick={() => collectives.length > 0 ? setMobileStep(1) : router.back()}
            style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}
            aria-label={tc('back')}
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={1.75} />
          </button>
          {collectives.length > 0 && (
            <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>2 / 2</span>
          )}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '34px', marginBottom: 8 }}>
          {tf('newClient')}
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24 }}>
          {t('gdprNotice')}
        </p>
      </div>

      {/* ── Desktop header ── */}
      <div className="hide-mobile">
        <div style={{ padding: '0.85rem 0 0.25rem' }}>
          <AppLink href={`${navPrefix}/ugyfelek`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
            <ArrowLeft size={15} /> {t('back')}
          </AppLink>
        </div>
        <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <h1 className="page-title">{tf('newClient')}</h1>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="cl-name">{tf('nameLabel')}</label>
          <input
            id="cl-name" type="text" className="form-control"
            required autoFocus
            value={name} onChange={e => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cl-email">{tf('emailRequired')}</label>
          <input
            id="cl-email" type="email" className="form-control"
            required
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cl-phone">{tf('phone')}</label>
          <input
            id="cl-phone" type="tel" className="form-control"
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${gdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', margin: '1rem 0' }}>
          <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {tf('gdprConsent')} <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
          </span>
        </label>

        {/* Desktop submit */}
        <div className="hide-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>{tc('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !gdpr}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />{tc('creating')}</> : <><Check size={16} />{t('createClient')}</>}
          </button>
        </div>

        {/* Mobile sticky submit */}
        <div className="show-mobile" style={{ marginTop: 24 }}>
          <button
            type="submit"
            disabled={isSubmitting || !gdpr}
            style={{ width: '100%', height: 56, borderRadius: 999, background: gdpr ? '#0f172a' : '#94a3b8', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: gdpr ? 'pointer' : 'default' }}
          >
            {isSubmitting ? tc('creating') : t('createClient')}
          </button>
        </div>
      </form>
    </div>
  );
}
