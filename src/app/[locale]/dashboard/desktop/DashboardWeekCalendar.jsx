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

// Map event type → dot color
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

  const DAY_ABBR = tCal.raw('days'); // Mon-first array ['H','K','Sze',...]

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

  // Monday of current week
  const monday = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay(); // 0=Sun
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return d;
  }, [today]);

  // 14 days: current week Mon–Sun + next week Mon–Sun
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);

  // Build all events from projects, quotes, appointments
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

  // Default selection: today if in range, else first day
  const [selectedDay, setSelectedDay] = useState(() => toDay(new Date()));

  const selectedEvents = useMemo(
    () => events.filter(ev => ev.date.getTime() === selectedDay.getTime()),
    [selectedDay, events]
  );

  // Month label for header range
  const monthFmt = new Intl.DateTimeFormat(locale === 'hu' ? 'hu-HU' : locale, { month: 'short', day: 'numeric' });
  const rangeLabel = `${monthFmt.format(days[0])} – ${monthFmt.format(days[13])}`;

  function DayButton({ day, idx }) {
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
          minHeight: 68, padding: '6px 2px 6px', border: 0,
          borderRadius: 14,
          background: isSel ? 'rgba(255,255,255,0.14)' : 'transparent',
          color: '#fff', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: isSel ? '#fff' : 'rgba(255,255,255,0.5)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {abbr}
        </span>
        <span style={{
          width: 30, height: 30, borderRadius: 15,
          background: isToday ? '#fff' : isSel ? 'rgba(255,255,255,0.22)' : 'transparent',
          color: isToday ? '#1E3059' : isWknd ? '#FF8A8A' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700,
        }}>
          {day.getDate()}
        </span>
        <span style={{ height: 6, display: 'flex', gap: 2, alignItems: 'center' }}>
          {dayEvs.slice(0, 3).map((ev, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: DOT[ev.type] || '#fff', opacity: isSel ? 1 : 0.75 }} />
          ))}
        </span>
      </button>
    );
  }

  return (
    <section className="dk-card" style={{ padding: 0, overflow: 'hidden', background: '#1E3059', color: '#fff' }}>

      {/* Card header */}
      <div style={{ padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#fff' }}>
            {t('calendarSection')}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
            {rangeLabel}
          </div>
        </div>
        <Link
          href={`${navPrefix}/naptar`}
          style={{ height: 36, padding: '0 14px', borderRadius: 18, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', flexShrink: 0 }}
        >
          {tCal('pageTitle')} <ChevronRight size={14} />
        </Link>
        <button
          type="button"
          onClick={() => setNewApptOpen(true)}
          style={{ height: 36, padding: '0 14px', borderRadius: 18, background: '#fff', color: '#1E3059', fontSize: 13, fontWeight: 700, border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          {tCal('newAppointment')}
        </button>
      </div>

      {/* Week grids */}
      <div style={{ padding: '10px 16px 0' }}>

        {/* This week */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2, paddingLeft: 4 }}>
          {t('thisWeekLabel')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.slice(0, 7).map((day, i) => <DayButton key={i} day={day} idx={i} />)}
        </div>

        {/* Next week */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 6, marginBottom: 2, paddingLeft: 4 }}>
          {t('nextWeekLabel')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.slice(7).map((day, i) => <DayButton key={i + 7} day={day} idx={i + 7} />)}
        </div>
      </div>

      {/* Selected day events */}
      <div style={{ margin: '10px 16px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', minHeight: 44 }}>
        {selectedEvents.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
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
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  textDecoration: 'none', color: '#fff',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: dot, flexShrink: 0 }} />
                <Icon size={14} style={{ flexShrink: 0, color: dot, opacity: 0.9 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.time ? <span style={{ opacity: 0.6, marginRight: 5 }}>{ev.time}</span> : null}
                  {ev.title}
                </span>
                {ev.meta && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
