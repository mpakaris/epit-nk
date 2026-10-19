'use client';

import { useApp } from '@/context/AppContext';
import { UsersRound, Crown, UserCheck } from 'lucide-react';
import { DEMO_USERS } from '@/context/demo/seed';

const ROLE_LABEL = { owner: 'Tulajdonos', admin: 'Admin', contributor: 'Közreműködő' };
const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--success-text)' };
const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--success-bg)' };

export default function DemoKollektivakPage() {
  const { collectives, currentUser } = useApp();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <UsersRound size={22} />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Kollektívák</h1>
      </div>

      {collectives.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nincsenek kollektívák.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {collectives.map(col => (
            <div key={col.collective_id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <UsersRound size={18} style={{ color: 'var(--accent)' }} />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{col.name}</h2>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-pill)',
                  color: ROLE_COLOR[col.role] || 'var(--text-muted)',
                  background: ROLE_BG[col.role] || 'var(--bg-subtle)',
                  border: `1px solid ${ROLE_COLOR[col.role] || 'var(--border-subtle)'}33`,
                }}>
                  {ROLE_LABEL[col.role] || col.role}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Tagok</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {DEMO_USERS.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.collective_role === 'owner' ? <Crown size={14} style={{ color: 'var(--accent)' }} /> : <UserCheck size={14} style={{ color: 'var(--success-text)' }} />}
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.display_name}</span>
                      {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(te)</span>}
                    </div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: ROLE_COLOR[u.collective_role] || 'var(--text-muted)',
                    }}>
                      {ROLE_LABEL[u.collective_role] || u.collective_role}
                    </span>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Demo módban a kollektíva kezelése (meghívás, törlés) nem elérhető.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
