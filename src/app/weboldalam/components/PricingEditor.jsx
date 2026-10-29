'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { normalisePricingContent, PRICE_UNITS } from './utils';

export default function PricingEditor({ content, onChange }) {
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
