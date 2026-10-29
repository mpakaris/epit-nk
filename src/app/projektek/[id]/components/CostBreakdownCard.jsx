'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, LabelList, XAxis, YAxis, Tooltip } from 'recharts';

const CAT_COLORS = {
  'Anyag':             '#6366f1',
  'Szerszám/Eszköz':   '#f59e0b',
  'Szállítás':         '#3b82f6',
  'Engedély/Hatóság':  '#ef4444',
  'Egyéb':             '#94a3b8',
  'Munkadíj':          '#22c55e',
};

export default function CostBreakdownCard({ invoices, labourTotal }) {
  const cats = ['Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'];
  const totals = Object.fromEntries(cats.map(c => [c, 0]));
  for (const inv of invoices) {
    if (inv.category in totals) totals[inv.category] += Number(inv.value_huf || 0);
  }
  const data = [...cats.map(c => ({ name: c, value: totals[c] })), { name: 'Munkadíj', value: labourTotal }];
  const fmtHuf = (v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' Ft';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div className="stat-label">Költségek megoszlása</div>
      <div style={{ height: 180, marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => [fmtHuf(v), 'Összeg']} contentStyle={{ fontSize: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#94a3b8'} opacity={entry.value === 0 ? 0.2 : 1} />)}
              <LabelList dataKey="value" position="right" formatter={fmtHuf} style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
