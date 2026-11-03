'use client';

import { Ruler } from 'lucide-react';

export const WINDOW_M2 = 1.5;
export const DOOR_M2   = 2.0;
export const PILL_STYLE = { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };

export default function AreaSummary({ entry }) {
  const { width_m, length_m, size_m2, height_m, window_count, door_count } = entry;
  const w = Number(width_m), l = Number(length_m);
  const floorArea = w > 0 && l > 0 ? w * l : (size_m2 != null ? Number(size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const hasFloor = floorArea != null;
  const hasWall  = height_m != null && perimeter != null;
  if (!hasFloor && !hasWall) return null;
  const windowArea = (window_count || 0) * WINDOW_M2;
  const doorArea   = (door_count   || 0) * DOOR_M2;
  const openings   = windowArea + doorArea;
  const grossWall  = hasWall ? perimeter * height_m : null;
  const netWall    = grossWall != null ? Math.max(0, grossWall - openings) : null;
  const fmt = v => Number(v).toFixed(2).replace('.', ',') + ' m²';
  const Row = ({ label, value, sub, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: sub ? '#a78bfa' : '#7c3aed', fontWeight: sub ? 400 : 600, paddingLeft: sub ? '0.75rem' : 0 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: bold ? 800 : 600, color: bold ? '#4c1d95' : '#6d28d9', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: '#f5f3ff', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', marginTop: '0.5rem', border: '1px solid #e9d5ff' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7c3aed', marginBottom: '0.3rem' }}>Területek</div>
      {hasFloor && <Row label="Padló / Mennyezet" value={fmt(floorArea)} />}
      {grossWall != null && <Row label="Falfelület (bruttó)" value={fmt(grossWall)} />}
      {openings > 0 && <Row label={`Kivonások (${window_count||0} ablak + ${door_count||0} ajtó)`} value={`− ${fmt(openings)}`} sub />}
      {netWall != null && <Row label="Falfelület (nettó)" value={fmt(netWall)} bold />}
      <div style={{ fontSize: '0.62rem', color: '#a78bfa', marginTop: '0.2rem' }}>Ablak: ~1,5 m² · Ajtó: ~2,0 m²</div>
    </div>
  );
}
