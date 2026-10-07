'use client';

import React from 'react';

function fmt(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtHUF(n) {
  return Number(n || 0).toLocaleString('hu-HU') + ' Ft';
}

const TYPE_LABELS = {
  material: 'Anyag', labour: 'Munka', equipment: 'Gép/Eszköz',
  transport: 'Szállítás', other: 'Egyéb',
};

export default function PrintQuote({ project, quote, client, entity }) {
  const entries = quote.entries || [];
  const net = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate = Number(quote.tax_percent ?? 27);
  const tax = Math.round(net * taxRate / 100);
  const gross = net + tax;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 18mm 15mm; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 3rem', background: '#fff', minHeight: '100vh' }}>

        {/* Print / Back buttons */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <a href={`/naplo/${project.id}`} style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            ← Vissza
          </a>
          <button
            onClick={() => window.print()}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🖨 Nyomtatás / PDF mentés
          </button>
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.25rem' }}>
              {entity?.name || 'Epitünk'}
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 0.15rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Árajánlat
            </h1>
            <div style={{ fontSize: '0.875rem', color: '#475569' }}>{quote.title}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.15rem' }}>Dátum</div>
            <div style={{ fontWeight: 700 }}>{fmt(quote.created_at?.split('T')[0])}</div>
            {(quote.start_date || quote.end_date) && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', marginBottom: '0.15rem' }}>Tervezett időszak</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{fmt(quote.start_date)} – {fmt(quote.end_date)}</div>
              </>
            )}
          </div>
        </div>

        {/* ── Parties ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Contractor */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.4rem' }}>Vállalkozó</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{entity?.name || '–'}</div>
          </div>

          {/* Client */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.4rem' }}>Megrendelő</div>
            {client ? (
              <>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{client.name}</div>
                {client.address && <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.15rem' }}>{client.address}</div>}
                {client.phone && <div style={{ fontSize: '0.825rem', color: '#475569' }}>📞 {client.phone}</div>}
                {client.email && <div style={{ fontSize: '0.825rem', color: '#475569' }}>✉ {client.email}</div>}
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>Nincs megrendelő megadva</div>
            )}
          </div>
        </div>

        {/* Project / description */}
        {(project.name || quote.description || quote.location || quote.work_type) && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.4rem' }}>Projekt</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{project.name}</div>
            {quote.work_type && <div style={{ fontSize: '0.825rem', color: '#475569' }}>Munka típusa: {quote.work_type}</div>}
            {quote.location && <div style={{ fontSize: '0.825rem', color: '#475569' }}>Helyszín: {quote.location}</div>}
            {quote.description && <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.25rem' }}>{quote.description}</div>}
          </div>
        )}

        {/* ── Line items ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #0f172a' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem 0.5rem 0', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', width: '45%' }}>Megnevezés</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', width: '15%' }}>Típus</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', width: '20%' }}>Mennyiség</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0 0.5rem 0.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', width: '20%' }}>Összeg</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '0.6rem 0.75rem 0.6rem 0', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 600 }}>{e.work_description}</div>
                  {e.notes && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>{e.notes}</div>}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: '#64748b', verticalAlign: 'top' }}>
                  {TYPE_LABELS[e.entry_type] || e.entry_type}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#475569', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                  {e.quantity != null && e.unit ? `${e.quantity} ${e.unit}` : '–'}
                  {e.unit_price ? <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{e.unit_price.toLocaleString('hu-HU')} Ft/egység</div> : null}
                </td>
                <td style={{ padding: '0.6rem 0 0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', verticalAlign: 'top' }}>
                  {fmtHUF(e.amount_huf)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div style={{ marginLeft: 'auto', maxWidth: 280, marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
            <span style={{ color: '#475569' }}>Nettó összeg</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmtHUF(net)}</span>
          </div>
          {taxRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              <span style={{ color: '#475569' }}>ÁFA ({taxRate}%)</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmtHUF(tax)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', fontSize: '1.05rem', fontWeight: 800 }}>
            <span>Bruttó összesen</span>
            <span style={{ fontFamily: 'monospace' }}>{fmtHUF(gross)}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
          {entity?.name || 'Epitünk'} · {fmt(new Date().toISOString().split('T')[0])} · Csak tájékoztató jellegű
        </div>
      </div>
    </>
  );
}
