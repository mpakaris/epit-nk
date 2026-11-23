'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, FolderKanban, FileText, Calendar, List, Clock } from 'lucide-react';
import NewAppointmentModal from '@/components/NewAppointmentModal';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

  return { weeks, weekSlices };
}

// ─── Month grid card ──────────────────────────────────────────────────────────

function MonthCard({ monthLabel, year, weeks, weekSlices, today, AppLink, setSelectedApptId, DAYS_LOC }) {
  return (
    <section className="dk-card" style={{ overflow: 'hidden' }}>
      {/* Month heading */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #EDEBE5' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          {monthLabel} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{year}</span>
        </span>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #EDEBE5', background: '#FAFAFA' }}>
        {DAYS_LOC.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: '0.7rem', fontWeight: 700,
            color: i >= 5 ? 'var(--danger-text)' : 'var(--text-muted)',
            padding: '6px 0', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div>
        {weeks.map((week, wIdx) => {
          const lanes = weekSlices[wIdx] || [];
          const rowH = DAY_NUM_H + Math.max(1, lanes.length) * EVENT_H + 6;

          return (
            <div key={wIdx} style={{ position: 'relative', height: rowH, minHeight: rowH, borderTop: wIdx > 0 ? '1px solid #EDEBE5' : 'none' }}>
              {/* Day-number cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: DAY_NUM_H }}>
                {week.map(({ date, inMonth }, dIdx) => {
                  const isToday   = date.getTime() === today.getTime();
                  const isWeekend = dIdx >= 5;
                  return (
                    <div key={dIdx} style={{
                      borderLeft: dIdx > 0 ? '1px solid #EDEBE5' : 'none',
                      padding: '5px 7px 3px',
                      background: !inMonth ? '#F8F8F9' : isWeekend ? '#FAFAFA' : '#fff',
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      {isToday ? (
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.73rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.73rem', fontWeight: inMonth ? 600 : 400, color: inMonth ? (isWeekend ? 'var(--danger-text)' : 'var(--text-primary)') : 'var(--text-muted)' }}>
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
                          left:  `calc(${leftPct}% + ${startsHere ? 3 : 0}px)`,
                          width: `calc(${widthPct}% - ${(startsHere ? 3 : 0) + (endsHere ? 3 : 0)}px)`,
                          height: EVENT_H - 4,
                          background: bgColor,
                          borderTop:    `1.5px solid ${baseColor}`,
                          borderBottom: `1.5px solid ${baseColor}`,
                          borderLeft:  startsHere ? `3px solid ${baseColor}` : 'none',
                          borderRight: endsHere   ? `2px solid ${baseColor}` : 'none',
                          borderRadius: `${startsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${startsHere ? 4 : 0}px`,
                          color: textColor,
                          fontSize: '0.68rem',
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
                          border: isAppointment ? 'none' : undefined,
                        }}
                      >
                        {startsHere && (
                          <span style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                            {isProject      ? <FolderKanban size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                            : isAppointment ? <Clock        size={10} style={{ marginRight: 3, flexShrink: 0 }} />
                            :                 <FileText     size={10} style={{ marginRight: 3, flexShrink: 0 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.time ? `${ev.time.slice(0, 5)} ` : ''}{ev.title}{ev.clientName ? ` · ${ev.clientName}` : ''}
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
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarDesktop() {
  const { projects, quotes, clients, projectRooms, isDemoMode, contextSwitching } = useApp();
  const t = useTranslations('calendar');
  const locale = useLocale();
  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;

  const DAYS_LOC = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(locale === 'hu' ? 'hu-HU' : locale, { weekday: 'narrow' }).format(d);
  }), [locale]);

  const MONTHS_LOC = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2024, i, 1);
    return new Intl.DateTimeFormat(locale === 'hu' ? 'hu-HU' : locale, { month: 'long' }).format(d);
  }), [locale]);

  const [view,           setView]           = useState('grid');
  const [currentDate,    setCurrentDate]    = useState(new Date());
  const [appointments,   setAppointments]   = useState([]);
  const [newApptOpen,    setNewApptOpen]    = useState(false);
  const [selectedApptId, setSelectedApptId] = useState(null);

  const fetchAppointments = useCallback(() => {
    fetch('/api/appointments')
      .then(r => r.ok ? r.json() : { appointments: [] })
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {});
  }, []);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const today  = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const events = useMemo(() => buildEvents(projects, quotes, clients, projectRooms, appointments, navPrefix), [projects, quotes, clients, projectRooms, appointments, navPrefix]);

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

  const upcomingEvents = useMemo(() =>
    events
      .filter(e => { const end = e.end || e.start; return end && end >= today; })
      .sort((a, b) => (a.start || a.end) - (b.start || b.end)),
    [events, today]
  );

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => setCurrentDate(new Date());

  return (
    <div className="dk-page dk-mod-calendar">
      {/* ── Header ── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="dk-kick">{t('desktopKicker')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.12)', padding: 4, borderRadius: 24 }}>
            <button
              type="button"
              onClick={() => setView('grid')}
              style={{
                height: 36, padding: '0 16px', border: 0, borderRadius: 18,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: view === 'grid' ? '#fff' : 'transparent',
                color: view === 'grid' ? 'var(--text-primary)' : 'rgba(255,255,255,0.75)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Calendar size={14} />
              {t('month')}
            </button>
            <button
              type="button"
              onClick={() => setView('timeline')}
              style={{
                height: 36, padding: '0 16px', border: 0, borderRadius: 18,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: view === 'timeline' ? '#fff' : 'transparent',
                color: view === 'timeline' ? 'var(--text-primary)' : 'rgba(255,255,255,0.75)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <List size={14} />
              {t('timeline')}
            </button>
          </div>
          {/* New appointment */}
          <button
            type="button"
            onClick={() => setNewApptOpen(true)}
            className="dk-btn dk-btn-w"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            {t('newAppointment')}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="dk-body">
        {contextSwitching ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="dk-ws-spinner" />
          </div>
        ) : (
          <>
            {/* Legend + month navigation row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                {[
                  { color: 'var(--success)', label: t('project') },
                  { color: 'var(--warning)', label: t('quote') },
                  { color: 'var(--accent)',  label: t('appointment') },
                ].map(({ color, label }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ width: 20, height: 8, borderRadius: 3, background: color, display: 'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Month navigation (grid view only) */}
              {view === 'grid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={prevMonth} className="dk-btn dk-btn-g" style={{ width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" onClick={goToday} className="dk-btn dk-btn-g" style={{ padding: '0 20px', fontSize: 13 }}>
                    {t('today')}
                  </button>
                  <button type="button" onClick={nextMonth} className="dk-btn dk-btn-g" style={{ width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* ── GRID VIEW ── */}
            {view === 'grid' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {threeMonths.map((mn, mIdx) => {
                  const { weeks, weekSlices } = threeMonthsData[mIdx];
                  return (
                    <MonthCard
                      key={`${mn.year}-${mn.month}`}
                      monthLabel={MONTHS_LOC[mn.month]}
                      year={mn.year}
                      weeks={weeks}
                      weekSlices={weekSlices}
                      today={today}
                      AppLink={AppLink}
                      setSelectedApptId={setSelectedApptId}
                      DAYS_LOC={DAYS_LOC}
                    />
                  );
                })}
              </div>
            )}

            {/* ── TIMELINE VIEW ── */}
            {view === 'timeline' && (
              upcomingEvents.length === 0 ? (
                <div className="dk-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
                  <Calendar size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {t('noUpcoming')}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {t('noUpcomingHint')}
                  </div>
                </div>
              ) : (
                <div className="dk-card" style={{ overflow: 'hidden' }}>
                  {upcomingEvents.map((event, idx) => {
                    const isProject     = event.type === 'project';
                    const isAppointment = event.type === 'appointment';
                    const accentColor   = isProject ? 'var(--success)' : isAppointment ? 'var(--accent)' : 'var(--warning)';
                    const bgColor       = isProject ? 'var(--success-bg)' : isAppointment ? '#eff6ff' : 'var(--warning-bg)';
                    const Wrapper = isAppointment ? 'button' : event.href ? AppLink : 'div';
                    return (
                      <Wrapper
                        key={event.id}
                        href={!isAppointment ? (event.href || undefined) : undefined}
                        onClick={isAppointment ? () => setSelectedApptId(event.apptId) : undefined}
                        className="dk-sr"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 20px',
                          borderTop: idx > 0 ? '1px solid #EDEBE5' : 'none',
                          textDecoration: 'none',
                          background: 'transparent',
                          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                          borderLeft: `4px solid ${accentColor}`,
                        }}
                      >
                        {/* Icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 13, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isProject      ? <FolderKanban size={18} color="var(--success)" />
                          : isAppointment ? <Clock        size={18} color="var(--accent)" />
                          :                 <FileText     size={18} color="var(--warning)" />}
                        </div>
                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.title}
                            {event.clientName && <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}> &middot; {event.clientName}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={11} />
                              {isAppointment && event.time
                                ? `${formatDate(event.start)} ${event.time.slice(0, 5)}`
                                : `${event.start ? formatDate(event.start) : '?'}${event.end && event.end.getTime() !== event.start?.getTime() ? ` – ${formatDate(event.end)}` : ''}`}
                            </span>
                            <span style={{ color: accentColor }}>
                              {isProject ? t('project') : isAppointment ? t('appointment') : (QUOTE_STATUSES.find(s => s.id === event.status)?.label || t('quote'))}
                            </span>
                          </div>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>

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
    </div>
  );
}
