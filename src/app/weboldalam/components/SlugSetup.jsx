'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Check, X, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toSlug } from '@/lib/utils';
import TradeSelect from './TradeSelect';
import { buildSuggestions, splitDisplayName } from './utils';

export default function SlugSetup({ displayName, onCreated }) {
  const prefill = splitDisplayName(displayName);
  const [trades, setTrades] = useState([]);
  const [tradeId, setTradeId] = useState('');
  const [lastName, setLastName] = useState(prefill.lastName);
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checkTimer = useRef(null);

  const selectedTrade = trades.find(t => t.id === tradeId);
  const suggestions = buildSuggestions(lastName, firstName, selectedTrade?.slug_prefix);
  const activeSlug = showCustom ? customSlug : selectedSlug;

  useEffect(() => {
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  // Re-select first suggestion when name or trade changes
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
    if (!confirmed || !checkResult?.available || !activeSlug) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: activeSlug, trade_id: tradeId || null }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Hiba történt'); return; }
      onCreated(d);
    } catch {
      setError('Hálózati hiba');
    } finally {
      setSaving(false);
    }
  };

  const isReady = activeSlug.length >= 3 && checkResult?.available && confirmed;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Globe size={22} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>Hozd létre weboldalad</h1>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Egyedi link, amelyet megoszthatsz ügyfelekkel</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Name fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vezetéknév</label>
            <input
              type="text" className="form-control"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Kovács"
              autoFocus
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Keresztnév</label>
            <input
              type="text" className="form-control"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="József"
            />
          </div>
        </div>

        {/* Trade */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Szakma</label>
          <TradeSelect
            trades={trades}
            value={tradeId}
            onChange={(id) => { setTradeId(id); setConfirmed(false); }}
          />
        </div>

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Válassz egy linket
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {suggestions.map(s => {
                const isSelected = !showCustom && selectedSlug === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    style={{
                      padding: '0.6rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'var(--primary-bg)' : 'var(--bg-subtle)',
                      color: isSelected ? 'var(--primary)' : 'var(--text)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 400,
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.1s, background 0.1s',
                    }}
                  >
                    <span>
                      <span style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.775rem', marginRight: '0.2rem' }}>
                        epitunk.hu/szakemberek/
                      </span>
                      <strong>{s}</strong>
                    </span>
                    {isSelected && (
                      checking
                        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                        : checkResult?.available
                          ? <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                          : checkResult?.available === false
                            ? <X size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                            : null
                    )}
                  </button>
                );
              })}
            </div>
            {/* Taken message */}
            {!showCustom && selectedSlug && checkResult?.available === false && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.775rem', color: 'var(--danger)' }}>
                {checkResult.reason || 'Ez a link már foglalt'}
              </p>
            )}
          </div>
        )}

        {/* Custom slug toggle */}
        <div>
          <button
            type="button"
            onClick={() => { setShowCustom(v => !v); setConfirmed(false); setCheckResult(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {showCustom ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Egyedi link megadása
          </button>

          {showCustom && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1px solid ${checkResult?.available === false ? 'var(--danger-border)' : checkResult?.available ? '#86efac' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)', overflow: 'hidden',
              }}>
                <span style={{ padding: '0 0.4rem 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  epitunk.hu/szakemberek/
                </span>
                <input
                  type="text" value={customSlug}
                  onChange={e => handleCustomChange(e.target.value)}
                  placeholder="sajat-link"
                  autoFocus
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.55rem 0.4rem 0.55rem 0', fontSize: '0.9rem', fontWeight: 600 }}
                />
                <span style={{ padding: '0 0.65rem', display: 'flex', alignItems: 'center' }}>
                  {checking && <Loader2 size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
                  {!checking && checkResult?.available === true && <Check size={14} style={{ color: '#22c55e' }} />}
                  {!checking && checkResult?.available === false && <X size={14} style={{ color: 'var(--danger)' }} />}
                </span>
              </div>
              {checkResult?.available === false && checkResult?.reason && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: 'var(--danger)' }}>{checkResult.reason}</p>
              )}
              {checkResult?.available === true && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: '#22c55e' }}>Ez a link szabad!</p>
              )}
            </div>
          )}
        </div>

        {/* Warning + confirm */}
        {checkResult?.available && activeSlug && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#92400e' }}>
                A linket nem lehet megváltoztatni!
              </p>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                Az <strong>epitunk.hu/szakemberek/{activeSlug}</strong> cím véglegesen a tiéd lesz.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600, color: '#92400e' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 16, height: 16 }} />
                Igen, ezt a linket szeretném
              </label>
            </div>
          </div>
        )}

        {error && (
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--danger)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <X size={14} /> {error}
          </p>
        )}

        <button
          type="button" className="btn btn-primary"
          disabled={!isReady || saving}
          onClick={handleCreate}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Létrehozás…</> : <><Globe size={15} /> Weboldal létrehozása</>}
        </button>
      </div>
    </div>
  );
}
