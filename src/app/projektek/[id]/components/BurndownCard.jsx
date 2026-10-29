'use client';

import { ResponsiveContainer, AreaChart, Area, ReferenceLine, XAxis, YAxis, Tooltip } from 'recharts';
import { formatHUF } from '@/lib/constants';

export default function BurndownCard({ invoices, labourEntries, projectRooms, startDate, endDate }) {
  const quotedTotal = projectRooms.reduce((s, r) => s + Number(r.quoted_amount_net || 0), 0);

  const events = [
    ...invoices.map(i => ({ date: i.created_at?.slice(0, 10), amount: Number(i.value_huf || 0) })),
    ...labourEntries.map(l => ({ date: l.date, amount: Number(l.value_huf || 0) })),
  ].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));

  const totalActual = events.reduce((s, e) => s + e.amount, 0);
  const pct = quotedTotal > 0 ? Math.round((totalActual / quotedTotal) * 100) : null;
  const isOver = pct !== null && pct > 100;
  const lineColor = isOver ? '#ef4444' : '#22c55e';

  if (!quotedTotal && events.length === 0) {
    return (
      <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="stat-label">Elköltés az ajánlathoz</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nincs kapcsolt ajánlat</div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const seriesStart = startDate || events[0]?.date || today;
  let cum = 0;
  const chartData = [{ date: seriesStart, cost: 0 }];
  for (const e of events) {
    cum += e.amount;
    const last = chartData[chartData.length - 1];
    if (last.date === e.date) { last.cost = cum; } else { chartData.push({ date: e.date, cost: cum }); }
  }
  if (chartData[chartData.length - 1].date < today) chartData.push({ date: today, cost: cum });

  const fmt    = (d) => new Date(d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  const fmtHuf = (v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' Ft';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="stat-label">Elköltés az ajánlathoz</div>
        {pct !== null && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: lineColor }}>{pct}%</span>}
      </div>
      {quotedTotal > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
          <span>Elköltve: <strong style={{ color: lineColor }}>{fmtHuf(totalActual)}</strong></span>
          <span>Ajánlat: <strong>{fmtHuf(quotedTotal)}</strong></span>
        </div>
      )}
      <div style={{ height: 180, marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 0 }).format(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(v) => [fmtHuf(v), 'Költség']} labelFormatter={fmt} contentStyle={{ fontSize: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            {quotedTotal > 0 && <ReferenceLine y={quotedTotal} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'Ajánlat', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />}
            <Area type="monotone" dataKey="cost" stroke={lineColor} strokeWidth={2} fill="url(#burnFill)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
