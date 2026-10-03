import React from 'react';

export default function StatCard({ label, value, sub, variant = '', icon: Icon }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        {Icon && (
          <div style={{ 
            padding: '0.5rem', 
            borderRadius: 'var(--radius-sm)', 
            background: 'var(--bg-subtle)',
            color: 'var(--text-secondary)'
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
