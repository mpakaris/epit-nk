'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

export default function WorkTypeSelector({ selected, onChange }) {
  const [custom, setCustom] = useState('');
  const toggle = (type) => onChange(selected.includes(type) ? selected.filter(t => t !== type) : [...selected, type]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v || selected.includes(v)) { setCustom(''); return; }
    onChange([...selected, v]);
    setCustom('');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
        {WORK_TYPES.map(type => (
          <button key={type} type="button" onClick={() => toggle(type)}
            style={{ padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)', border: selected.includes(type) ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)', background: selected.includes(type) ? 'var(--accent-light)' : 'var(--bg-subtle)', color: selected.includes(type) ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: selected.includes(type) ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer' }}>
            {type}
          </button>
        ))}
      </div>
      {selected.filter(t => !WORK_TYPES.includes(t)).map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>
          {t}<button type="button" onClick={() => onChange(selected.filter(x => x !== t))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}><X size={11} /></button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
        <input type="text" className="form-control" placeholder="Egyéni típus..." value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} style={{ flex: 1, fontSize: '0.82rem' }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom} disabled={!custom.trim()}>Hozzáad</button>
      </div>
    </div>
  );
}
