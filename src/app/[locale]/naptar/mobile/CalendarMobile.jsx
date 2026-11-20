'use client';

/**
 * CalendarMobile — pods-design calendar page.
 * Each month is a collapsible pod (strip + expandable grid body).
 * Three consecutive months are shown; navigation shifts the window.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { useTranslations, useLocale } from 'next-intl';
import { Clock, FolderKanban, FileText } from 'lucide-react';

import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';

// ─── Per-month color palette (12 entries, one per calendar month) ────────────
const MONTH_PALETTE = [
  { bg: '#2F5BFF', deep: '#0E1840', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.17)', glow: 'rgba(255,255,255,0.10)' }, // Jan — cobalt
  { bg: '#0A7F72', deep: '#063028', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.15)', glow: 'rgba(255,255,255,0.08)' }, // Feb — teal
  { bg: '#7C3AED', deep: '#1C1038', soft: 'rgba(255,255,255,0.78)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)' }, // Mar — violet
  { bg: '#E11D48', deep: '#3B0618', soft: 'rgba(255,255,255,0.78)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)' }, // Apr — rose
  { bg: '#B45309', deep: '#2C1206', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.08)' }, // May — amber
  { bg: '#0369A1', deep: '#082032', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.08)' }, // Jun — sky
  { bg: '#D97706', deep: '#271500', soft: 'rgba(255,255,255,0.72)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.08)' }, // Jul — orange
  { bg: '#BE185D', deep: '#3B0A24', soft: 'rgba(255,255,255,0.78)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)' }, // Aug — pink
  { bg: '#1D6A42', deep: '#082516', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.08)' }, // Sep — green
  { bg: '#7C2D12', deep: '#2C0A04', soft: 'rgba(255,255,255,0.75)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.08)' }, // Oct — burnt orange
  { bg: '#1E3A5F', deep: '#0B1829', soft: 'rgba(255,255,255,0.72)', glass: 'rgba(255,255,255,0.13)', glow: 'rgba(255,255,255,0.07)' }, // Nov — navy
  { bg: '#4C1D95', deep: '#16093A', soft: 'rgba(255,255,255,0.78)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)' }, // Dec — deep violet
];

function monthColor(monthIndex) {
  return MONTH_PALETTE[((monthIndex % 12) + 12) % 12];
}

const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

// ─── Pure helpers (same logic as desktop page) ───────────────────────────────
function toDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function diffDays(a, b) {
  return Math.round((toDay(b) - toDay(a)) / 86400000);
}

function buildEvents(projects, quotes, clients, projectRooms, appointments = [], navPrefix = '') {
  const events = [];
  for (const p of projects) {
    if (p.start_date || p.end_date) {
      const client = p.client_id ? clients.find(c => c.id === p.client_id) : null;
      events.push({
        id: p.id, title: p.name, clientName: client?.name || null, type: 'project',
        start: p.start_date ? toDay(p.start_date) : null,
        end:   p.end_date   ? toDay(p.end_date)   : null,
        href: `${navPrefix}/projektek/${p.id}`,
      });
    }
    for (const r of (projectRooms || []).filter(r => r.project_id === p.id && (r.start_date || r.end_date))) {
      events.push({
        id: `room-${r.id}`, title: `${p.name} · ${r.name}`, clientName: null, type: 'project',
        start: r.start_date ? toDay(r.start_date) : null,
        end:   r.end_date   ? toDay(r.end_date)   : null,
        href: `${navPrefix}/projektek/${p.id}`,
      });
    }
  }
  for (const q of quotes) {
    if ((q.start_date || q.end_date) && q.status !== 'rejected') {
      const client = q.client_id ? clients.find(c => c.id === q.client_id) : null;
      events.push({
        id: q.id, title: q.title, clientName: client?.name || null, type: 'quote', status: q.status,
        start: q.start_date ? toDay(q.start_date) : null,
        end:   q.end_date   ? toDay(q.end_date)   : null,
        href: `${navPrefix}/ajanlatok/${q.id}`,
      });
    }
  }
  for (const a of appointments) {
    if (!a.date) continue;
    const client = a.client_id ? clients.find(c => c.id === a.client_id) : null;
    const day  = toDay(a.date);
    const href = a.linked_survey_id  ? `${navPrefix}/felmeres/${a.linked_survey_id}`
               : a.linked_quote_id   ? `${navPrefix}/ajanlatok/${a.linked_quote_id}`
               : a.linked_project_id ? `${navPrefix}/projektek/${a.linked_project_id}`
               : null;
    events.push({ id: `appt-${a.id}`, title: a.title, clientName: client?.name || null, type: 'appointment', start: day, end: day, href, time: a.time, apptId: a.id });
  }
  return events;
}

function assignLanes(weekEvents) {
  const lanes = [];
  for (const ev of weekEvents) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (ev.colStart > last.colEnd) { lane.push(ev); placed = true; break; }
    }
    if (!placed) lanes.push([ev]);
  }
  return lanes;
}

const EVENT_H   = 22;
const DAY_NUM_H = 32;

function buildMonthData(y, m, events) {
  const firstDay = new Date(y, m, 1);
  const lastDay  = new Date(y, m + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days = [];
  for (let i = 0; i < startDow; i++) {
    const d = new Date(firstDay); d.setDate(d.getDate() - (startDow - i));
    days.push({ date: toDay(d), inMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: toDay(new Date(y, m, d)), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const d = new Date(days[days.length - 1].date); d.setDate(d.getDate() + 1);
    days.push({ date: toDay(d), inMonth: false });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const weekSlices = weeks.map(week => {
    const wStart = week[0].date, wEnd = week[6].date;
    const sliced = [];
    for (const ev of events) {
      const eS = ev.start || ev.end, eE = ev.end || ev.start;
      if (!eS || !eE || eS > wEnd || eE < wStart) continue;
      sliced.push({
        ev,
        colStart: Math.max(0, diffDays(wStart, eS)),
        colEnd:   Math.min(6, diffDays(wStart, eE)),
        startsHere: eS >= wStart,
        endsHere:   eE <= wEnd,
      });
    }
    sliced.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
    return assignLanes(sliced);
  });

  // event count for pod strip badge
  const monthStart = new Date(y, m, 1);
  const monthEnd   = new Date(y, m + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  const count = events.filter(ev => {
    const eS = ev.start || ev.end, eE = ev.end || ev.start;
    if (!eS) return false;
    return eS <= monthEnd && eE >= monthStart;
  }).length;

  return { weeks, weekSlices, count };
}

// ─── Month grid (rendered inside the dark pod body) ──────────────────────────
function MonthGrid({ y, m, weekSlices, weeks, today, AppLink, setSelectedApptId }) {
  return (
    <>
      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {['H','K','Sze','Cs','P','Szo','V'].map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: '0.68rem', fontWeight: 700,
            color: i >= 5 ? '#FF8A8A' : 'rgba(255,255,255,0.55)',
            padding: '0.25rem 0', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        {weeks.map((week, wIdx) => {
          const lanes = weekSlices[wIdx] || [];
          const rowH = DAY_NUM_H + Math.max(1, lanes.length) * EVENT_H + 6;

          return (
            <div key={wIdx} style={{ position: 'relative', height: rowH, borderTop: wIdx > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', minHeight: rowH }}>
              {/* Day-number cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: DAY_NUM_H }}>
                {week.map(({ date, inMonth }, dIdx) => {
                  const isToday  = date.getTime() === today.getTime();
                  const isWeekend = dIdx >= 5;
                  return (
                    <div key={dIdx} style={{
                      borderLeft: dIdx > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      padding: '5px 7px 3px',
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      {isToday ? (
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: inMonth ? 600 : 400, color: inMonth ? (isWeekend ? '#FF8A8A' : 'rgba(255,255,255,0.90)') : 'rgba(255,255,255,0.28)' }}>
                          {date.getDate()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Event bars */}
              <div style={{ position: 'absolute', top: DAY_NUM_H, left: 0, right: 0, bottom: 0 }}>
                {lanes.map((lane, laneIdx) =>
                  lane.map(({ ev, colStart, colEnd, startsHere, endsHere }) => {
                    const isProject     = ev.type === 'project';
                    const isAppointment = ev.type === 'appointment';
                    const GridEl = isAppointment ? 'button' : AppLink;
                    const baseColor = isProject ? 'var(--success)' : isAppointment ? 'var(--accent)' : 'var(--warning)';
                    const bgColor   = isProject ? 'var(--success-bg)' : isAppointment ? '#eff6ff' : 'var(--warning-bg)';
                    const textColor = isProject ? 'var(--success-text)' : isAppointment ? '#1d4ed8' : 'var(--warning-text)';
                    const span = colEnd - colStart + 1;
                    const leftPct  = (colStart / 7) * 100;
                    const widthPct = (span / 7) * 100;

                    return (
                      <GridEl
                        key={`${ev.id}-${laneIdx}`}
                        href={!isAppointment ? ev.href : undefined}
                        onClick={isAppointment ? () => setSelectedApptId(ev.apptId) : undefined}
                        title={[ev.title, ev.clientName, `${ev.start ? formatDate(ev.start) : '?'} – ${ev.end ? formatDate(ev.end) : '?'}`].filter(Boolean).join(' · ')}
                        style={{
                          position: 'absolute',
                          top: laneIdx * EVENT_H + 2,
                          left:  `calc(${leftPct}%  + ${startsHere ? 3 : 0}px)`,
                          width: `calc(${widthPct}% - ${(startsHere ? 3 : 0) + (endsHere ? 3 : 0)}px)`,
                          height: EVENT_H - 4,
                          background: bgColor,
                          borderTop:    `1.5px solid ${baseColor}`,
                          borderBottom: `1.5px solid ${baseColor}`,
                          borderLeft:  startsHere ? `3px solid ${baseColor}` : 'none',
                          borderRight: endsHere   ? `2px solid ${baseColor}` : 'none',
                          borderRadius: `${startsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${startsHere ? 4 : 0}px`,
                          color: textColor,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          paddingLeft: startsHere ? '6px' : '3px',
                          paddingRight: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          zIndex: 1,
                          border: 'none',
                        }}
                      >
                        {startsHere && (
                          <span style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                            {isProject      ? <FolderKanban size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                            : isAppointment ? <Clock        size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                            :                 <FileText     size={10} style={{ marginRight: 3, flexShrink: 0 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.time ? `${ev.time.slice(0,5)} ` : ''}{ev.title}{ev.clientName ? ` · ${ev.clientName}` : ''}
                            </span>
                          </span>
                        )}
                      </GridEl>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Month pod ────────────────────────────────────────────────────────────────
function MonthPod({ monthLabel, year, count, isActive, onActivate, colors, children }) {
  const { bg, deep, soft, glass, glow } = colors;
  return (
    <section style={{ flexShrink: 0, borderRadius: 28, overflow: 'hidden', background: deep, boxShadow: '0 24px 40px -24px rgba(14,17,22,0.5)' }}>
      {/* Strip */}
      <div style={{ position: 'relative', height: 64, overflow: 'hidden', background: bg, color: '#fff' }}>
        {/* Glow orb */}
        <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -130, width: 280, height: 280, borderRadius: 140, background: glow, pointerEvents: 'none' }} />

        <button
          onClick={() => !isActive && onActivate()}
          aria-pressed={isActive}
          style={{
            position: 'relative', width: '100%', height: 64,
            boxSizing: 'border-box', padding: '0 16px 0 14px',
            border: 0, background: 'transparent', color: 'inherit',
            display: 'flex', alignItems: 'center', gap: 12,
            textAlign: 'left', cursor: isActive ? 'default' : 'pointer',
          }}
        >
          {/* Calendar icon */}
          <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 21, background: glass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </span>

          {/* Month + year */}
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {monthLabel}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: soft }}>{year}</span>
          </span>

          {/* Event count badge */}
          <span style={{ flexShrink: 0, minWidth: 32, height: 26, padding: '0 10px', boxSizing: 'border-box', borderRadius: 13, background: '#fff', color: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
            {count == null ? '—' : count}
          </span>
        </button>
      </div>

      {/* Expanded body */}
      {isActive && (
        <div style={{ boxSizing: 'border-box', padding: '16px 14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CalendarMobile() {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const router = useRouter();

  const { projects = [], quotes = [], clients = [], loading, projectRooms, isDemoMode } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;

  const [view,            setView]            = useState('grid');
  const [currentDate,     setCurrentDate]     = useState(new Date());
  const [appointments,    setAppointments]    = useState([]);
  const [activePodMonth,  setActivePodMonth]  = useState(0); // 0 = first of three shown months
  const [activeSheet,     setActiveSheet]     = useState(null);
  const [newApptOpen,     setNewApptOpen]     = useState(false);
  const [selectedApptId,  setSelectedApptId]  = useState(null);

  const fetchAppointments = useCallback(() => {
    fetch('/api/appointments')
      .then(r => r.ok ? r.json() : { appointments: [] })
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {});
  }, []);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const events = useMemo(
    () => buildEvents(projects, quotes, clients, projectRooms, appointments, navPrefix),
    [projects, quotes, clients, projectRooms, appointments, navPrefix]
  );

  // Upcoming events for timeline view
  const upcomingEvents = useMemo(() =>
    events
      .filter(e => { const end = e.end || e.start; return end && end >= today; })
      .sort((a, b) => (a.start || a.end) - (b.start || b.end)),
    [events, today]
  );

  // Locale-aware month names
  const MONTHS_LOC = useMemo(() => Array.from({length: 12}, (_, i) => {
    const d = new Date(2024, i, 1);
    return new Intl.DateTimeFormat(locale === 'hu' ? 'hu-HU' : locale, { month: 'long' }).format(d);
  }), [locale]);

  // Three consecutive months starting from currentDate
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const threeMonths = useMemo(() => [0, 1, 2].map(offset => {
    const d = new Date(year, month + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }), [year, month]);

  const threeMonthsData = useMemo(() =>
    threeMonths.map(({ year: y, month: m }) => buildMonthData(y, m, events)),
    [threeMonths, events]
  );

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurrentDate(new Date()); setActivePodMonth(0); };

  if (loading) return null;

  return (
    <div className="pod-screen m-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas, #EDEBE5)', color: 'var(--m-ink, #0E1116)', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)', overflowX: 'hidden' }}>
      <PageHeader
        onMenu={() => setActiveSheet('menu')}
        onMessages={() => setActiveSheet('messages')}
        onNotifications={() => setActiveSheet('notif')}
      />

      <div style={{ padding: '108px 16px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Page heading */}
        <button
          onClick={() => router.push(`${navPrefix}/dashboard`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: '0 0 4px 2px', cursor: 'pointer', textAlign: 'left' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--m-ink, #0E1116)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6"/>
          </svg>
          <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--m-ink, #0E1116)' }}>
            {t('pageTitle')}
          </h1>
        </button>

        {/* View toggle + new appointment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', gap: 6, background: 'rgba(14,17,22,0.08)', padding: '4px', borderRadius: 24 }}>
            {[
              { key: 'grid',     label: t('month') },
              { key: 'timeline', label: t('timeline') },
            ].map(({ key, label }) => {
              const on = view === key;
              return (
                <button key={key} onClick={() => setView(key)}
                  style={{ flex: 1, height: 40, border: 0, borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: on ? '#fff' : 'transparent', color: on ? 'var(--m-ink)' : 'var(--m-ink-2)', boxShadow: on ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setNewApptOpen(true)}
            aria-label={t('newAppointment')}
            style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: monthColor(month).bg, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: 600, alignItems: 'center', padding: '0 2px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 20, height: 8, borderRadius: 3, background: 'var(--success)', display: 'inline-block' }} />
            {t('project')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 20, height: 8, borderRadius: 3, background: 'var(--warning)', display: 'inline-block' }} />
            {t('quote')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 20, height: 8, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} />
            {t('appointment')}
          </span>
        </div>

        {/* ── TIMELINE VIEW ──────────────────────────────────────────────────── */}
        {view === 'timeline' && (
          upcomingEvents.length === 0 ? (
            <div style={{ borderRadius: 28, background: monthColor(month).deep, padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{t('noUpcoming')}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{t('noUpcomingHint')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingEvents.map(event => {
                const isProject     = event.type === 'project';
                const isAppointment = event.type === 'appointment';
                const accentColor   = isProject ? 'var(--success)' : isAppointment ? 'var(--accent)' : 'var(--warning)';
                const Wrapper = isAppointment ? 'button' : event.href ? AppLink : 'div';
                return (
                  <Wrapper
                    key={event.id}
                    href={!isAppointment ? (event.href || undefined) : undefined}
                    onClick={isAppointment ? () => setSelectedApptId(event.apptId) : undefined}
                    style={{ textDecoration: 'none', ...(isAppointment ? { background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer', textAlign: 'left' } : {}) }}
                  >
                    <div style={{ background: '#fff', borderRadius: 22, padding: '14px 16px', borderLeft: `4px solid ${accentColor}`, display: 'flex', alignItems: 'flex-start', gap: '0.85rem', boxShadow: CARD_SHADOW }}>
                      <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', background: isProject ? 'var(--success-bg)' : isAppointment ? '#eff6ff' : 'var(--warning-bg)', flexShrink: 0 }}>
                        {isProject      ? <FolderKanban size={18} color="var(--success)" />
                        : isAppointment ? <Clock        size={18} color="var(--accent)" />
                        :                 <FileText     size={18} color="var(--warning)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.title}{event.clientName ? <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}> · {event.clientName}</span> : null}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span>
                            {isAppointment && event.time
                              ? `${formatDate(event.start)} ${event.time.slice(0,5)}`
                              : `${event.start ? formatDate(event.start) : '?'}${event.end && event.end.getTime() !== event.start?.getTime() ? ` – ${formatDate(event.end)}` : ''}`}
                          </span>
                          <span style={{ fontWeight: 600, color: accentColor }}>
                            {isProject ? t('project') : isAppointment ? t('appointment') : (QUOTE_STATUSES.find(s => s.id === event.status)?.label || t('quote'))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )
        )}

        {/* ── GRID VIEW (month pods) ─────────────────────────────────────────── */}
        {view === 'grid' && (
          <>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={prevMonth} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(14,17,22,0.08)', color: 'var(--m-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
              </button>
              <button onClick={goToday} style={{ flex: 1, height: 44, border: 0, borderRadius: 22, background: 'rgba(14,17,22,0.08)', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {t('today')}
              </button>
              <button onClick={nextMonth} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(14,17,22,0.08)', color: 'var(--m-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>

            {/* Three month pods */}
            {threeMonths.map((mn, mIdx) => {
              const { weeks, weekSlices, count } = threeMonthsData[mIdx];
              const colors = monthColor(mn.month);
              return (
                <MonthPod
                  key={`${mn.year}-${mn.month}`}
                  monthLabel={MONTHS_LOC[mn.month]}
                  year={mn.year}
                  count={count}
                  isActive={activePodMonth === mIdx}
                  onActivate={() => setActivePodMonth(mIdx)}
                  colors={colors}
                >
                  <MonthGrid
                    y={mn.year}
                    m={mn.month}
                    weeks={weeks}
                    weekSlices={weekSlices}
                    today={today}
                    AppLink={AppLink}
                    setSelectedApptId={setSelectedApptId}
                  />
                </MonthPod>
              );
            })}
          </>
        )}
      </div>

      <Dock
        activeTab="calendar"
        onCreatePress={() => setNewApptOpen(true)}
        activePodColor={{ plusBg: monthColor(month).bg, plusFg: '#FFFFFF' }}
      />

      {/* Modals */}
      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => { setNewApptOpen(false); fetchAppointments(); }}
      />
      <AppointmentDetailModal
        apptId={selectedApptId}
        isOpen={!!selectedApptId}
        onClose={() => setSelectedApptId(null)}
        onChanged={fetchAppointments}
      />

      {/* Sheets */}
      {activeSheet === 'notif'    && <NotifSheet    onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'messages' && <MessagesSheet onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'menu'     && <MenuSheet     onClose={() => setActiveSheet(null)} />}
    </div>
  );
}
