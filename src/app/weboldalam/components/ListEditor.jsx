'use client';

import { Plus, Trash2, Lock } from 'lucide-react';
import CharCount from './CharCount';

export default function ListEditor({ items, onChange, fields, addLabel, totalLimit = 10, freeLimit = null, isPremium = true }) {
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
