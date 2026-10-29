'use client';

import { formatHUF } from '@/lib/constants';

export default function CombinedStatsCard({ totalCost, invoiceCount, totalLabour, labourCount, collective, ownPaid, balance }) {
  const row = (label, value, sub, color) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {row('Összes kiadás', formatHUF(totalCost), `${invoiceCount} db számla`)}
      {row('Munkadíj', formatHUF(totalLabour), `${labourCount} bejegyzés`, 'var(--success-text)')}
      {collective && row('Általad fizetve', formatHUF(ownPaid), 'saját számlák')}
      {collective && row('Egyenleg', balance > 0 ? `+${formatHUF(balance)}` : formatHUF(balance), balance > 0 ? 'követelés' : balance < 0 ? 'tartozás' : 'rendezett', balance > 0 ? 'var(--success-text)' : balance < 0 ? 'var(--danger-text)' : undefined)}
    </div>
  );
}
