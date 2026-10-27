'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { Calendar, FolderKanban, FileText, ArrowUpRight, Plus, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import useMobile from '@/hooks/useMobile';

const DAYS_HU       = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const MONTHS_SHORT  = ['Jan','Feb','Már','Ápr','Máj','Jún','Júl','Aug','Sze','Okt','Nov','Dec'];

function toDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function diffDays(a, b) {
  return Math.round((toDay(b) - toDay(a)) / 86400000);
}

function assignLanes(weekEvents) {
  const lanes = [];
  for (const ev of weekEvents) {
    let placed = false;
    for (const lane of lanes) {
      if (ev.colStart > lane[lane.length - 1].colEnd) {
        lane.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([ev]);
  }
  return lanes;
}

const EVENT_H  = 20;
const DAY_NUM_H = 28;

export default function CalendarWidget({ projects: propProjects, quotes: propQuotes, clients: propClients } = {}) {
  const ctx = useApp();
  const projects = propProjects ?? ctx.projects;
  const quotes = propQuotes ?? ctx.quotes;
  const clients = propClients ?? ctx.clients;
  const projectRooms = ctx.projectRooms;

  const [appointments,    setAppointments]    = useState([]);
  const [newApptOpen,     setNewApptOpen]     = useState(false);
  const [selectedApptId,  setSelectedApptId]  = useState(null);
  const [weekOffset,      setWeekOffset]      = useState(0);
  const isMobile = useMobile();

  function fetchAppointments() {
    fetch('/api/appointments')
      .then(r => r.ok ? r.json() : { appointments: [] })
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {});
  }
  useEffect(() => { fetchAppointments(); }, []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const year  = today.getFullYear();
  const month = today.getMonth();

  const events = useMemo(() => {
    const list = [];
    for (const p of projects) {
      if (p.start_date || p.end_date) {
        const client = p.client_id ? clients.find(c => c.id === p.client_id) : null;
        list.push({ id: p.id, title: p.name, clientName: client?.name || null, type: 'project', start: p.start_date ? toDay(p.start_date) : null, end: p.end_date ? toDay(p.end_date) : null, href: `/projektek/${p.id}` });
      }
      for (const r of (projectRooms || []).filter(r => r.project_id === p.id && (r.start_date || r.end_date))) {
        list.push({ id: `room-${r.id}`, title: `${p.name} · ${r.name}`, clientName: null, type: 'project', start: r.start_date ? toDay(r.start_date) : null, end: r.end_date ? toDay(r.end_date) : null, href: `/projektek/${p.id}` });
      }
    }
    for (const q of quotes) {
      if ((q.start_date || q.end_date) && q.status !== 'rejected') {
        const client = q.client_id ? clients.find(c => c.id === q.client_id) : null;
        list.push({ id: q.id, title: q.title, clientName: client?.name || null, type: 'quote', status: q.status, start: q.start_date ? toDay(q.start_date) : null, end: q.end_date ? toDay(q.end_date) : null, href: `/ajanlatok/${q.id}` });
      }
    }
    for (const a of appointments) {
      if (!a.date) continue;
      const client = a.client_id ? clients.find(c => c.id === a.client_id) : null;
      const day = toDay(a.date);
      const href = a.linked_survey_id  ? `/felmeres/${a.linked_survey_id}`
                 : a.linked_quote_id   ? `/ajanlatok/${a.linked_quote_id}`
                 : a.linked_project_id ? `/projektek/${a.linked_project_id}`
                 : null;
      list.push({ id: `appt-${a.id}`, title: a.title, clientName: client?.name || null, type: 'appointment', start: day, end: day, href, time: a.time, apptId: a.id });
    }
    return list;
  }, [projects, quotes, clients, projectRooms, appointments]);

  // ── Mobile: week view ────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const base = new Date(today);
    const dow  = base.getDay(); // 0=Sun
    base.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  const weekLabel = useMemo(() => {
    const s = weekDays[0], e = weekDays[6];
    if (s.getMonth() === e.getMonth())
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
  }, [weekDays]);

  const weekEvents = useMemo(() => {
    const wStart = weekDays[0], wEnd = weekDays[6];
    return events
      .filter(ev => {
        const s = ev.start || ev.end, e = ev.end || ev.start;
        return s && e && s <= wEnd && e >= wStart;
      })
      .sort((a, b) => (a.start || a.end) - (b.start || b.end));
  }, [events, weekDays]);

  const dotsByDay = useMemo(() =>
    weekDays.map(day =>
      events.filter(ev => {
        const s = ev.start || ev.end, e = ev.end || ev.start;
        return s && e && day >= s && day <= e;
      })
    ),
  [weekDays, events]);

  // ── Desktop: month view ───────────────────────────────────────────────────
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const days = [];
    for (let i = 0; i < startDow; i++) {
      const d = new Date(firstDay); d.setDate(d.getDate() - (startDow - i));
      days.push({ date: toDay(d), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: toDay(new Date(year, month, d)), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const d = new Date(days[days.length - 1].date); d.setDate(d.getDate() + 1);
      days.push({ date: toDay(d), inMonth: false });
    }

    const ws = [];
    for (let i = 0; i < days.length; i += 7) ws.push(days.slice(i, i + 7));
    return ws;
  }, [year, month]);

  const weekSlices = useMemo(() => {
    return weeks.map(week => {
      const wStart = week[0].date;
      const wEnd   = week[6].date;
      const sliced = [];
      for (const ev of events) {
        const eS = ev.start || ev.end;
        const eE = ev.end   || ev.start;
        if (!eS || !eE || eS > wEnd || eE < wStart) continue;
        const colStart   = Math.max(0, diffDays(wStart, eS));
        const colEnd     = Math.min(6, diffDays(wStart, eE));
        const startsHere = eS >= wStart;
        const endsHere   = eE <= wEnd;
        sliced.push({ ev, colStart, colEnd, startsHere, endsHere });
      }
      sliced.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
      return assignLanes(sliced);
    });
  }, [weeks, events]);

  const MONTHS_HU = ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December'];

  // ── Mobile weekly render ─────────────────────────────────────────────────
  if (isMobile) {
    const eventColor = (type) =>
      type === 'project' ? 'var(--success)' : type === 'appointment' ? 'var(--accent)' : 'var(--warning)';

    return (
      <div className="card" style={{ padding: '0.9rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={() => setWeekOffset(w => w - 1)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: 90, textAlign: 'center' }}>
              {weekLabel}
            </span>
            <button type="button" onClick={() => setWeekOffset(w => w + 1)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px', color: 'var(--text-secondary)' }}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" onClick={() => setNewApptOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            }}>
            <Plus size={13} /> Időpont
          </button>
        </div>

        {/* Week strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 12 }}>
          {weekDays.map((day, i) => {
            const isToday   = day.getTime() === today.getTime();
            const isWeekend = i >= 5;
            const dots      = dotsByDay[i];
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isWeekend ? 'var(--danger-text)' : 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>
                  {DAYS_HU[i]}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#fff' : isWeekend ? 'var(--danger-text)' : 'var(--text-primary)',
                }}>
                  {day.getDate()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, minHeight: 7 }}>
                  {dots.slice(0, 3).map((ev, j) => (
                    <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: eventColor(ev.type) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Event list for the week */}
        {weekEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '0.75rem 0 0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Ezen a héten nincs esemény.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weekEvents.map(ev => {
              const color   = eventColor(ev.type);
              const isAppt  = ev.type === 'appointment';
              const Wrapper = isAppt ? 'button' : ev.href ? Link : 'div';
              return (
                <Wrapper
                  key={ev.id}
                  href={!isAppt ? (ev.href || undefined) : undefined}
                  onClick={isAppt ? () => setSelectedApptId(ev.apptId) : undefined}
                  style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, width: '100%', cursor: isAppt ? 'pointer' : undefined, textAlign: 'left' }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.time ? `${ev.time.slice(0, 5)} · ` : ''}{ev.title}
                      </div>
                      {ev.clientName && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{ev.clientName}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                      {formatDate(ev.start || ev.end)}
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}

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
      </div>
    );
  }

  // ── Desktop monthly render ────────────────────────────────────────────────
  return (
    <div className="card" style={{ padding: '1.1rem 1.1rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={16} color="var(--accent)" />
          {MONTHS_HU[month]} {year}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setNewApptOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Időpont
          </button>
          <Link href="/naptar" style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
            Teljes naptár <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 0 }}>
        {DAYS_HU.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.65rem', fontWeight: 700,
            color: i >= 5 ? 'var(--danger-text)' : 'var(--text-muted)',
            padding: '0.2rem 0', textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', overflow: 'hidden' }}>
        {weeks.map((week, wIdx) => {
          const lanes  = weekSlices[wIdx] || [];
          const rowH   = DAY_NUM_H + Math.max(1, lanes.length) * EVENT_H + 4;

          return (
            <div key={wIdx} style={{ position: 'relative', height: rowH, borderTop: wIdx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
              {/* Day-number cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: DAY_NUM_H }}>
                {week.map(({ date, inMonth }, dIdx) => {
                  const isToday   = date.getTime() === today.getTime();
                  const isWeekend = dIdx >= 5;
                  return (
                    <div key={dIdx} style={{
                      borderLeft: dIdx > 0 ? '1px solid var(--border-subtle)' : 'none',
                      padding: '4px 5px 2px',
                      background: !inMonth ? 'var(--bg-subtle)' : isWeekend ? '#fafafa' : '#fff',
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      {isToday ? (
                        <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: inMonth ? 600 : 400, color: !inMonth ? 'var(--text-muted)' : isWeekend ? 'var(--danger-text)' : 'var(--text-primary)' }}>
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
                    const baseColor = isProject ? 'var(--success)' : isAppointment ? 'var(--accent)' : 'var(--warning)';
                    const bgColor   = isProject ? 'var(--success-bg)' : isAppointment ? '#eff6ff' : 'var(--warning-bg)';
                    const textColor = isProject ? 'var(--success-text)' : isAppointment ? '#1d4ed8' : 'var(--warning-text)';
                    const span      = colEnd - colStart + 1;

                    const EventEl = isAppointment ? 'button' : Link;
                    return (
                      <EventEl
                        key={`${ev.id}-${laneIdx}`}
                        href={!isAppointment ? ev.href : undefined}
                        onClick={isAppointment ? () => setSelectedApptId(ev.apptId) : undefined}
                        title={[ev.title, ev.clientName, `${ev.start ? formatDate(ev.start) : '?'} – ${ev.end ? formatDate(ev.end) : '?'}`].filter(Boolean).join(' · ')}
                        style={{
                          position: 'absolute',
                          top: laneIdx * EVENT_H + 2,
                          left:  `calc(${(colStart / 7) * 100}% + ${startsHere ? 2 : 0}px)`,
                          width: `calc(${(span / 7) * 100}% - ${(startsHere ? 2 : 0) + (endsHere ? 2 : 0)}px)`,
                          height: EVENT_H - 4,
                          background: bgColor,
                          borderTop:    `1.5px solid ${baseColor}`,
                          borderBottom: `1.5px solid ${baseColor}`,
                          borderLeft:  startsHere ? `3px solid ${baseColor}` : 'none',
                          borderRight: endsHere   ? `1.5px solid ${baseColor}` : 'none',
                          borderRadius: `${startsHere ? 3 : 0}px ${endsHere ? 3 : 0}px ${endsHere ? 3 : 0}px ${startsHere ? 3 : 0}px`,
                          color: textColor,
                          fontSize: '0.63rem',
                          fontWeight: 700,
                          paddingLeft: startsHere ? '5px' : '2px',
                          paddingRight: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          zIndex: 1,
                        }}
                      >
                        {startsHere && (
                          <span className="cal-event-text" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                            {isProject     ? <FolderKanban size={9} style={{ marginRight: 2, flexShrink: 0 }} />
                            : isAppointment ? <Clock        size={9} style={{ marginRight: 2, flexShrink: 0 }} />
                            :                <FileText      size={9} style={{ marginRight: 2, flexShrink: 0 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.time ? `${ev.time.slice(0,5)} ` : ''}{ev.title}{ev.clientName ? ` · ${ev.clientName}` : ''}
                            </span>
                          </span>
                        )}
                      </EventEl>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.9rem', marginTop: '0.65rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 20, height: 8, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} /> Projekt
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 20, height: 8, borderRadius: 2, background: 'var(--warning)', display: 'inline-block' }} /> Ajánlat
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 20, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} /> Időpont
        </span>
      </div>

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
    </div>
  );
}
