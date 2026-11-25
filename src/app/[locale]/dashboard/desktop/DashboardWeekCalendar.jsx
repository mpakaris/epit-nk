'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { Clock, FolderKanban, FileText, ChevronRight } from 'lucide-react';
import NewAppointmentModal from '@/components/NewAppointmentModal';

function toDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

const DOT = {
  appointment: '#2563eb',
  project:     '#3A4963',
  quote:       '#6D3FD1',
};

const TYPE_ICON = {
  appointment: Clock,
  project:     FolderKanban,
  quote:       FileText,
};

export default function DashboardWeekCalendar({ navPrefix }) {
  const t    = useTranslations('dashboard');
  const tCal = useTranslations('calendar');
  const locale = useLocale();
  const { projects, quotes, clients } = useApp();

  const DAY_ABBR = tCal.raw('days');

  const [appointments, setAppointments] = useState([]);
  const [newApptOpen,  setNewApptOpen]  = useState(false);

  const fetchAppointments = useCallback(() => {
    fetch('/api/appointments')
      .then(r => r.ok ? r.json() : { appointments: [] })
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {});
  }, []);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const today = useMemo(() => toDay(new Date()), []);

  const monday = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return d;
  }, [today]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);

  const events = useMemo(() => {
    const out = [];
    for (const p of projects || []) {
      const date = p.end_date || p.deadline;
      if (!date) continue;
      const client = clients?.find(c => c.id === p.client_id);
      out.push({ date: toDay(date), title: p.name, meta: client?.name || '', type: 'project', href: `${navPrefix}/projektek/${p.id}` });
    }
    for (const q of quotes || []) {
      if (!q.end_date || q.status === 'rejected') continue;
      const client = clients?.find(c => c.id === q.client_id);
      out.push({ date: toDay(q.end_date), title: q.title, meta: client?.name || '', type: 'quote', href: `${navPrefix}/ajanlatok/${q.id}` });
    }
    for (const a of appointments) {
      if (!a.date) continue;
      const client = clients?.find(c => c.id === a.client_id);
      out.push({ date: toDay(a.date), title: a.title, meta: client?.name || '', type: 'appointment', time: a.time?.slice(0, 5) || '', apptId: a.id });
    }
    return out;
  }, [projects, quotes, appointments, clients, navPrefix]);

  function eventsForDay(d) {
    return events.filter(ev => ev.date.getTime() === d.getTime());
  }

  const [selectedDay, setSelectedDay] = useState(() => toDay(new Date()));

  const selectedEvents = useMemo(
    () => events.filter(ev => ev.date.getTime() === selectedDay.getTime()),
    [selectedDay, events]
  );

  const monthFmt = new Intl.DateTimeFormat(locale === 'hu' ? 'hu-HU' : locale, { month: 'short', day: 'numeric' });
  const rangeLabel = `${monthFmt.format(days[0])} – ${monthFmt.format(days[13])}`;

  function DayButton({ day }) {
    const isToday = day.getTime() === today.getTime();
    const isSel   = day.getTime() === selectedDay.getTime();
    const isWknd  = day.getDay() === 0 || day.getDay() === 6;
    const dayEvs  = eventsForDay(day);
    const abbr    = DAY_ABBR[(day.getDay() + 6) % 7];

    return (
      <button
        type="button"
        onClick={() => setSelectedDay(day)}
        aria-pressed={isSel}
        style={{
          minHeight: 66, padding: '6px 2px', border: 0,
          borderRadius: 12,
          background: isSel ? '#EDEBE5' : 'transparent',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9A9FA8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {abbr}
        </span>
        <span style={{
          width: 30, height: 30, borderRadius: 15,
          background: isToday ? '#0E1116' : 'transparent',
          color: isToday ? '#fff' : isWknd ? 'var(--danger-text)' : '#0E1116',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: isToday || isSel ? 800 : 600,
        }}>
          {day.getDate()}
        </span>
        <span style={{ height: 6, display: 'flex', gap: 2, alignItems: 'center' }}>
          {dayEvs.slice(0, 3).map((ev, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: DOT[ev.type] || '#5A5F68' }} />
          ))}
        </span>
      </button>
    );
  }

  return (
    <section className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* Card header */}
      <div style={{ padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #EDEBE5' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#0E1116' }}>
            {t('calendarSection')}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9A9FA8', marginTop: 1 }}>
            {rangeLabel}
          </div>
        </div>
        <Link
          href={`${navPrefix}/naptar`}
          className="dk-btn dk-btn-l"
          style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontSize: 13, height: 36 }}
        >
          {tCal('pageTitle')} <ChevronRight size={14} />
        </Link>
        <button
          type="button"
          onClick={() => setNewApptOpen(true)}
          className="dk-btn dk-btn-dark"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, height: 36 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          {tCal('newAppointment')}
        </button>
      </div>

      {/* Week grids */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9FA8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2, paddingLeft: 4 }}>
          {t('thisWeekLabel')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.slice(0, 7).map((day, i) => <DayButton key={i} day={day} />)}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9FA8', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 6, marginBottom: 2, paddingLeft: 4 }}>
          {t('nextWeekLabel')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.slice(7).map((day, i) => <DayButton key={i + 7} day={day} />)}
        </div>
      </div>

      {/* Selected day event list */}
      <div style={{ margin: '10px 16px 14px', borderRadius: 12, background: '#F8F8F9', border: '1px solid #EDEBE5', minHeight: 44, overflow: 'hidden' }}>
        {selectedEvents.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#9A9FA8' }}>
            {tCal('noEvents')}
          </div>
        ) : (
          selectedEvents.slice(0, 4).map((ev, idx) => {
            const Icon = TYPE_ICON[ev.type] || Clock;
            const dot  = DOT[ev.type];
            const Row  = ev.href ? Link : 'div';
            return (
              <Row
                key={idx}
                href={ev.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  borderTop: idx > 0 ? '1px solid #EDEBE5' : 'none',
                  textDecoration: 'none', color: '#0E1116',
                }}
              >
                <Icon size={14} style={{ flexShrink: 0, color: dot }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.time ? <span style={{ color: '#9A9FA8', marginRight: 5 }}>{ev.time}</span> : null}
                  {ev.title}
                </span>
                {ev.meta && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#9A9FA8', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.meta}
                  </span>
                )}
              </Row>
            );
          })
        )}
      </div>

      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => { setNewApptOpen(false); fetchAppointments(); }}
      />
    </section>
  );
}
