'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash2, Lock } from 'lucide-react';
import CharCount from './CharCount';

export default function ListEditor({ items, onChange, fields, addLabel, totalLimit = 10, freeLimit = null, isPremium = true, compact = false }) {
  const t  = useTranslations('website');
  const tc = useTranslations('common');
  const update = (i, key, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add    = () => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))]);

  const canAdd = items.length < totalLimit;
  const freeVisible = freeLimit ?? totalLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 0 : '0.75rem' }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {t('entriesCount', { count: items.length, total: totalLimit })}
          </span>
        </div>
      )}

      {items.map((item, i) => {
        const hiddenForFree = !isPremium && i >= freeVisible;

        if (compact) {
          return (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E5DF', paddingTop: i === 0 ? 0 : 14, paddingBottom: 14, opacity: hiddenForFree ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8A8F98' }}>#{i + 1}</span>
                {hiddenForFree && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
                    {t('premiumHiddenBadge')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fields.map(f => (
                  <div key={f.key}>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="form-control" rows={2}
                        value={item[f.key] || ''} maxLength={f.max || 200}
                        onChange={e => update(i, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{ resize: 'none' }}
                      />
                    ) : (
                      <input
                        type={f.type || 'text'} className="form-control"
                        value={item[f.key] || ''} maxLength={f.max || 100}
                        onChange={e => update(i, f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={i} style={{ background: hiddenForFree ? 'var(--bg-base)' : 'var(--bg-subtle)', border: `1px solid ${hiddenForFree ? '#fde68a' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.75rem', opacity: hiddenForFree ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>#{i + 1}</span>
                {hiddenForFree && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
                    {t('premiumHiddenBadge')}
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
                    <textarea className="form-control" rows={2} value={item[f.key] || ''} maxLength={f.max || 200} onChange={e => update(i, f.key, e.target.value)} placeholder={f.placeholder} style={{ resize: 'none', fontSize: '0.825rem' }} />
                  ) : (
                    <input type={f.type || 'text'} className="form-control" value={item[f.key] || ''} maxLength={f.max || 100} onChange={e => update(i, f.key, e.target.value)} placeholder={f.placeholder} style={{ fontSize: '0.825rem' }} />
                  )}
                  {f.max && <CharCount value={item[f.key]} max={f.max} />}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Bottom action row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: compact ? 8 : 0 }}>
        {canAdd ? (
          <button type="button" onClick={add}
            className={compact ? undefined : 'btn btn-secondary btn-sm'}
            style={compact ? {
              flex: 1, height: 48, border: 0, borderRadius: 24,
              background: '#1A3A5C', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            } : { display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}
          >
            <Plus size={compact ? 16 : 14} /> {addLabel}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
            <Lock size={12} /> {t('maxEntriesLimit', { total: totalLimit })}
          </p>
        )}
        {compact && items.length > 0 && (
          <button type="button" onClick={() => remove(items.length - 1)}
            style={{ height: 48, padding: '0 18px', border: 0, borderRadius: 24, background: '#B71C1C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", flexShrink: 0 }}
          >
            <Trash2 size={15} /> {tc('delete')}
          </button>
        )}
      </div>
    </div>
  );
}
