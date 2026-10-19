'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import PageSpinner from '@/components/PageSpinner';
import {
  BarChart2, Users, MousePointerClick, TrendingUp,
  Globe, Navigation, Eye, RefreshCw, Calendar,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'var(--primary)' }) {
  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{value ?? '—'}</div>
        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color = 'var(--primary)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
      <div>
        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      </div>
      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: 32, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

function DailyChart({ data }) {
  if (!data?.length) return <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1rem 0' }}>No data yet</div>;
  const maxEv = Math.max(...data.map(d => d.events), 1);
  return (
    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-end', height: 80 }}>
      {data.map(d => {
        const h = Math.max(4, Math.round((d.events / maxEv) * 72));
        const isToday = d.day === new Date().toISOString().slice(0, 10);
        return (
          <div key={d.day} title={`${d.day}: ${d.events} events, ${d.sessions} sessions`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'default' }}>
            <div style={{ width: '100%', height: h, background: isToday ? 'var(--primary)' : 'var(--primary-bg, #e0e7ff)', borderRadius: 3, transition: 'height 0.3s' }} />
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: 1, textAlign: 'center' }}>
              {d.day.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const EVENT_ICON = {
  page_view:     { icon: Eye,               color: '#6366f1' },
  nav_click:     { icon: Navigation,        color: '#0ea5e9' },
  landing_click: { icon: MousePointerClick, color: '#f97316' },
  action:        { icon: TrendingUp,        color: '#22c55e' },
};

export default function DemoAnalyticsPage() {
  const { isSuperAdmin } = useApp();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('overview');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/superadmin/demo-stats');
      if (!r.ok) throw new Error('Failed to load stats');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;
  if (loading) return <PageSpinner />;
  if (error)   return <div className="container" style={{ paddingTop: '2rem', color: 'var(--danger-text)' }}>{error}</div>;
  if (!data)   return null;

  const { summary, dailyChart, landingStats, navStats, pathStats, recent } = data;
  const maxLanding = landingStats[0]?.clicks || 1;
  const maxNav     = navStats[0]?.clicks     || 1;
  const maxPath    = pathStats[0]?.views     || 1;

  const TABS = [
    { key: 'overview', label: 'Overview'   },
    { key: 'landing',  label: 'Landing'    },
    { key: 'demo',     label: 'Demo nav'   },
    { key: 'events',   label: 'Event log'  },
  ];

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={22} /> Demo &amp; Landing Analytics
            </h1>
            <p className="page-subtitle">Real-time data on landing page and demo interactions</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px,100%), 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Users}             label="Sessions (30 days)"  value={summary.totalSessions} color="#6366f1" />
        <StatCard icon={MousePointerClick} label="Events (30 days)"    value={summary.totalEvents}   color="#f97316" />
        <StatCard icon={Calendar}          label="Sessions today"       value={summary.todaySessions} color="#0ea5e9" />
        <StatCard icon={TrendingUp}        label="Events today"         value={summary.todayClicks}   color="#22c55e" />
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.25rem', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm, 6px)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              background: tab === t.key ? 'var(--bg-card)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px,100%), 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart2 size={14} style={{ color: 'var(--primary)' }} /> Daily activity (14 days)
            </div>
            <DailyChart data={dailyChart} />
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MousePointerClick size={14} style={{ color: '#f97316' }} /> Landing page button clicks
            </div>
            {landingStats.slice(0, 6).map(s => (
              <MiniBar key={s.label} label={s.label} value={s.clicks} max={maxLanding} color="#f97316" />
            ))}
            {!landingStats.length && <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No data yet</div>}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={14} style={{ color: '#6366f1' }} /> Demo pages (views)
            </div>
            {pathStats.slice(0, 8).map(s => (
              <MiniBar key={s.path} label={s.path} value={s.views} max={maxPath} color="#6366f1" />
            ))}
            {!pathStats.length && <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No data yet</div>}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Navigation size={14} style={{ color: '#0ea5e9' }} /> Demo sidebar clicks
            </div>
            {navStats.slice(0, 8).map(s => (
              <MiniBar key={s.label} label={s.label} value={s.clicks} max={maxNav} color="#0ea5e9" />
            ))}
            {!navStats.length && <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No data yet</div>}
          </div>
        </div>
      )}

      {/* ── LANDING ── */}
      {tab === 'landing' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Button / Text', 'Location', 'Clicks', 'Share'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'Clicks' || h === 'Share' ? 'right' : 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {landingStats.map((s, i) => {
                const total = landingStats.reduce((sum, x) => sum + x.clicks, 0);
                const pct = total > 0 ? Math.round((s.clicks / total) * 100) : 0;
                const locations = Object.entries(s.locations || {}).map(([k, v]) => `${k} (${v})`).join(', ');
                return (
                  <tr key={s.label} style={{ borderTop: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{s.label}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{locations || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>{s.clicks}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 99, background: pct > 20 ? '#dcfce7' : 'var(--bg-subtle)', color: pct > 20 ? '#166534' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!landingStats.length && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DEMO NAV ── */}
      {tab === 'demo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px,100%), 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Sidebar navigation clicks</div>
            {navStats.map(s => (
              <MiniBar key={s.label} label={s.label} value={s.clicks} max={maxNav} color="#0ea5e9" />
            ))}
            {!navStats.length && <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No data yet</div>}
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Demo pages visited</div>
            {pathStats.map(s => (
              <div key={s.path} style={{ marginBottom: '0.6rem' }}>
                <MiniBar label={s.path} value={s.views} max={maxPath} color="#6366f1" />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-0.4rem', marginBottom: '0.2rem' }}>
                  {s.uniq} unique session{s.uniq !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
            {!pathStats.length && <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No data yet</div>}
          </div>
        </div>
      )}

      {/* ── EVENT LOG ── */}
      {tab === 'events' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Time', 'Type', 'Path', 'Label', 'Session', 'IP hash', 'Country'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((e, i) => {
                const meta = EVENT_ICON[e.event] || { icon: Globe, color: 'var(--text-muted)' };
                const Icon = meta.icon;
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                    <td style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(e.created_at).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: meta.color }}>
                        <Icon size={11} /> {e.event}
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 0.85rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{e.path || '—'}</td>
                    <td style={{ padding: '0.55rem 0.85rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{e.label || '—'}</td>
                    <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.session_id?.slice(0, 12)}</td>
                    <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.ip_hash || '—'}</td>
                    <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-secondary)' }}>{e.country || '—'}</td>
                  </tr>
                );
              })}
              {!recent.length && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No events recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
