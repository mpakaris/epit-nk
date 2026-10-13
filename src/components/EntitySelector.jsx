'use client';

import { Layers, ChevronDown } from 'lucide-react';

export default function EntitySelector({ value, onChange, memberships, label = 'Kontextus' }) {
  if (!memberships || memberships.length <= 1) return null;

  const sorted = [...memberships].sort((a, b) =>
    (a.entity_type === 'personal' ? -1 : 1) - (b.entity_type === 'personal' ? -1 : 1)
  );

  return (
    <div className="entity-selector-wrap">
      <div className="entity-selector-label">
        <Layers size={11} />
        <span>{label}</span>
      </div>
      <div className="entity-selector-field">
        <select
          className="entity-selector-select"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          {sorted.map(m => (
            <option key={m.entity_id} value={m.entity_id}>
              {m.entity_type === 'personal' ? `${m.entity_name} (Személyes)` : m.entity_name}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="entity-selector-chevron" />
      </div>
    </div>
  );
}
