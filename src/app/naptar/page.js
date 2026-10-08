'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate, QUOTE_STATUSES } from '@/lib/constants';
import {
  ChevronLeft, ChevronRight, FolderKanban, FileText,
  Calendar, List, AlertTriangle
} from 'lucide-react';

const DAYS_HU  = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const MONTHS_HU = [
  'Január','Február','Március','Április','Május','Június',
  'Július','Augusztus','Szeptember','Október','November','December'
];

// Midnight-normalised Date from any date-ish value
function toDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function diffDays(a, b) {
  return Math.round((toDay(b) - toDay(a)) / 86400000);
}

function buildEvents(projects, quotes, clients) {
  const events = [];
  for (const p of projects) {
    if (p.start_date || p.end_date) {
      const client = p.client_id ? clients.find(c => c.id === p.client_id) : null;
      events.push({
        id: p.id, title: p.name, clientName: client?.name || null, type: 'project',
        start: p.start_date ? toDay(p.start_date) : null,
        end:   p.end_date   ? toDay(p.end_date)   : null,
        href: `/projektek/${p.id}`,
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
        href: `/ajanlatok/${q.id}`,
      });
    }
  }
  return events;
}

function hasConflict(events, event) {
  if (event.type !== 'quote') return false;
  const qS = event.start, qE = event.end || event.start;
  if (!qS) return false;
  return events.some(e => {
    if (e.type !== 'project') return false;
    const pS = e.start, pE = e.end || e.start;
    if (!pS) return false;
    return qS <= pE && qE >= pS;
  });
}

// Assign events in a week to non-overlapping lanes
function assignLanes(weekEvents) {
  const lanes = [];
  for (const ev of weekEvents) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (ev.colStart > last.colEnd) {
        lane.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([ev]);
  }
  return lanes; // lanes[i] = array of {event, colStart, colEnd}
}

const EVENT_H   = 22; // px per lane
const DAY_NUM_H = 32; // px for the date-number row

// Build all weeks + event slices for one month
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
        conflict:   hasConflict(events, ev),
      });
    }
    sliced.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
    return assignLanes(sliced);
  });

  return { weeks, weekSlices };
}

export default function CalendarPage() {
  const { projects, quotes, clients, loading } = useApp();
  const [view, setView]               = useState('grid');
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(() => buildEvents(projects, quotes, clients), [projects, quotes, clients]);
  const today  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  // ── TIMELINE ──────────────────────────────────────────────────────────────
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => { const end = e.end || e.start; return end && end >= today; })
      .sort((a, b) => (a.start || a.end) - (b.start || b.end));
  }, [events, today]);

  // ── 3-MONTH GRID ─────────────────────────────────────────────────────────
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Three consecutive months starting from currentDate
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
  const goToday   = () => setCurrentDate(new Date());

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  const conflictingEvents = events.filter(e => hasConflict(events, e));

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Naptár</h1>
            <p className="page-subtitle">Projektek és ajánlatok ütemezése</p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <button type="button" onClick={() => setView('timeline')} style={viewBtnStyle(view === 'timeline')}>
              <List size={15} /> Időrend
            </button>
            <button type="button" onClick={() => setView('grid')} style={viewBtnStyle(view === 'grid')}>
              <Calendar size={15} /> Hónap
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 600, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '28px', height: '10px', borderRadius: '3px', background: 'var(--success)', display: 'inline-block' }} />
          Projekt
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '28px', height: '10px', borderRadius: '3px', background: 'var(--warning)', display: 'inline-block' }} />
          Ajánlat
        </span>
        {conflictingEvents.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-text)' }}>
            <AlertTriangle size={13} /> Ütközés
          </span>
        )}
      </div>

      {/* ═══ TIMELINE VIEW ═══════════════════════════════════════════════════ */}
      {view === 'timeline' && (
        upcomingEvents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Nincs közelgő esemény</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Adj hozzá kezdési és befejezési dátumot a projektekhez és ajánlatokhoz.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {upcomingEvents.map(event => {
              const conflict = hasConflict(events, event);
              const isProject = event.type === 'project';
              return (
                <Link key={event.id} href={event.href} style={{ textDecoration: 'none' }}>
                  <div className="card card-interactive" style={{ padding: '1rem', borderLeft: `4px solid ${isProject ? 'var(--success)' : 'var(--warning)'}`, display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: isProject ? 'var(--success-bg)' : 'var(--warning-bg)', flexShrink: 0 }}>
                      {isProject ? <FolderKanban size={18} color="var(--success)" /> : <FileText size={18} color="var(--warning)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{event.title}</span>
                        {event.clientName && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>· {event.clientName}</span>
                        )}
                        {conflict && <ConflictBadge />}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          {event.start ? formatDate(event.start) : '?'} – {event.end ? formatDate(event.end) : '?'}
                        </span>
                        <span style={{ fontWeight: 600, color: isProject ? 'var(--success-text)' : 'var(--warning-text)' }}>
                          {isProject ? 'Projekt' : (QUOTE_STATUSES.find(s => s.id === event.status)?.label || 'Ajánlat')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* ═══ MONTH GRID VIEW ═════════════════════════════════════════════════ */}
      {view === 'grid' && (
        <div>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button type="button" onClick={prevMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, flex: 1, textAlign: 'center' }}>
              {MONTHS_HU[threeMonths[0].month]} {threeMonths[0].year} – {MONTHS_HU[threeMonths[2].month]} {threeMonths[2].year}
            </h2>
            <button type="button" onClick={goToday} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>Ma</button>
            <button type="button" onClick={nextMonth} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Three months stacked */}
          {threeMonths.map((mn, mIdx) => {
            const { weeks, weekSlices } = threeMonthsData[mIdx];
            return (
              <div key={mIdx} style={{ marginBottom: '2rem' }}>
                {/* Month label */}
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  {MONTHS_HU[mn.month]} {mn.year}
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid var(--border-subtle)' }}>
                  {DAYS_HU.map((d, i) => (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
                      color: i >= 5 ? 'var(--danger-text)' : 'var(--text-muted)',
                      padding: '0.35rem 0', letterSpacing: '0.04em', textTransform: 'uppercase'
                    }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Week rows */}
                <div style={{ border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', overflow: 'hidden', background: '#fff' }}>
                  {weeks.map((week, wIdx) => {
                    const lanes = weekSlices[wIdx] || [];
                    const rowH = DAY_NUM_H + Math.max(1, lanes.length) * EVENT_H + 6;

                    return (
                      <div key={wIdx} style={{ position: 'relative', height: rowH, borderTop: wIdx > 0 ? '1px solid var(--border-subtle)' : 'none', minHeight: rowH }}>
                        {/* Day-number cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: DAY_NUM_H }}>
                          {week.map(({ date, inMonth }, dIdx) => {
                            const isToday = date.getTime() === today.getTime();
                            const isWeekend = dIdx >= 5;
                            return (
                              <div key={dIdx} style={{
                                borderLeft: dIdx > 0 ? '1px solid var(--border-subtle)' : 'none',
                                padding: '5px 7px 3px',
                                background: !inMonth ? 'var(--bg-subtle)' : isWeekend ? '#fafafa' : '#fff',
                                display: 'flex', justifyContent: 'flex-end',
                              }}>
                                {isToday ? (
                                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {date.getDate()}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', fontWeight: inMonth ? 600 : 400, color: inMonth ? (isWeekend ? 'var(--danger-text)' : 'var(--text-primary)') : 'var(--text-muted)' }}>
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
                            lane.map(({ ev, colStart, colEnd, startsHere, endsHere, conflict }) => {
                              const isProject = ev.type === 'project';
                              const baseColor = conflict ? 'var(--danger)' : (isProject ? 'var(--success)' : 'var(--warning)');
                              const bgColor   = conflict ? 'var(--danger-bg)' : (isProject ? 'var(--success-bg)' : 'var(--warning-bg)');
                              const textColor = conflict ? 'var(--danger-text)' : (isProject ? 'var(--success-text)' : 'var(--warning-text)');
                              const span = colEnd - colStart + 1;
                              const leftPct  = (colStart / 7) * 100;
                              const widthPct = (span / 7) * 100;

                              return (
                                <Link
                                  key={`${ev.id}-${laneIdx}`}
                                  href={ev.href}
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
                                    fontSize: '0.69rem',
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
                                  }}
                                >
                                  {startsHere && (
                                    <span className="cal-event-text" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                      {isProject
                                        ? <FolderKanban size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                                        : <FileText size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                                      }
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ev.title}{ev.clientName ? ` · ${ev.clientName}` : ''}
                                      </span>
                                      {conflict && <AlertTriangle size={9} style={{ marginLeft: 3, flexShrink: 0 }} />}
                                    </span>
                                  )}
                                </Link>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Conflict warnings */}
          {conflictingEvents.length > 0 && (
            <div style={{ marginTop: '0.5rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <AlertTriangle size={16} /> Ütközési figyelmeztetések
              </div>
              {conflictingEvents.map(e => (
                <div key={e.id} style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginBottom: '0.2rem' }}>
                  <Link href={e.href} style={{ fontWeight: 700, color: 'var(--danger-text)' }}>{e.title}</Link>{' '}
                  ajánlat dátuma ütközik egy megerősített projekttel.
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function viewBtnStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
    border: 'none', fontSize: '0.85rem',
    fontWeight: active ? 800 : 600, cursor: 'pointer',
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  };
}

function ConflictBadge() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger-text)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
      <AlertTriangle size={10} /> Ütközés!
    </span>
  );
}
