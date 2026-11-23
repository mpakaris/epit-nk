'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, LabelList, XAxis, YAxis, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';

const CAT_KEYS = ['material', 'equipment', 'delivery', 'parking', 'other'];
const CAT_COLORS = {
  material:  '#6366f1',
  equipment: '#f59e0b',
  delivery:  '#3b82f6',
  parking:   '#ef4444',
  other:     '#94a3b8',
  labour:    '#22c55e',
};
const CAT_LABEL_KEYS = {
  material:  'catMaterial',
  equipment: 'catTools',
  delivery:  'catDelivery',
  parking:   'catParking',
  other:     'catOther',
  labour:    'catLabour',
};

export default function CostBreakdownCard({ invoices, labourTotal }) {
  const t  = useTranslations('projectDetail');
  const tP = useTranslations('projects');

  const totals = Object.fromEntries(CAT_KEYS.map(c => [c, 0]));
  let labourInvoiceTotal = 0;
  for (const inv of invoices) {
    if (inv.category === 'labour') { labourInvoiceTotal += Number(inv.value_huf || 0); continue; }
    if (inv.category in totals) totals[inv.category] += Number(inv.value_huf || 0);
  }

  const data = [
    ...CAT_KEYS.map(c => ({ key: c, name: tP(CAT_LABEL_KEYS[c]), value: totals[c] })),
    { key: 'labour', name: tP(CAT_LABEL_KEYS.labour), value: labourTotal + labourInvoiceTotal },
  ];

  const fmtHuf = (v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' Ft';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '4px solid #4338ca', boxShadow: '0 4px 16px rgba(67,56,202,0.15), 0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="stat-label">{t('costBreakdownTitle')}</div>
      <div style={{ height: 180, marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => [fmtHuf(v), t('amountTooltipLabel')]} contentStyle={{ fontSize: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map(entry => <Cell key={entry.key} fill={CAT_COLORS[entry.key] || '#94a3b8'} opacity={entry.value === 0 ? 0.2 : 1} />)}
              <LabelList dataKey="value" position="right" formatter={fmtHuf} style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
