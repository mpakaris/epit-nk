'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export default function WeekCalendar({ events = [], onDayPress }) {
  const t = useTranslations('mobilePods');
  const tCal = useTranslations('calendar');
  const locale = useLocale();
  const DAY_ABBR = tCal.raw('days'); // Mon-first: index 0=Mon…6=Sun
  const [selectedOffset, setSelectedOffset] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build Mon-Sun week containing today
  const monday = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay(); // 0=Sun
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
  }, [today]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }), [monday]);

  const selectedDate = days[selectedOffset];
  const selectedEvents = events.filter(ev => {
    const evDate = new Date(ev.date);
    evDate.setHours(0, 0, 0, 0);
    return evDate.getTime() === selectedDate.getTime();
  });

  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const weekRange = `${monthFmt.format(days[0])} – ${monthFmt.format(days[6])}`;

  const firstEvent = selectedEvents[0];
  const moreCount = selectedEvents.length - 1;

  return (
    <section
      aria-label={t('weekCalendar')}
      style={{ boxSizing: 'border-box', padding: '12px 10px 10px', borderRadius: 28, background: 'var(--m-card)', display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 8px', fontSize: 13 }}>
        <span style={{ fontWeight: 700 }}>{t('thisWeek')}</span>
        <span style={{ fontWeight: 600, color: '#5A5F68' }}>{weekRange} · {t('everyWorkspace')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const isSel = i === selectedOffset;
          const dayEvents = events.filter(ev => {
            const evDate = new Date(ev.date);
            evDate.setHours(0, 0, 0, 0);
            return evDate.getTime() === day.getTime();
          });
          return (
            <button
              key={i}
              onClick={() => setSelectedOffset(i)}
              aria-label={day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric' })}
              aria-pressed={isSel}
              style={{ minHeight: 64, padding: '6px 0 4px', border: 0, borderRadius: 16, background: isSel ? '#F0EEE8' : 'transparent', color: 'var(--m-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68' }}>{DAY_ABBR[(day.getDay() + 6) % 7]}</span>
              <span style={{ width: 30, height: 30, borderRadius: 15, background: isToday ? 'var(--m-ink)' : 'transparent', color: isToday ? '#fff' : 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                {day.getDate()}
              </span>
              <span style={{ height: 6, display: 'flex', gap: 2 }}>
                {dayEvents.slice(0, 3).map((ev, di) => (
                  <span key={di} style={{ width: 6, height: 6, borderRadius: 3, background: ev.dot || '#5A5F68' }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onDayPress?.(selectedDate, selectedEvents)}
        style={{ minHeight: 46, boxSizing: 'border-box', padding: '0 12px', border: 0, borderRadius: 16, background: '#F4F2EC', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 5, background: firstEvent?.dot || '#CFCBC0' }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {firstEvent ? `${firstEvent.time ? firstEvent.time + ' ' : ''}${firstEvent.title}` : t('noEvents')}
          </span>
        </span>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#5A5F68' }}>
          {moreCount > 0 && `+${moreCount}`}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </span>
      </button>
    </section>
  );
}
