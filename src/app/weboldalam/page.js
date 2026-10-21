'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import {
  Globe, Check, X, Loader2, ChevronDown, ChevronRight,
  Lock, Plus, Trash2, AlertTriangle, ExternalLink, Save,
  Eye, Star, User, Wrench, Award, Image, DollarSign,
  MessageSquare, HelpCircle, MapPin, Phone,
  CheckCircle2, Copy, Upload, Camera, QrCode,
  Download, ChevronUp, Video,
} from 'lucide-react';
import Link from 'next/link';
import PageSpinner from '@/components/PageSpinner';
import { COLOR_SCHEMES, TYPOGRAPHY } from '@/lib/websiteThemes';

function extractSocialHandle(value, platform) {
  if (!value) return '';
  let v = value.trim();
  // If someone pastes a full URL, extract the handle
  if (v.includes('tiktok.com/')) v = v.split('tiktok.com/').pop().split('/')[0];
  if (v.includes('instagram.com/')) v = v.split('instagram.com/').pop().split('/')[0];
  // Normalize: always store with leading @
  return '@' + v.replace(/^@+/, '');
}

function formatHunPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let num = digits;
  if (num.startsWith('36')) num = num.slice(2);
  else if (num.startsWith('06')) num = num.slice(2);
  else if (num.startsWith('0')) num = num.slice(1);
  num = num.slice(0, 9);
  let out = '+36';
  if (num.length >= 1) out += ' ' + num.slice(0, 2);
  if (num.length >= 3) out += ' ' + num.slice(2, 5);
  if (num.length >= 6) out += ' ' + num.slice(5, 7);
  if (num.length >= 8) out += ' ' + num.slice(7, 9);
  return out;
}

// Leaflet requires no SSR
const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => (
  <div style={{ height: 300, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
  </div>
) });

// ---- helpers ----------------------------------------------------------------

function toSlug(str) {
  return str.toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSuggestions(lastName, firstName, tradeSlug) {
  const l = toSlug(lastName.trim());
  const f = toSlug(firstName.trim());
  if (!l && !f) return [];

  const results = [];
  if (l && f) {
    results.push(`${l}-${f}`);
    if (tradeSlug) results.push(`${l}-${f}-${tradeSlug}`);
    results.push(`${f}-${l}`);
    if (tradeSlug) results.push(`${f}-${l}-${tradeSlug}`);
  } else {
    const s = l || f;
    results.push(s);
    if (tradeSlug) results.push(`${s}-${tradeSlug}`);
  }
  return [...new Set(results)].filter(s => s.length >= 3);
}

// Pre-fill: Hungarian display names are typically "Vezetéknév Keresztnév"
function splitDisplayName(displayName) {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
  return { lastName: parts[0] || '', firstName: '' };
}

const SECTION_META = {
  hero:          { label: 'Bemutatkozó fejléc', icon: Star,          free: true,  desc: 'Szakma, névjegy, rövid szlogen' },
  about:         { label: 'Rólam',              icon: User,          free: true,  desc: 'Bemutatkozó szöveg' },
  services:      { label: 'Szolgáltatások',     icon: Wrench,        free: true,  desc: 'Mit csinálsz, mit vállalsz' },
  certifications:{ label: 'Képesítések',        icon: Award,         free: false, desc: 'Bizonyítványok, végzettségek' },
  gallery:       { label: 'Galéria',            icon: Image,         free: false, desc: 'Korábbi munkáid képei' },
  pricing:       { label: 'Áraink',             icon: DollarSign,    free: false, desc: 'Díjszabás, árajánlat-kategóriák' },
  testimonials:  { label: 'Vélemények',         icon: MessageSquare, free: false, desc: 'Ügyfelek visszajelzései' },
  faq:           { label: 'GYIK',               icon: HelpCircle,    free: false, desc: 'Gyakori kérdések és válaszok' },
  service_area:  { label: 'Munkaterület',       icon: MapPin,        free: false, desc: 'Hol dolgozol, milyen körzetben' },
  contact:       { label: 'Kapcsolat',          icon: Phone,         free: true,  desc: 'Elérhetőségeid' },
};

const SECTION_ORDER = [
  'hero','about','services','certifications','gallery',
  'pricing','testimonials','faq','service_area','contact',
];

// ---- searchable trade select ------------------------------------------------

function TradeSelect({ trades, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = trades.find(t => t.id === value);
  const filtered = query
    ? trades.filter(t => t.name_hu.toLowerCase().includes(query.toLowerCase()))
    : trades;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (trade) => {
    onChange(trade.id);
    setQuery('');
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  };

  const displayValue = open ? query : (selected?.name_hu || '');

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input row */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{
          display: 'flex', alignItems: 'center',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-input, var(--bg-subtle))',
          cursor: 'text',
          transition: 'border-color 0.15s',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          placeholder="Keresés vagy választás…"
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            padding: '0.55rem 0.75rem', fontSize: '0.9rem', cursor: 'text',
            color: !open && selected ? 'var(--text)' : 'inherit',
          }}
        />
        {value && (
          <button
            type="button" onClick={clear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.4rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)', marginRight: '0.6rem', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          zIndex: 200, maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Nincs találat
            </div>
          ) : (
            filtered.map(trade => {
              const isSelected = trade.id === value;
              return (
                <button
                  key={trade.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(trade); }}
                  style={{
                    width: '100%', background: isSelected ? 'var(--primary-bg)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    padding: '0.6rem 1rem', textAlign: 'left',
                    fontSize: '0.875rem',
                    color: isSelected ? 'var(--primary)' : 'var(--text)',
                    fontWeight: isSelected ? 700 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  {trade.name_hu}
                  {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---- slug setup -------------------------------------------------------------

function SlugSetup({ displayName, onCreated }) {
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

// ---- pill toggle ------------------------------------------------------------

function PillToggle({ on, onChange, disabled = false, size = 'md' }) {
  const w = size === 'lg' ? 44 : 36;
  const h = size === 'lg' ? 24 : 20;
  const knob = h - 6;
  const travel = w - h + 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={disabled ? undefined : onChange}
      style={{
        width: w, height: h, borderRadius: h,
        background: on ? 'var(--primary)' : 'var(--border-subtle)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: 3, display: 'flex', alignItems: 'center',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        width: knob, height: knob, borderRadius: '50%',
        background: 'white',
        transform: on ? `translateX(${travel}px)` : 'translateX(0)',
        transition: 'transform 0.2s',
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }} />
    </button>
  );
}

// ---- section content editors -----------------------------------------------

function ImagePickerModal({ tradeId, selectedImageId, onSelect, onClose, orientation }) {
  const [trades, setTrades] = useState([]);
  const [activeTrade, setActiveTrade] = useState(tradeId || '');
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tradeRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 639px)').matches);
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  // Close trade dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (!tradeRef.current?.contains(e.target)) setTradeOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTrade) params.set('trade_id', activeTrade); // 'generic' handled by API
    if (orientation) params.set('orientation', orientation);
    fetch(`/api/image-library?${params.toString()}`)
      .then(r => r.json())
      .then(d => setImages(d.images || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTrade]);

  const selectedTradeName = activeTrade ? trades.find(t => t.id === activeTrade)?.name_hu : 'Összes szakma';
  const filteredTrades = tradeSearch
    ? trades.filter(t => t.name_hu.toLowerCase().includes(tradeSearch.toLowerCase()))
    : trades;

  const TradeDropdown = () => (
    <div ref={tradeRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setTradeOpen(o => !o); setTradeSearch(''); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          width: '100%', padding: '0.5rem 0.75rem',
          background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
          color: activeTrade ? 'var(--text)' : 'var(--text-muted)',
        }}
      >
        <span>{selectedTradeName}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: tradeOpen ? 'rotate(180deg)' : '', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {tradeOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 50, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text" autoFocus
              value={tradeSearch}
              onChange={e => setTradeSearch(e.target.value)}
              placeholder="Keresés…"
              style={{
                width: '100%', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--bg-subtle)', padding: '0.4rem 0.6rem',
                fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Options */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {/* All option */}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setActiveTrade(''); setTradeOpen(false); setTradeSearch(''); }}
              style={{
                width: '100%', background: activeTrade === '' ? 'var(--primary-bg)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '0.55rem 0.75rem', textAlign: 'left',
                fontSize: '0.875rem', fontWeight: activeTrade === '' ? 700 : 400,
                color: activeTrade === '' ? 'var(--primary)' : 'var(--text)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              Összes szakma
              {activeTrade === '' && <Check size={13} />}
            </button>
            {filteredTrades.length === 0 && (
              <p style={{ margin: 0, padding: '0.6rem 0.75rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>Nincs találat</p>
            )}
            {filteredTrades.map(t => (
              <button
                key={t.id} type="button"
                onMouseDown={e => { e.preventDefault(); setActiveTrade(t.id); setTradeOpen(false); setTradeSearch(''); }}
                style={{
                  width: '100%', background: activeTrade === t.id ? 'var(--primary-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer', padding: '0.55rem 0.75rem', textAlign: 'left',
                  fontSize: '0.875rem', fontWeight: activeTrade === t.id ? 700 : 400,
                  color: activeTrade === t.id ? 'var(--primary)' : 'var(--text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {t.name_hu}
                {activeTrade === t.id && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const ImageGrid = () => (
    loading ? (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    ) : images.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
        <Image size={28} style={{ marginBottom: '0.5rem', opacity: 0.3, display: 'block', margin: '0 auto 0.5rem' }} />
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>
          {activeTrade ? 'Ehhez a szakmához még nincs kép' : 'Még nincs kép a könyvtárban'}
        </p>
        {activeTrade && (
          <button type="button" onClick={() => setActiveTrade('')} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
            Összes kép megtekintése
          </button>
        )}
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem' }}>
        {images.map(img => {
          const isSelected = selectedImageId === img.id;
          return (
            <button
              key={img.id} type="button"
              onClick={() => onSelect(img)}
              style={{
                padding: 0, position: 'relative',
                border: `2.5px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'none',
                boxShadow: isSelected ? '0 0 0 3px var(--primary-bg)' : 'none',
              }}
            >
              <img src={img.url} alt={img.alt_text || ''} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
              {isSelected && (
                <span style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={12} style={{ color: 'white' }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    )
  );

  if (isMobile) {
    // Bottom sheet
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
          background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}>
          <div style={{ padding: '0.6rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-subtle)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem 0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Háttérkép választása</h3>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
          </div>
          <div style={{ padding: '0 1rem 0.75rem' }}><TradeDropdown /></div>
          <div style={{ overflowY: 'auto', padding: '0 1rem 2rem', flex: 1 }}><ImageGrid /></div>
        </div>
      </>
    );
  }

  // Desktop modal
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1001, width: 'min(720px, 90vw)',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', maxHeight: '80vh',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Háttérkép választása</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}><TradeDropdown /></div>
        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem 1.25rem' }}><ImageGrid /></div>
      </div>
    </>
  );
}

function HeroEditor({ content, onChange, tradeId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const clearImage = () => onChange({ ...content, hero_image_id: null, hero_image_url: null });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Tagline */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Szlogen <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 60 karakter)</span></label>
        <input
          type="text" className="form-control" maxLength={60}
          value={content.tagline || ''}
          onChange={e => onChange({ ...content, tagline: e.target.value })}
          placeholder="pl. Megbízható festési munkák Budapesten"
        />
      </div>

      {/* Subtitle */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Alcím <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 140 karakter)</span></label>
        <input
          type="text" className="form-control" maxLength={140}
          value={content.subtitle || ''}
          onChange={e => onChange({ ...content, subtitle: e.target.value })}
          placeholder="pl. 15 éves tapasztalattal, garanciával, kedvező áron"
        />
      </div>

      {/* Hero background image */}
      <div>
        <label className="form-label">Háttérkép</label>
        {content.hero_image_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={content.hero_image_url} alt="Háttérkép" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>Csere</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}><Trash2 size={13} /></button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Image size={13} /> Kép kiválasztása
          </button>
        )}
      </div>

      {pickerOpen && (
        <ImagePickerModal
          tradeId={tradeId}
          selectedImageId={content.hero_image_id}
          orientation="horizontal"
          onSelect={img => { onChange({ ...content, hero_image_id: img.id, hero_image_url: img.url }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function AboutEditor({ content, onChange, tradeId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('type', 'about');
      fd.append('files', file);
      const r = await fetch('/api/website/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Feltöltési hiba'); return; }
      onChange({ ...content, photo_r2_key: d.files[0].r2_key, photo_url: d.files[0].url });
    } catch {
      setUploadErr('Hálózati hiba');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    if (content.photo_r2_key) {
      await fetch('/api/website/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2_key: content.photo_r2_key }),
      }).catch(() => {});
    }
    onChange({ ...content, photo_r2_key: null, photo_url: null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Bemutatkozó szöveg <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 600 karakter)</span></label>
        <textarea
          className="form-control" rows={5} maxLength={600}
          value={content.text || ''}
          onChange={e => onChange({ ...content, text: e.target.value })}
          placeholder="Mesélj magadról, tapasztalataidról, miért érdemes téged választani…"
          style={{ resize: 'vertical' }}
        />
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {(content.text || '').length}/600
        </p>
      </div>

      {/* Photo upload — premium feature */}
      <div>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Camera size={13} /> Profilkép
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>PRÉMIUM</span>
        </label>
        {content.photo_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={content.photo_url} alt="Profilkép" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
            <button type="button" className="btn btn-danger btn-sm" onClick={removePhoto} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Trash2 size={13} /> Törlés
            </button>
          </div>
        ) : (
          <div>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            <button
              type="button" className="btn btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {uploading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Feltöltés…</> : <><Upload size={13} /> Kép feltöltése</>}
            </button>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP · max 5 MB · Automatikusan WebP-vé konvertálva</p>
          </div>
        )}
        {uploadErr && <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: 'var(--danger)' }}>{uploadErr}</p>}
      </div>

    </div>
  );
}

function CharCount({ value, max }) {
  const len = (value || '').length;
  const pct = len / max;
  return (
    <span style={{ fontSize: '0.62rem', color: pct >= 0.9 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.1rem', display: 'block', textAlign: 'right' }}>
      {len}/{max}
    </span>
  );
}

function ListEditor({ items, onChange, fields, addLabel, totalLimit = 10, freeLimit = null, isPremium = true }) {
  const update = (i, key, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add    = () => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))]);

  const canAdd = items.length < totalLimit;
  const freeVisible = freeLimit ?? totalLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {items.length}/{totalLimit} bejegyzés
        </span>
      </div>
      {items.map((item, i) => {
        const hiddenForFree = !isPremium && i >= freeVisible;
        return (
          <div key={i} style={{ background: hiddenForFree ? 'var(--bg-base)' : 'var(--bg-subtle)', border: `1px solid ${hiddenForFree ? '#fde68a' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.75rem', opacity: hiddenForFree ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>#{i + 1}</span>
                {hiddenForFree && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
                    PRÉMIUM – nem jelenik meg
                  </span>
                )}
              </div>
              <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.1rem' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {fields.map(f => (
                <div key={f.key}>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="form-control" rows={2}
                      value={item[f.key] || ''} maxLength={f.max || 200}
                      onChange={e => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{ resize: 'none', fontSize: '0.825rem' }}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'} className="form-control"
                      value={item[f.key] || ''} maxLength={f.max || 100}
                      onChange={e => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{ fontSize: '0.825rem' }}
                    />
                  )}
                  {f.max && <CharCount value={item[f.key]} max={f.max} />}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {canAdd ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}>
          <Plus size={14} /> {addLabel}
        </button>
      ) : (
        <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Lock size={12} /> Maximum {totalLimit} bejegyzés engedélyezett
        </p>
      )}
    </div>
  );
}

function ServicesEditor({ content, onChange, isPremium, tradeId }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Szolgáltatás hozzáadása"
      totalLimit={8} freeLimit={3} isPremium={isPremium}
      fields={[
        { key: 'title',       placeholder: 'Szolgáltatás neve (pl. Belső festés)', max: 80 },
        { key: 'description', placeholder: 'Rövid leírás (pl. Teljes körű belső festési munkák)', type: 'textarea', max: 200 },
      ]}
    />
  );
}

function CertificationsEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Képesítés hozzáadása"
      totalLimit={8}
      fields={[
        { key: 'title',  placeholder: 'Képesítés neve (pl. Mesterfestő bizonyítvány)', max: 100 },
        { key: 'issuer', placeholder: 'Kiállító intézmény (pl. MKIK)', max: 100 },
        { key: 'year',   placeholder: 'Év (pl. 2015)', max: 4, type: 'number' },
      ]}
    />
  );
}

const PRICE_UNITS = ['m²', 'm³', 'm', 'fm', 'db', 'óra', 'nap', 'kg', 't', 'átalány'];

function normalisePricingContent(content) {
  const raw = content.items || [];
  if (!raw.length || raw[0].entries !== undefined) return content;
  return {
    ...content,
    cols: 2,
    items: raw.map(old => ({
      title: old.service || '',
      vat: 'gross',
      entries: old.price ? [{ label: old.note || '', price: old.price, unit: old.unit || 'm²' }] : [],
    })),
  };
}

function PricingEditor({ content, onChange }) {
  const norm  = normalisePricingContent(content);
  const items = norm.items || [];

  const updCards = (next)          => onChange({ ...norm, items: next });
  const addCard  = ()              => updCards([...items, { title: '', vat: 'gross', entries: [{ label: '', price: '', unit: 'm²' }] }]);
  const remCard  = (i)             => updCards(items.filter((_, idx) => idx !== i));
  const patCard  = (i, patch)      => updCards(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addEntry = (i)             => patCard(i, { entries: [...(items[i].entries || []), { label: '', price: '', unit: 'm²' }] });
  const remEntry = (i, j)          => patCard(i, { entries: items[i].entries.filter((_, idx) => idx !== j) });
  const patEntry = (i, j, patch)   => patCard(i, { entries: items[i].entries.map((e, idx) => idx === j ? { ...e, ...patch } : e) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Cards */}
      {items.map((card, i) => (
        <div key={i} style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input className="form-control form-control-sm" placeholder="Kategória neve (pl. Gipszkarton)" value={card.title || ''} onChange={e => patCard(i, { title: e.target.value })} maxLength={60} style={{ flex: 1 }} />
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              {[['gross','Bruttó'],['net','Nettó']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => patCard(i, { vat: v })}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: (card.vat || 'gross') === v ? 'var(--primary)' : 'transparent', color: (card.vat || 'gross') === v ? '#fff' : 'var(--text-muted)' }}>
                  {l}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => remCard(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.2rem', flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>

          {(card.entries || []).map((entry, j) => (
            <div key={j} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input className="form-control form-control-sm" placeholder="Megnevezés (pl. Rakás)" value={entry.label || ''} onChange={e => patEntry(i, j, { label: e.target.value })} maxLength={60} style={{ flex: 2, minWidth: 0 }} />
              <input className="form-control form-control-sm" placeholder="Ár" value={entry.price || ''} onChange={e => patEntry(i, j, { price: e.target.value.replace(/\D/g, '') })} inputMode="numeric" maxLength={10} style={{ flex: 1, minWidth: 60 }} />
              <select className="form-control form-control-sm" value={entry.unit || 'm²'} onChange={e => patEntry(i, j, { unit: e.target.value })} style={{ flex: 1, minWidth: 70 }}>
                {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" onClick={() => remEntry(i, j)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addEntry(i)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={12} /> Sor hozzáadása
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-secondary btn-sm" onClick={addCard} disabled={items.length >= 10} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Plus size={13} /> Kategória hozzáadása
      </button>
    </div>
  );
}

function TestimonialsEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Vélemény hozzáadása"
      totalLimit={10}
      fields={[
        { key: 'name', placeholder: 'Ügyfél neve (pl. Kovács Péter)', max: 60 },
        { key: 'text', placeholder: 'Vélemény szövege', type: 'textarea', max: 300 },
      ]}
    />
  );
}

function FaqEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Kérdés hozzáadása"
      totalLimit={6}
      fields={[
        { key: 'question', placeholder: 'Kérdés (pl. Adtok garanciát a munkára?)', max: 120 },
        { key: 'answer',   placeholder: 'Válasz', type: 'textarea', max: 300 },
      ]}
    />
  );
}

// Defined outside ContactEditor to prevent unmount-on-render (which kills input focus)
function ContactPremiumField({ label, isPremium, children }) {
  return (
    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {label}
        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>PRÉMIUM</span>
      </label>
      <div style={{ position: 'relative' }}>
        {children}
        {!isPremium && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', borderRadius: 6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={14} style={{ color: 'var(--text-muted)' }} /></div>}
      </div>
    </div>
  );
}

function ContactEditor({ content, onChange, isPremium }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Az Epitünk kapcsolatfelvételi form mindig elérhető. Prémium fiókkal telefon, e-mail és közösségi elérhetőségek is megjelennek.
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">E-mail cím</label>
        <input type="email" className="form-control" value={content.email || ''} onChange={e => onChange({ ...content, email: e.target.value })} placeholder="neve@email.hu" />
      </div>

      <ContactPremiumField label="Telefonszám" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.phone || ''} onChange={e => onChange({ ...content, phone: e.target.value })} onBlur={e => onChange({ ...content, phone: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="WhatsApp" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.whatsapp || ''} onChange={e => onChange({ ...content, whatsapp: e.target.value })} onBlur={e => onChange({ ...content, whatsapp: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="Viber" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.viber || ''} onChange={e => onChange({ ...content, viber: e.target.value })} onBlur={e => onChange({ ...content, viber: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="TikTok" isPremium={isPremium}>
        <input type="text" className="form-control" value={content.tiktok || ''} onChange={e => onChange({ ...content, tiktok: e.target.value })} onBlur={e => onChange({ ...content, tiktok: extractSocialHandle(e.target.value, 'tiktok') })} placeholder="@felhasznalonev" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="Instagram" isPremium={isPremium}>
        <input type="text" className="form-control" value={content.instagram || ''} onChange={e => onChange({ ...content, instagram: e.target.value })} onBlur={e => onChange({ ...content, instagram: extractSocialHandle(e.target.value, 'instagram') })} placeholder="@felhasznalonev" disabled={!isPremium} />
      </ContactPremiumField>
    </div>
  );
}

function GalleryEditor({ content, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const items  = content.items || [];
  const imgCount = items.filter(i => i.type !== 'video').length;
  const vidCount = items.filter(i => i.type === 'video').length;

  const upload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('type', 'gallery');
      files.forEach(f => fd.append('files', f));
      const r = await fetch('/api/website/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Feltöltési hiba'); return; }
      onChange({ ...content, items: [...items, ...d.files] });
    } catch {
      setUploadErr('Hálózati hiba');
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = '';
      if (vidRef.current) vidRef.current.value = '';
    }
  };

  const handleImgUpload = (e) => upload(Array.from(e.target.files || []).slice(0, 10));

  const handleVidUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const f of files) {
      if (f.size > 25 * 1024 * 1024) { setUploadErr(`"${f.name}" túl nagy (max 25 MB)`); return; }
      const ok = await new Promise(resolve => {
        const url = URL.createObjectURL(f);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration <= 60); };
        v.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        v.src = url;
      });
      if (!ok) { setUploadErr(`"${f.name}" túl hosszú (max 1 perc)`); return; }
    }
    await upload(files);
  };

  const removeItem = async (idx) => {
    const item = items[idx];
    if (item.r2_key) {
      await fetch('/api/website/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2_key: item.r2_key }),
      }).catch(() => {});
    }
    onChange({ ...content, items: items.filter((_, i) => i !== idx) });
  };

  const updateCaption = (idx, caption) =>
    onChange({ ...content, items: items.map((it, i) => i === idx ? { ...it, caption } : it) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {items.length > 0 && (() => {
        const images = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type !== 'video');
        const videos = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type === 'video');
        const renderCard = (item) => (
          <div key={item._i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {item.type === 'video' ? (
              <div style={{ width: '100%', aspectRatio: '1', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={28} style={{ color: '#94a3b8' }} />
              </div>
            ) : (
              <img src={item.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            )}
            <button type="button" onClick={() => removeItem(item._i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
            <input type="text" value={item.caption || ''} onChange={e => updateCaption(item._i, e.target.value)} placeholder="Felirat…" style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', fontSize: '0.72rem', padding: '0.3rem 0.4rem', boxSizing: 'border-box' }} />
          </div>
        );
        return (
          <>
            {images.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>{images.map(renderCard)}</div>}
            {images.length > 0 && videos.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Videók</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
            )}
            {videos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>{videos.map(renderCard)}</div>}
          </>
        );
      })()}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <input type="file" ref={imgRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleImgUpload} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => imgRef.current?.click()} disabled={uploading || imgCount >= 25} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
            Képek ({imgCount}/25)
          </button>
        </div>
        <div>
          <input type="file" ref={vidRef} accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={handleVidUpload} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => vidRef.current?.click()} disabled={uploading || vidCount >= 10} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Video size={13} />}
            Videók ({vidCount}/10)
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Kép: max 15 MB · JPG, PNG, WebP · Videó: max 25 MB, max 1 perc · MP4, MOV, WebM
      </p>
      {uploadErr && <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--danger)' }}>{uploadErr}</p>}
    </div>
  );
}

function BannerEditor({ content, onChange, tradeId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        Válassz egy vízszintes képet a szakmádhoz tartozó könyvtárból. Ez jelenik meg a szekciók között díszítőként.
      </p>
      {content.image_url ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <img src={content.image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)' }} />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>Csere</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange({ ...content, image_id: null, image_url: null })}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}>
          <Image size={13} /> Kép kiválasztása
        </button>
      )}
      {pickerOpen && (
        <ImagePickerModal
          tradeId={tradeId}
          selectedImageId={content.image_id}
          orientation="horizontal"
          onSelect={img => { onChange({ ...content, image_id: img.id, image_url: img.url }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function ServiceAreaEditor({ content, onChange }) {
  const lat = content.lat ?? 47.4979;
  const lng = content.lng ?? 19.0402;
  const radius = content.radius_km ?? 30;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        Mozgasd a térképet úgy, hogy a narancssárga pont a kívánt helyre essen, majd állítsd be a sugarát.
      </p>
      <ServiceAreaMap
        lat={lat} lng={lng} radiusKm={radius}
        onChange={(updates) => onChange({ ...content, ...updates })}
        editable
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Sugár: <strong>{radius} km</strong></label>
        <input
          type="range" min={5} max={200} step={5}
          value={radius}
          onChange={e => onChange({ ...content, radius_km: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  );
}

function SectionContentEditor({ section, onChange, isPremium, tradeId }) {
  const c = section.content || {};
  const update = (next) => onChange({ ...section, content: next });

  switch (section.section_type) {
    case 'hero':           return <HeroEditor content={c} onChange={update} tradeId={tradeId} />;
    case 'about':          return <AboutEditor content={c} onChange={update} tradeId={tradeId} />;
    case 'services':       return <ServicesEditor content={c} onChange={update} isPremium={isPremium} tradeId={tradeId} />;
    case 'certifications': return <CertificationsEditor content={c} onChange={update} />;
    case 'gallery':        return <GalleryEditor content={c} onChange={update} />;
    case 'pricing':        return <PricingEditor content={c} onChange={update} />;
    case 'testimonials':   return <TestimonialsEditor content={c} onChange={update} />;
    case 'faq':            return <FaqEditor content={c} onChange={update} />;
    case 'service_area':   return <ServiceAreaEditor content={c} onChange={update} />;
    case 'contact':        return <ContactEditor content={c} onChange={update} isPremium={isPremium} />;
    default:               return null;
  }
}

// ---- single section card ---------------------------------------------------

function SectionCard({ section, isPremium, expanded, onToggleExpand, onChange, tradeId }) {
  const meta = SECTION_META[section.section_type] || {};
  const Icon = meta.icon;
  const isPremiumSection = !meta.free;
  const hiddenOnPublish = isPremiumSection && !isPremium;

  return (
    <div style={{
      border: `1px solid ${expanded ? 'var(--primary)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: expanded ? 'var(--primary-bg)' : 'var(--bg-card)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon && <Icon size={16} style={{ color: 'var(--primary)' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{meta.label}</span>
            {isPremiumSection && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-pill)',
                background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
              }}>PRÉMIUM</span>
            )}
            {hiddenOnPublish && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                – nem jelenik meg az élő oldalon
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>{meta.desc}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <PillToggle on={section.enabled} onChange={e => { e.stopPropagation(); onChange({ ...section, enabled: !section.enabled }); }} />
          {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '1rem', background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionContentEditor section={section} onChange={onChange} isPremium={isPremium} tradeId={tradeId} />
        </div>
      )}
    </div>
  );
}

// ---- builder editor ---------------------------------------------------------

// ---- QR modal ---------------------------------------------------------------

function QrModal({ url, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(url, {
        width: 280, margin: 2,
        color: { dark: '#0d1520', light: '#ffffff' },
      }).then(setDataUrl);
    });
  }, [url]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>QR kód</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1rem', display: 'inline-block', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
          {dataUrl
            ? <img src={dataUrl} alt="QR kód" style={{ width: 200, height: 200, display: 'block' }} />
            : <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} /></div>
          }
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{url}</p>

        {dataUrl && (
          <a
            href={dataUrl}
            download="weboldam-qr.png"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={13} /> QR letöltése (PNG)
          </a>
        )}
      </div>
    </div>
  );
}

// ---- builder editor ---------------------------------------------------------

const DEMO_WB_LS_KEY = 'epitek_demo_website_builder';

export function BuilderEditor({ website: initialWebsite, sections: initialSections, userEmail }) {
  const [website, setWebsite] = useState(initialWebsite);
  const [sections, setSections] = useState(initialSections);
  const { isDemoMode } = useApp();
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' | 'design' | 'settings'

  const [theme, setTheme] = useState(website.theme || { color_scheme: 'classic', typography: 'modern' });

  // Settings tab state
  const [settingsSlug, setSettingsSlug] = useState(initialWebsite.slug || '');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugResult, setSlugResult] = useState(null); // { available: bool } | null
  const slugCheckTimer = useRef(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSaveErr, setSlugSaveErr] = useState('');
  const [slugSaveOk, setSlugSaveOk] = useState(false);
  const [trades, setTrades] = useState([]);
  const [settingsTradeId, setSettingsTradeId] = useState(initialWebsite.trade_id || '');
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeSaveOk, setTradeSaveOk] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen]   = useState(false);
  const [bannerPickerIndex, setBannerPickerIndex] = useState(0);

  // Load trades for settings tab
  useEffect(() => {
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  // Slug uniqueness check (debounced)
  const checkSettingsSlug = useCallback((slug) => {
    clearTimeout(slugCheckTimer.current);
    setSlugResult(null);
    if (!slug || slug.length < 3 || slug === website.slug) return;
    setSlugChecking(true);
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/website/slug-check?slug=${encodeURIComponent(slug)}`);
        const d = await r.json();
        setSlugResult(d);
      } finally { setSlugChecking(false); }
    }, 500);
  }, [website.slug]);

  // Load demo state from localStorage on mount
  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_WB_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.sections) setSections(saved.sections);
      if (saved.theme) setTheme(saved.theme);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheme = async (next) => {
    setTheme(next);
    if (isDemoMode) {
      try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections, theme: next })); } catch {}
      showToast('Design módosítva');
      return;
    }
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
      if (r.ok) showToast('Design mentve');
    } catch { /* silent */ }
  };

  const isTestUser = userEmail === 'testo@testo.com';
  const [testPremium, setTestPremium] = useState(website.is_premium || false);
  const isPremium = isTestUser ? testPremium : (website.is_premium || false);

  const toggleTestPremium = async () => {
    const next = !testPremium;
    setTestPremium(next);
    setWebsite(w => ({ ...w, is_premium: next }));
    try {
      await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_premium: next }),
      });
    } catch { /* silent — migration may not be applied yet */ }
  };

  const handleSaveSlug = async () => {
    if (isDemoMode) { showToast('Demo módban nem elérhető'); return; }
    if (!settingsSlug || settingsSlug.length < 3) { setSlugSaveErr('A link legalább 3 karakter hosszú kell legyen.'); return; }
    if (settingsSlug === website.slug) return;
    if (slugResult && !slugResult.available) { setSlugSaveErr('Ez a link már foglalt.'); return; }
    setSlugSaving(true); setSlugSaveErr(''); setSlugSaveOk(false);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_slug', slug: settingsSlug }),
      });
      const d = await r.json();
      if (!r.ok) { setSlugSaveErr(d.error || 'Hiba a mentéskor.'); return; }
      setWebsite(d.website);
      setSlugSaveOk(true);
      setSlugResult(null);
      setTimeout(() => setSlugSaveOk(false), 3000);
    } catch { setSlugSaveErr('Hálózati hiba. Próbáld újra.'); }
    finally { setSlugSaving(false); }
  };

  const handleSaveTrade = async (newTradeId) => {
    if (isDemoMode) { showToast('Demo módban nem elérhető'); return; }
    setSettingsTradeId(newTradeId);
    setTradeSaving(true); setTradeSaveOk(false);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: newTradeId || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setWebsite(d.website);
        setTradeSaveOk(true);
        setTimeout(() => setTradeSaveOk(false), 2000);
      }
    } catch { /* silent */ }
    finally { setTradeSaving(false); }
  };

  const dirty = useRef(false);
  const saveTimers = useRef({});
  const [toast, setToast] = useState(null);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const publicUrl = `${origin}/szakemberek/${website.slug}`;

  const showToast = useCallback((message) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 2200);
  }, []);

  // Load leads on mount and when switching to leads tab

  const updateSection = (updated) => {
    setSections(prev => {
      const next = prev.map(s => s.section_type === updated.section_type ? updated : s);
      if (isDemoMode) {
        try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections: next, theme })); } catch {}
      }
      return next;
    });
    if (isDemoMode) return;
    clearTimeout(saveTimers.current[updated.section_type]);
    saveTimers.current[updated.section_type] = setTimeout(async () => {
      try {
        const r = await fetch('/api/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: [updated] }),
        });
        if (r.ok) showToast('Változtatások mentve');
      } catch { /* silent fail — user can still use main Save */ }
    }, 700);
  };

  const handleSave = async () => {
    if (isDemoMode) { showToast('Demo módban a mentés nem elérhető'); return; }
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Mentési hiba'); return; }
      setWebsite(d.website);
      setSections(d.sections);
      dirty.current = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Hálózati hiba');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = () => {
    if (!isPremium) { setShowPublishWarning(true); return; }
    handlePublish();
  };

  const handlePublish = async () => {
    if (isDemoMode) { showToast('Demo módban a közzététel nem elérhető'); return; }
    setShowPublishWarning(false);
    setPublishing(true);
    setError('');
    try {
      const saveRes = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!saveRes.ok) { const d = await saveRes.json(); setError(d.error || 'Mentési hiba'); return; }
      const pubRes = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await pubRes.json();
      if (!pubRes.ok) { setError(d.error || 'Közzétételi hiba'); return; }
      setWebsite(d.website);
      setSections(d.sections);
      dirty.current = false;
    } catch {
      setError('Hálózati hiba');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (isDemoMode) { showToast('Demo módban a közzététel nem elérhető'); return; }
    setPublishing(true);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); setSections(d.sections); }
    } catch { /* ignore */ }
    finally { setPublishing(false); }
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

      {/* QR Modal */}
      {showQr && <QrModal url={publicUrl} onClose={() => setShowQr(false)} />}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Weboldalom</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>epitunk.hu/szakemberek/{website.slug}</span>
            <button type="button" onClick={copyUrl} title="Link másolása" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex' }}>
              {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
            </button>
            {website.status === 'published' && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                <ExternalLink size={13} />
              </a>
            )}
            <button type="button" onClick={() => setShowQr(true)} title="QR kód" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex' }}>
              <QrCode size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Preview */}
          <a
            href={`/szakemberek/${website.slug}?preview=1`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Eye size={13} /> Előnézet
          </a>
          {website.status === 'published' ? (
            <button type="button" onClick={handleUnpublish} disabled={publishing} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {publishing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
              Vázlat
            </button>
          ) : (
            <button type="button" onClick={handlePublishClick} disabled={publishing} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {publishing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={13} />}
              Közzétesz
            </button>
          )}
        </div>
      </div>

      {/* Status badge — 3 states */}
      {(() => {
        const isPublished = website.status === 'published';
        const wasPreviouslyPublished = !isPublished && !!website.published_at;
        const cfg = isPublished
          ? { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: <CheckCircle2 size={13} />, label: 'Élő – mindenki láthatja' }
          : wasPreviouslyPublished
          ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: <Globe size={13} />, label: 'Vázlat – korábban élő volt' }
          : { bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border-subtle)', icon: <Globe size={13} />, label: 'Nincs közzétéve' };
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', background: cfg.bg, color: cfg.color, fontSize: '0.775rem', fontWeight: 600, marginBottom: '1.25rem', border: `1px solid ${cfg.border}` }}>
            {cfg.icon} {cfg.label}
          </div>
        );
      })()}

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'sections',  label: 'Szekciók' },
          { key: 'design',    label: 'Design' },
          { key: 'settings',  label: 'Beállítások' },
        ].map(tab => (
          <button
            key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm, 6px)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Sections tab ---- */}
      {activeTab === 'sections' && (
        <>
          {isTestUser && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdf2f8', border: '1px solid #f0abfc', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.85rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86198f' }}>🧪 TEST: {isPremium ? 'Prémium' : 'Ingyenes'}</span>
              <PillToggle on={testPremium} onChange={toggleTestPremium} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sections.map(section => (
              <SectionCard
                key={section.section_type}
                section={section}
                isPremium={isPremium}
                expanded={expandedSection === section.section_type}
                onToggleExpand={() => setExpandedSection(prev => prev === section.section_type ? null : section.section_type)}
                onChange={updateSection}
                tradeId={website.trade_id}
              />
            ))}
          </div>
        </>
      )}

      {/* ---- Design tab ---- */}
      {activeTab === 'design' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Color scheme */}
          <div>
            <p style={{ margin: '0 0 0.85rem', fontWeight: 700, fontSize: '0.875rem' }}>Színvilág</p>
            {[
              { label: 'Sötét háttér', keys: ['classic','ocean','forest','rust','steel','black'] },
              { label: 'Világos háttér', keys: ['classic_light','ocean_light','forest_light','rust_light','steel_light','white'] },
            ].map(group => (
              <div key={group.label} style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {group.keys.map(key => {
                    const scheme = COLOR_SCHEMES[key];
                    if (!scheme) return null;
                    const isSelected = (theme.color_scheme || 'classic') === key;
                    return (
                      <button
                        key={key} type="button"
                        onClick={() => updateTheme({ ...theme, color_scheme: key })}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <span style={{
                          width: 48, height: 48, borderRadius: 12, display: 'flex', overflow: 'hidden',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          boxShadow: isSelected ? '0 0 0 3px var(--primary-bg)' : 'none', flexShrink: 0,
                        }}>
                          <span style={{ flex: 1, background: scheme.preview[0], border: scheme.darkHero ? 'none' : '1px solid #e2e8f0' }} />
                          <span style={{ width: 14, background: scheme.preview[1] }} />
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {scheme.name.replace(' Dark','').replace(' Light','')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Typography */}
          <div>
            <p style={{ margin: '0 0 0.85rem', fontWeight: 700, fontSize: '0.875rem' }}>Tipográfia</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(TYPOGRAPHY).map(([key, typo]) => {
                const isSelected = (theme.typography || 'modern') === key;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => updateTheme({ ...theme, typography: key })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '1rem', padding: '0.85rem 1rem',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-bg)' : 'var(--bg-card)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{typo.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{typo.description}</p>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Aa
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner images */}
          <div>
            <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Banner képek</p>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              {isPremium ? 'Prémium: 2 kép — 3 szekció · banner · 3 szekció · banner · 3 szekció' : 'Ingyenes: 1 kép — 2 szekció · banner · 2 szekció'}
            </p>
            {[...Array(isPremium ? 2 : 1)].map((_, idx) => {
              const banner = theme.banners?.[idx];
              return (
                <div key={idx} style={{ marginBottom: '0.85rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {idx + 1}. banner
                  </p>
                  {banner?.image_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <img src={banner.image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}>Csere</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                          const next = [...(theme.banners || [])];
                          next[idx] = null;
                          updateTheme({ ...theme, banners: next });
                        }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Image size={13} /> Kép kiválasztása
                    </button>
                  )}
                </div>
              );
            })}
            {bannerPickerOpen && (
              <ImagePickerModal
                tradeId={website.trade_id}
                selectedImageId={theme.banners?.[bannerPickerIndex]?.image_id}
                orientation="horizontal"
                onSelect={img => {
                  const next = [...(theme.banners || [null, null])];
                  next[bannerPickerIndex] = { image_id: img.id, image_url: img.url };
                  updateTheme({ ...theme, banners: next });
                  setBannerPickerOpen(false);
                }}
                onClose={() => setBannerPickerOpen(false)}
              />
            )}
          </div>

        </div>
      )}

      {/* ---- Settings tab ---- */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Slug change */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Nyilvános link (URL)</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              A profilod elérési útja: <strong>epitunk.hu/szakemberek/{settingsSlug || website.slug}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-input, var(--bg-subtle))' }}>
                  <span style={{ padding: '0.55rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderRight: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', flexShrink: 0 }}>/szakemberek/</span>
                  <input
                    type="text"
                    value={settingsSlug}
                    onChange={e => {
                      const v = toSlug(e.target.value) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setSettingsSlug(v);
                      setSlugSaveErr('');
                      setSlugSaveOk(false);
                      checkSettingsSlug(v);
                    }}
                    placeholder="pl. kovacs-janos-felujtio"
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0.55rem 0.65rem', fontSize: '0.875rem', flex: 1, minWidth: 0 }}
                  />
                  {slugChecking && <Loader2 size={14} style={{ margin: '0 0.5rem', color: 'var(--text-muted)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                  {!slugChecking && slugResult && settingsSlug !== website.slug && (
                    slugResult.available
                      ? <Check size={14} style={{ margin: '0 0.5rem', color: 'var(--success-text)', flexShrink: 0 }} />
                      : <X size={14} style={{ margin: '0 0.5rem', color: 'var(--danger-text)', flexShrink: 0 }} />
                  )}
                </div>
                {slugSaveErr && <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>{slugSaveErr}</div>}
                {!slugSaveErr && slugResult && !slugResult.available && settingsSlug !== website.slug && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>Ez a link már foglalt.</div>
                )}
                {!slugSaveErr && slugResult?.available && settingsSlug !== website.slug && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.3rem' }}>Ez a link elérhető!</div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={slugSaving || settingsSlug === website.slug || settingsSlug.length < 3 || (slugResult !== null && !slugResult.available)}
                onClick={handleSaveSlug}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {slugSaving ? <><Loader2 size={13} className="animate-spin" /> Mentés…</> : slugSaveOk ? <><Check size={13} /> Mentve!</> : <><Check size={13} /> Mentés</>}
              </button>
            </div>
          </div>

          {/* Trade / profession change */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Szakma / tevékenység</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              A kiválasztott szakma befolyásolja az alapértelmezett képeket és a keresési kategóriát.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: 360 }}>
              <button
                type="button"
                onClick={() => handleSaveTrade('')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: `1.5px solid ${(!settingsTradeId) ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: (!settingsTradeId) ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-card)',
                  fontWeight: (!settingsTradeId) ? 700 : 400, fontSize: '0.875rem',
                  color: (!settingsTradeId) ? 'var(--primary)' : 'var(--text)',
                }}
              >
                <span>Általános szakember</span>
                {(!settingsTradeId) && (tradeSaveOk ? <CheckCircle2 size={14} color="var(--success-text)" /> : <Check size={14} color="var(--primary)" />)}
              </button>
              {trades.map(trade => (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => handleSaveTrade(trade.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `1.5px solid ${settingsTradeId === trade.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    background: settingsTradeId === trade.id ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-card)',
                    fontWeight: settingsTradeId === trade.id ? 700 : 400, fontSize: '0.875rem',
                    color: settingsTradeId === trade.id ? 'var(--primary)' : 'var(--text)',
                  }}
                >
                  <span>{trade.name_hu}</span>
                  {settingsTradeId === trade.id && (tradeSaveOk ? <CheckCircle2 size={14} color="var(--success-text)" /> : <Check size={14} color="var(--primary)" />)}
                </button>
              ))}
              {tradeSaving && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Loader2 size={12} className="animate-spin" /> Mentés…</div>}
            </div>
          </div>

        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>epitunk.hu/szakemberek/{website.slug}</a>
      </p>

      {/* Free user publish warning modal */}
      {showPublishWarning && (
        <>
          <div onClick={() => setShowPublishWarning(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: 'min(440px, 90vw)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 800 }}>Figyelem – Ingyenes csomag</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Jelenleg az <strong>ingyenes csomagot</strong> használod. Közzététel esetén csak az ingyenes szekciók jelennek meg az élő oldalon:
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: 'var(--text)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', lineHeight: 1.7 }}>
              ✓ Fejléc · Rólam · Szolgáltatások · Kapcsolat
            </p>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Az összes szekció megjelenítéséhez válts <strong>Prémium</strong> csomagra. A tartalmaid megmaradnak – bármikor aktiválhatod.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPublishWarning(false)}>Mégse</button>
              <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={publishing} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {publishing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />}
                Közzéteszem így is
              </button>
            </div>
          </div>
        </>
      )}

      {/* Auto-save toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#f8fafc',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.825rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <Check size={13} style={{ color: '#22c55e' }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ---- main page component ---------------------------------------------------

export default function WeboldaPage() {
  const { currentUser, isSuperAdmin, impersonating, activeCollectiveId, collectives, dataReady } = useApp();
  const [website, setWebsite] = useState(undefined); // undefined = loading
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (!dataReady || !currentUser || (isSuperAdmin && !impersonating)) return;
    fetch('/api/website')
      .then(r => r.json())
      .then(d => {
        setWebsite(d.website || null);
        setSections(d.sections || []);
      })
      .catch(() => setWebsite(null));
  }, [dataReady, currentUser, isSuperAdmin]);

  if (!dataReady || website === undefined) return <PageSpinner />;

  if (isSuperAdmin && !impersonating) {
    return (
      <div style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <Globe size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
        <h2 style={{ fontWeight: 700 }}>Személyes weboldal</h2>
        <p style={{ color: 'var(--text-muted)' }}>Ez a funkció egyéni felhasználók számára érhető el.</p>
      </div>
    );
  }

  if (activeCollectiveId) {
    return (
      <div style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <Globe size={48} style={{ color: 'var(--accent)', marginBottom: '1rem', opacity: 0.5 }} />
        <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Kollektíva weboldal</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          A kollektívák számára készülő weboldalfunkció hamarosan elérhetővé válik.
        </p>
        <span style={{ display: 'inline-block', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 700 }}>
          Hamarosan
        </span>
      </div>
    );
  }

  if (website === null) {
    return (
      <SlugSetup
        displayName={currentUser?.display_name || ''}
        onCreated={({ website: w, sections: s }) => { setWebsite(w); setSections(s); }}
      />
    );
  }

  return (
    <BuilderEditor
      website={website}
      sections={sections}
      userEmail={currentUser?.email}
    />
  );
}
