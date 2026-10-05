import React from 'react';
import Link from 'next/link';

export default function StatCard({ label, value, sub, variant = '', icon: Icon, href }) {
  const inner = (
    <div className={`stat-card ${variant} ${href ? 'stat-card-clickable' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        {Icon && (
          <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}
