'use client';

import { Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/**
 * Dropdown to pick a collective (or stay personal) when creating items.
 * Shows an orange sharing-warning when a collective is selected.
 * Returns null when the user has no collectives.
 */
export default function CollectiveSelector({ value, onChange }) {
  const { effectiveCollectives } = useApp();
  const collectives = effectiveCollectives || [];

  if (collectives.length === 0) return null;

  const selected = collectives.find(c => c.collective_id === value);

  return (
    <div className="form-group">
      <label className="form-label">Munkaterület</label>
      <select
        className="form-control"
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">Személyes (privát)</option>
        {collectives.map(c => (
          <option key={c.collective_id} value={c.collective_id}>
            {c.name}
          </option>
        ))}
      </select>

      {value && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          marginTop: '0.5rem', padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          background: '#fff7ed', border: '1px solid #fed7aa',
          fontSize: '0.8rem', lineHeight: 1.5, color: '#9a3412',
        }}>
          <Users size={14} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#ea580c' }} />
          <span>
            <strong>{selected?.name}</strong> — Ez a tartalom megosztódik a kollektíva összes tagjával.
          </span>
        </div>
      )}
    </div>
  );
}
