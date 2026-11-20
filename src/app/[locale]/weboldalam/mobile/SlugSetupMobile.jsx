'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { toSlug } from '@/lib/utils';
import { buildSuggestions, splitDisplayName } from '../components/utils';

const HDR  = '#1A3A5C';
const DEEP = '#121110';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 14px 22px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

// ── Shared micro-components ───────────────────────────────────────────────────
const ChevL  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>;
const ChevR  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>;
const CheckSvg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>;
const SpinSvg  = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'wbspin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-18 0"/></svg>;
const GlobeSvg = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
const WarnSvg  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
const CheckSmall = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>;
const XSmall   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;

// ── Trade selector (native select styled) ────────────────────────────────────
function TradeRow({ trades, value, onChange }) {
  const t = useTranslations('website');
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', height: 52, border: '1.5px solid #E8E5DF', borderRadius: 16,
          background: '#fff', fontSize: 16, fontWeight: 500, color: value ? '#0E1116' : '#8A8F98',
          padding: '0 44px 0 16px', appearance: 'none', outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="">{t('tradeGeneral')}</option>
        {trades.map(tr => <option key={tr.id} value={tr.id}>{tr.name_hu}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8A8F98' }}>
        <ChevR />
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SlugSetupMobile({ displayName, onCreated }) {
  const router = useRouter();
  const t  = useTranslations('website');
  const tc = useTranslations('common');
  const { isDemoMode } = useApp();
  const p  = (path) => isDemoMode ? `/demo${path}` : path;

  const prefill = splitDisplayName(displayName);
  const [trades,     setTrades]     = useState([]);
  const [locale,     setLocale]     = useState('hu');
  const [tradeId,    setTradeId]    = useState('');
  const [lastName,   setLastName]   = useState(prefill.lastName);
  const [firstName,  setFirstName]  = useState(prefill.firstName);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [customSlug,   setCustomSlug]   = useState('');
  const [showCustom,   setShowCustom]   = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const checkTimer = useRef(null);

  const selectedTrade = trades.find(tr => tr.id === tradeId);
  const suggestions   = buildSuggestions(lastName, firstName, selectedTrade?.slug_prefix);
  const activeSlug    = showCustom ? customSlug : selectedSlug;
  const isReady       = activeSlug.length >= 3 && checkResult?.available && confirmed;

  useEffect(() => {
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  useEffect(() => {
    setSelectedSlug('');
    setCustomSlug('');
    setConfirmed(false);
    setCheckResult(null);
  }, [lastName, firstName, tradeId]);

  const checkSlug = useCallback((slug) => {
    clearTimeout(checkTimer.current);
    setCheckResult(null);
    if (!slug || slug.length < 3) return;
    setChecking(true);
    checkTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/website/slug-check?slug=${encodeURIComponent(slug)}`);
      const d = await r.json();
      setChecking(false);
      setCheckResult(d);
    }, 500);
  }, []);

  const pickSuggestion = (s) => {
    setSelectedSlug(s);
    setShowCustom(false);
    setConfirmed(false);
    checkSlug(s);
  };

  const handleCustomChange = (val) => {
    const cleaned = toSlug(val) || val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCustomSlug(cleaned);
    setConfirmed(false);
    checkSlug(cleaned);
  };

  const handleCreate = async () => {
    if (!isReady) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: activeSlug, trade_id: tradeId || null, locale }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || t('genericError')); return; }
      onCreated(d);
    } catch {
      setError(t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: DEEP, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes wbspin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        padding: '18px 16px 24px', borderRadius: '0 0 32px 32px',
        background: HDR, color: '#fff', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <span aria-hidden style={{ position: 'absolute', right: -80, top: -100, width: 260, height: 260, borderRadius: 130, background: 'rgba(255,255,255,0.07)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push(p('/dashboard'))}
            aria-label={tc('back')}
            style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
          >
            <ChevL />
          </button>
          <span style={{ width: 48 }} />
        </div>

        <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
          {t('websiteLabel')}
        </span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GlobeSvg />
          </span>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {t('slugSetupTitle')}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
              {t('slugSetupSubtitle')}
            </p>
          </div>
        </div>
      </header>

      {/* ── Form body ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Card: Name + Trade */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: CARD_SHADOW, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5A5F68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('lastNameLabel')}
              </label>
              <input
                type="text" value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={t('lastNamePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', height: 48, border: '1.5px solid #E8E5DF', borderRadius: 14, fontSize: 16, fontWeight: 500, color: '#0E1116', padding: '0 12px', outline: 'none', background: 'var(--m-sheet)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5A5F68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('firstNameLabel')}
              </label>
              <input
                type="text" value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', height: 48, border: '1.5px solid #E8E5DF', borderRadius: 14, fontSize: 16, fontWeight: 500, color: '#0E1116', padding: '0 12px', outline: 'none', background: 'var(--m-sheet)' }}
              />
            </div>
          </div>

          {/* Trade */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5A5F68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('tradeLabel')}
            </label>
            <TradeRow trades={trades} value={tradeId} onChange={(id) => { setTradeId(id); setConfirmed(false); }} />
          </div>
        </div>

        {/* Card: Website language */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: CARD_SHADOW, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5A5F68', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {t('websiteLanguageLabel')}
            </span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8A8F98', lineHeight: 1.4 }}>
              {t('websiteLanguageDesc')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'hu', label: t('langHu'), flag: '🇭🇺' },
              { key: 'de', label: t('langDe'), flag: '🇩🇪' },
              { key: 'en', label: t('langEn'), flag: '🇬🇧' },
            ].map(lang => {
              const sel = locale === lang.key;
              return (
                <button
                  key={lang.key} type="button"
                  onClick={() => setLocale(lang.key)}
                  style={{
                    flex: 1, height: 52, border: `2px solid ${sel ? HDR : '#E8E5DF'}`,
                    borderRadius: 16, background: sel ? '#EEF3F9' : 'var(--m-sheet)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <span style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? HDR : '#5A5F68' }}>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card: Slug suggestions */}
        {suggestions.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 24, boxShadow: CARD_SHADOW, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5A5F68', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pickLinkLabel')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#8A8F98', lineHeight: 1.4 }}>
              {t('pickLinkDesc')}
            </span>

            {suggestions.map(s => {
              const isSel = !showCustom && selectedSlug === s;
              return (
                <button
                  key={s} type="button"
                  onClick={() => pickSuggestion(s)}
                  style={{
                    width: '100%', minHeight: 56, boxSizing: 'border-box',
                    padding: '10px 14px', border: `2px solid ${isSel ? HDR : '#E8E5DF'}`,
                    borderRadius: 18, background: isSel ? '#EEF3F9' : 'var(--m-sheet)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: '#8A8F98' }}>okosszaki.hu/pro/</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isSel ? HDR : '#0E1116', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                  </span>
                  <span style={{ flexShrink: 0 }}>
                    {isSel && checking && <SpinSvg s={18} />}
                    {isSel && !checking && checkResult?.available === true  && <span style={{ color: '#14532D' }}><CheckSmall /></span>}
                    {isSel && !checking && checkResult?.available === false && <span style={{ color: '#B71C1C' }}><XSmall /></span>}
                    {!isSel && <span style={{ color: '#D5D2C8' }}><ChevR /></span>}
                  </span>
                </button>
              );
            })}

            {/* Custom slug toggle */}
            <button
              type="button"
              onClick={() => { setShowCustom(v => !v); setConfirmed(false); setCheckResult(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 10, background: '#F1F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {showCustom
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15l7-7 7 7"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7"/></svg>
                }
              </span>
              {t('customLinkToggle')}
            </button>

            {showCustom && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${checkResult?.available === false ? '#F87171' : checkResult?.available ? '#86EFAC' : '#E8E5DF'}`, borderRadius: 16, background: 'var(--m-sheet)', overflow: 'hidden' }}>
                  <span style={{ padding: '0 8px 0 14px', fontSize: 12, fontWeight: 600, color: '#8A8F98', whiteSpace: 'nowrap', flexShrink: 0, height: 52, display: 'flex', alignItems: 'center' }}>/pro/</span>
                  <input
                    type="text" value={customSlug}
                    onChange={e => handleCustomChange(e.target.value)}
                    placeholder="pl. kovacs-peter"
                    autoFocus
                    style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', padding: '0 10px', fontSize: 16, fontWeight: 600, color: '#0E1116', height: 52 }}
                  />
                  {checking && <span style={{ marginRight: 10 }}><SpinSvg s={16} /></span>}
                  {!checking && checkResult?.available === true  && <span style={{ marginRight: 10, color: '#14532D' }}><CheckSmall /></span>}
                  {!checking && checkResult?.available === false && <span style={{ marginRight: 10, color: '#B71C1C' }}><XSmall /></span>}
                </div>
                {checkResult?.available === true  && <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: '#14532D' }}>{t('slugFreeMessage')}</p>}
                {checkResult?.available === false && <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>{checkResult.reason || t('slugTakenFallback')}</p>}
              </div>
            )}

            {/* Taken message for suggestion */}
            {!showCustom && selectedSlug && checkResult?.available === false && (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>
                {checkResult.reason || t('slugTakenFallback')}
              </p>
            )}
          </div>
        )}

        {/* Card: Confirm warning */}
        {checkResult?.available && activeSlug && (
          <div style={{ background: '#FFFBEB', borderRadius: 24, boxShadow: CARD_SHADOW, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, border: '1.5px solid #FDE68A' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarnSvg />
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#92400E' }}>{t('slugPermanentWarningTitle')}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#92400E', lineHeight: 1.5 }}>
                  {t('slugPermanentWarningBody', { slug: activeSlug })}
                </p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 14, background: confirmed ? '#ECFDF5' : '#FEF9C3', border: `1.5px solid ${confirmed ? '#86EFAC' : '#FDE68A'}`, transition: 'background 0.15s, border-color 0.15s' }}>
              <input
                type="checkbox" checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: HDR, flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: confirmed ? '#14532D' : '#92400E' }}>{t('slugConfirmLabel')}</span>
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FDECEC', borderRadius: 16, padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#B71C1C', display: 'flex', alignItems: 'center', gap: 8 }}>
            <XSmall />{error}
          </div>
        )}
      </div>

      {/* ── Fixed bottom action ──────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0,
        boxSizing: 'border-box', padding: `16px 16px calc(18px + env(safe-area-inset-bottom))`,
        background: `linear-gradient(to top, ${DEEP} 60%, transparent)`,
      }}>
        <button
          onClick={handleCreate}
          disabled={!isReady || saving}
          style={{
            width: '100%', height: 60, border: 0, borderRadius: 30,
            background: isReady ? HDR : '#D5D2C8',
            color: isReady ? '#fff' : '#8A8F98',
            fontSize: 17, fontWeight: 700, cursor: isReady ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.2s, color 0.2s',
            boxShadow: isReady ? '0 14px 26px -12px rgba(26,58,92,0.5)' : 'none',
          }}
        >
          {saving ? <><SpinSvg s={20} />{t('slugCreatingButton')}</> : <><GlobeSvg />{t('slugCreateButton')}</>}
        </button>
      </div>
    </div>
  );
}
