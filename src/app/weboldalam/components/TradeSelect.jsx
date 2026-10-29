'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';

export default function TradeSelect({ trades, value, onChange }) {
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
