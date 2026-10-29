'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => (
  <div style={{ height: 300, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
  </div>
) });

export default function ServiceAreaEditor({ content, onChange }) {
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
