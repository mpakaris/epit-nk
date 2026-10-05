'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { Calendar, FolderKanban, FileText, ArrowUpRight } from 'lucide-react';

export default function UpcomingEvents({ limit = 5 }) {
  const { projects, quotes } = useApp();

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = [];

    for (const p of projects) {
      if (p.start_date || p.end_date) {
        const end = p.end_date ? new Date(p.end_date) : new Date(p.start_date);
        if (end >= today) {
          events.push({
            id: p.id,
            title: p.name,
            start: p.start_date ? new Date(p.start_date) : null,
            end: p.end_date ? new Date(p.end_date) : null,
            type: 'project',
            href: `/projektek/${p.id}`,
          });
        }
      }
    }

    for (const q of quotes) {
      if ((q.start_date || q.end_date) && q.status !== 'rejected') {
        const end = q.end_date ? new Date(q.end_date) : new Date(q.start_date);
        if (end >= today) {
          events.push({
            id: q.id,
            title: q.title,
            start: q.start_date ? new Date(q.start_date) : null,
            end: q.end_date ? new Date(q.end_date) : null,
            type: 'quote',
            status: q.status,
            href: `/ajanlatok/${q.id}`,
          });
        }
      }
    }

    return events
      .sort((a, b) => (a.start || a.end) - (b.start || b.end))
      .slice(0, limit);
  }, [projects, quotes, limit]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={17} color="var(--accent)" /> Közelgő események
        </h3>
        <Link href="/naptar" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          Naptár <ArrowUpRight size={13} />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.75rem 0', textAlign: 'center' }}>
          Nincs dátummal ellátott közelgő projekt vagy ajánlat.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {upcoming.map(event => {
            const isProject = event.type === 'project';
            return (
              <Link key={event.id} href={event.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: `1px solid var(--border-subtle)`,
                  borderLeft: `3px solid ${isProject ? 'var(--success)' : 'var(--warning)'}`,
                  transition: 'background 0.12s ease',
                }}>
                  <div style={{
                    padding: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isProject ? 'var(--success-bg)' : 'var(--warning-bg)',
                    flexShrink: 0,
                  }}>
                    {isProject
                      ? <FolderKanban size={15} color="var(--success)" />
                      : <FileText size={15} color="var(--warning)" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.title}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {event.start ? formatDate(event.start) : '?'} – {event.end ? formatDate(event.end) : '?'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                    padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)',
                    background: isProject ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: isProject ? 'var(--success-text)' : 'var(--warning-text)',
                  }}>
                    {isProject ? 'Projekt' : (QUOTE_STATUSES.find(s => s.id === event.status)?.label || 'Ajánlat')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
