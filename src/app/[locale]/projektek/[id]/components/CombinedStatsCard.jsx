'use client';

import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatHUF } from '@/lib/constants';

export default function CombinedStatsCard({ totalCost, invoiceCount, totalLabour, labourCount, collective, ownPaid, balance }) {
  const t = useTranslations('projectDetail');
  const hasInvoices = invoiceCount > 0;
  const hasLabour   = labourCount > 0;

  if (!hasInvoices && !hasLabour && !collective) return null;

  const row = (label, value, sub, valueColor) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: valueColor || 'var(--text-primary)' }}>{value}</div>
    </div>
  );

  return (
    <div className="card" style={{ borderLeft: '4px solid #065f46', boxShadow: '0 4px 16px rgba(6,95,70,0.18), 0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065f46', marginBottom: '0.35rem' }}>
        <TrendingUp size={13} /> {t('financialSummaryTitle')}
      </div>
      {hasInvoices && row(t('totalExpensesLabel'), formatHUF(totalCost), t('invoiceCountSub', { count: invoiceCount }))}
      {hasLabour   && row(t('labourFeeLabel'), formatHUF(totalLabour), t('labourCountSub', { count: labourCount }), 'var(--success-text)')}
      {collective  && row(t('paidByYouLabel'), formatHUF(ownPaid), t('ownInvoicesSub'))}
      {collective  && row(t('balanceLabel'),
        balance > 0 ? `+${formatHUF(balance)}` : formatHUF(balance),
        balance > 0 ? t('balanceCredit') : balance < 0 ? t('balanceDebt') : t('balanceSettled'),
        balance > 0 ? 'var(--success-text)' : balance < 0 ? 'var(--danger-text)' : undefined
      )}
    </div>
  );
}
