'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

const STRIP_H  = 64;   // height of inactive pod header strip
const STRIP_GAP = 8;   // gap between pods in the stack
const STACK_H  = 720;  // total container height (reference: 390×844)

function docIcon(type) {
  if (type === 'survey') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>
    </svg>
  );
  if (type === 'quote') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18"/>
    </svg>
  );
}

function DocRow({ doc, chipBg, chipFg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', minHeight: 72, boxSizing: 'border-box',
        padding: '10px 14px 10px 12px', borderRadius: 18,
        background: 'var(--m-card)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)',
        border: 0, color: 'var(--m-ink)', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
      }}
    >
      <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: chipBg, color: chipFg, boxShadow: 'inset 0 0 0 1px rgba(14,17,22,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {docIcon(doc.type)}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</span>
        <span style={{ fontSize: 13, color: '#4A4F57', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.sub}</span>
      </span>
      <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        {doc.amount && <span style={{ fontSize: 13, fontWeight: 700 }}>{doc.amount}</span>}
        <span style={{ padding: '2px 8px', borderRadius: 10, background: '#F0F0F2', color: '#2B3038', fontSize: 12, fontWeight: 700 }}>{doc.status}</span>
      </span>
    </button>
  );
}

export default function PodStack({ workspaces, activeId, onActivate, onCreateIn, userCurrency }) {
  const t = useTranslations('mobilePods');
  const router = useRouter();
  const { isDemoMode } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [view, setView] = useState('home'); // 'home' | 'cat' | 'list'
  const [cat, setCat] = useState(null);     // 'survey' | 'quote' | 'project'

  // Freeze each pod's last-known doc count so it doesn't drop to 0 when
  // AppContext re-scopes to a different workspace.
  const countCache = useRef({});
  useEffect(() => {
    const ws = workspaces.find(w => w.id === activeId);
    if (!ws) return;
    const total = (ws.surveys?.length || 0) + (ws.quotes?.length || 0) + (ws.projects?.length || 0);
    if (total > 0) countCache.current[activeId] = total;
  }, [activeId, workspaces]);

  const order = workspaces.map(w => w.id);
  const ai = order.indexOf(activeId);
  const before = ai;
  const after = order.length - 1 - ai;
  const activeH = STACK_H - (before + after) * (STRIP_H + STRIP_GAP);

  const CAT_META = {
    survey:  { label: t('surveys'),  pluralLabel: t('surveys'),  newLabel: t('newSurvey'),  route: 'felmeres' },
    quote:   { label: t('quotes'),   pluralLabel: t('quotes'),   newLabel: t('newQuote'),   route: 'ajanlatok' },
    project: { label: t('projects'), pluralLabel: t('projects'), newLabel: t('newProject'), route: 'projektek' },
  };

  const fmtDoc = (item, type, wsId, clients) => {
    const client = (clients || []).find(c => c.id === item.client_id);
    const title = item.title || item.name || '—';
    const sub = client?.name ? `${client.name}` : item.location || '';
    let status = '';
    if (type === 'survey') status = item.status === 'done' ? t('statusDone') : item.status === 'reopened' ? t('statusReopened') : t('statusActive');
    else if (type === 'quote') status = t(`quoteStatus.${item.status || 'draft'}`);
    else status = item.done_at || item.closed_at ? t('statusDone') : t('statusActive');
    const amount = item.total_amount ? formatMoney(item.total_amount, userCurrency) : '';
    const href = p(`/${CAT_META[type].route}/${item.id}`);
    return { title, sub, status, amount, type, href };
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, height: STACK_H }}>
      {workspaces.map((ws, i) => {
        const isActive = ws.id === activeId;
        const colors = ws.isPersonal ? PERSONAL_COLOR : podColor(ws.id);
        const { bg, deep, fg, soft, glass, glow } = colors;

        let top, height;
        if (i < ai)       { top = i * (STRIP_H + STRIP_GAP); height = STRIP_H; }
        else if (isActive) { top = before * (STRIP_H + STRIP_GAP); height = activeH; }
        else               { top = before * (STRIP_H + STRIP_GAP) + activeH + STRIP_GAP + (i - ai - 1) * (STRIP_H + STRIP_GAP); height = STRIP_H; }

        // Build doc list for active pod body
        const surveys  = (ws.surveys  || []).slice(0, 10).map(d => fmtDoc(d, 'survey',  ws.id, ws.clients));
        const quotes   = (ws.quotes   || []).slice(0, 10).map(d => fmtDoc(d, 'quote',   ws.id, ws.clients));
        const projects = (ws.projects || []).slice(0, 10).map(d => fmtDoc(d, 'project', ws.id, ws.clients));
        const allDocs  = [...surveys, ...quotes, ...projects].sort((a, b) => {
          const ia = (ws.surveys || []).concat(ws.quotes || [], ws.projects || []).findIndex(x => (x.title || x.name) === a.title);
          return 0;
        });
        const recentDocs = allDocs.slice(0, 3);

        let rows = recentDocs, rowsHeading = t('continueWhere'), title = '', showAll = false, showAllCount = 0, backLabel = '', newLabel = '', back = () => {};
        if (view !== 'home' && isActive) {
          const catDocs = cat === 'survey' ? surveys : cat === 'quote' ? quotes : projects;
          newLabel = cat ? CAT_META[cat].newLabel : '';
          backLabel = cat ? CAT_META[cat].pluralLabel : ws.name;
          if (view === 'cat') {
            rows = catDocs.slice(0, 3);
            rowsHeading = t('recent', { type: CAT_META[cat]?.pluralLabel || '' });
            title = CAT_META[cat]?.pluralLabel || '';
            showAll = true;
            showAllCount = catDocs.length;
            back = () => setView('home');
          } else {
            rows = catDocs;
            rowsHeading = t('mostRecent');
            title = `${t('all', { type: CAT_META[cat]?.label || '' })} (${catDocs.length})`;
            back = () => setView('cat');
          }
        }

        const nActive = (ws.projects || []).filter(proj => !proj.done_at && !proj.closed_at).length;
        const totalRevenue = (ws.quotes || []).filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.total_amount || 0), 0);
        const memberInitials = (ws.members || []).slice(0, 3).map(m => (m.display_name || m.email || '?').slice(0, 2).toUpperCase());

        return (
          <section
            key={ws.id}
            style={{
              position: 'absolute', left: 0, right: 0, boxSizing: 'border-box',
              overflow: 'hidden', borderRadius: 28,
              background: deep, color: '#FFFFFF',
              zIndex: isActive ? 2 : 1,
              top, height,
              boxShadow: '0 24px 40px -24px rgba(14,17,22,0.5)',
              transition: 'top .5s cubic-bezier(.2,.8,.2,1), height .5s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            {/* Pod strip / header */}
            <div style={{ position: 'relative', height: 64, overflow: 'hidden', background: bg, color: fg }}>
              {/* Glow circle */}
              <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -130, width: 280, height: 280, borderRadius: 140, background: glow, pointerEvents: 'none' }} />
              <button
                onClick={() => {
                  if (!isActive) { onActivate(ws.id); setView('home'); setCat(null); }
                }}
                aria-label={`${ws.name} ${t('open')}`}
                aria-pressed={isActive}
                style={{ position: 'relative', width: '100%', height: 64, boxSizing: 'border-box', padding: '0 16px 0 14px', border: 0, background: 'transparent', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: isActive ? 'default' : 'pointer' }}
              >
                <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 21, background: glass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ws.isPersonal ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: soft }}>{ws.sub}</span>
                </span>
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  {memberInitials.map((ini, idx) => (
                    <span key={idx} style={{ width: 30, height: 30, marginLeft: -9, borderRadius: 15, background: '#FFFFFF', color: 'var(--m-ink)', border: `2px solid ${bg}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{ini}</span>
                  ))}
                  {!isActive && (
                    <span style={{ marginLeft: memberInitials.length > 0 ? 8 : 0, minWidth: 26, height: 26, padding: '0 8px', boxSizing: 'border-box', borderRadius: 13, background: '#FFFFFF', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {countCache.current[ws.id] ?? (surveys.length + quotes.length + projects.length)}
                    </span>
                  )}
                </span>
              </button>
            </div>

            {/* Pod body (only shown for active pod) */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 64, bottom: 0,
              boxSizing: 'border-box', overflowY: 'auto',
              background: deep, padding: '20px 16px 32px',
              display: 'flex', flexDirection: 'column', gap: 20,
              pointerEvents: isActive ? 'auto' : 'none',
              opacity: isActive ? 1 : 0,
              transition: `opacity .25s ${isActive ? '.28s' : '0s'}`,
            }}>
              {/* Home level */}
              {view === 'home' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px', fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{nActive} {t('activeProjects')}</span>
                    {totalRevenue > 0 && <span style={{ fontWeight: 700 }}>{formatMoney(totalRevenue, userCurrency)} {t('inProgress')}</span>}
                  </div>

                  {/* Category tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    {(['survey', 'quote', 'project']).map(type => {
                      const count = type === 'survey' ? surveys.length : type === 'quote' ? quotes.length : projects.length;
                      return (
                        <button
                          key={type}
                          onClick={() => { setCat(type); setView('cat'); }}
                          style={{ minHeight: 100, padding: '14px 8px', borderRadius: 22, background: 'var(--m-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)', border: 0, color: 'var(--m-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                        >
                          <span style={{ width: 42, height: 42, borderRadius: 14, background: '#F1F1F3', color: '#1A1D23', boxShadow: 'inset 0 0 0 1px rgba(14,17,22,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {docIcon(type)}
                          </span>
                          <span>{CAT_META[type].label}</span>
                          <span style={{ fontSize: 18, fontWeight: 800 }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Category / list level header */}
              {view !== 'home' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    onClick={back}
                    aria-label={`${t('backTo')}: ${backLabel}`}
                    style={{ minHeight: 44, padding: '0 14px 0 8px', borderRadius: 22, background: 'var(--m-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)', border: 0, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
                    {backLabel}
                  </button>
                  {ws.canCreate !== false && (
                    <button
                      onClick={() => onCreateIn?.(ws.id, cat)}
                      style={{ minHeight: 44, padding: '0 16px 0 12px', border: 0, borderRadius: 22, background: colors.bg, color: fg, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                      {newLabel}
                    </button>
                  )}
                </div>
              )}

              {/* Title for category view */}
              {view !== 'home' && title && (
                <h2 style={{ margin: '4px 0 0', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h2>
              )}

              {/* Document rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ padding: '0 4px 2px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>{rowsHeading}</span>
                {rows.map((doc, idx) => (
                  <DocRow
                    key={idx}
                    doc={doc}
                    chipBg="#F1F1F3"
                    chipFg="#1A1D23"
                    onClick={() => router.push(doc.href)}
                  />
                ))}
                {rows.length === 0 && (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('noDocuments')}</div>
                )}
              </div>

              {/* Show all button — navigates to the real list page */}
              {showAll && cat && (
                <button
                  onClick={() => router.push(p(`/${CAT_META[cat].route}`))}
                  style={{ width: '100%', minHeight: 52, border: 0, borderRadius: 26, background: colors.bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >
                  {t('showAll', { count: showAllCount })}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
