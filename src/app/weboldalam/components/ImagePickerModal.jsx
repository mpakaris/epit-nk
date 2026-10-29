'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, Loader2, Image } from 'lucide-react';
import useMobile from '@/hooks/useMobile';

export default function ImagePickerModal({ tradeId, selectedImageId, onSelect, onClose, orientation }) {
  const [trades, setTrades] = useState([]);
  const [activeTrade, setActiveTrade] = useState(tradeId || '');
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useMobile();
  const tradeRef = useRef(null);

  useEffect(() => {
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
