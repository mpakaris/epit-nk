'use client';

/**
 * PodList — reusable workspace pod-stack for list pages (Surveys, Offers, Projects).
 *
 * Renders one collapsible pod section per workspace. Each pod has:
 *   - A 64 px colored strip (workspace name, role, member avatars, document count)
 *   - An expandable dark body with a standard title bar + caller-supplied content
 *
 * Props:
 *   workspaces   — [{ id, isPersonal, name, sub, count, canCreate?, members? }]
 *   activeId     — id of the currently expanded workspace
 *   onActivate   — (id) => void  — called when an inactive strip is tapped
 *   moduleLabel  — string shown as the page heading above the pods
 *   onBack       — () => void — tap on the page heading arrow (usually → dashboard)
 *   renderBody   — (ws, colors) => ReactNode — module-specific content
 */

import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import { useTranslations } from 'next-intl';

export default function PodList({
  workspaces,
  activeId,
  onActivate,
  moduleLabel,
  onBack,
  renderBody,
  loadingId,
}) {
  const t = useTranslations('mobilePods');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Module heading with back arrow — the only navigation anchor on the page */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 0, padding: '0 0 4px 2px', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--m-ink, #0E1116)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        <h1 style={{
          margin: 0,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
          color: 'var(--m-ink, #0E1116)',
        }}>
          {moduleLabel}
        </h1>
      </button>

      {workspaces.map(ws => {
        const isActive = ws.id === activeId;
        const colors  = ws.isPersonal ? PERSONAL_COLOR : podColor(ws.id);
        const { bg, deep, fg, soft, glass, glow } = colors;
        const memberInitials = (ws.members || [])
          .slice(0, 3)
          .map(m => (m.display_name || m.email || '?').slice(0, 2).toUpperCase());

        return (
          <section
            key={ws.id}
            style={{
              flexShrink: 0, borderRadius: 28, overflow: 'hidden',
              background: deep, color: '#fff',
              boxShadow: '0 24px 40px -24px rgba(14,17,22,0.5)',
            }}
          >
            {/* ── Pod strip ───────────────────────────────────────────── */}
            <div style={{ position: 'relative', height: 64, overflow: 'hidden', background: bg, color: fg }}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', right: -90, top: -130,
                  width: 280, height: 280, borderRadius: 140,
                  background: glow, pointerEvents: 'none',
                }}
              />
              <button
                onClick={() => !isActive && onActivate(ws.id)}
                aria-label={`${ws.name} ${t('open')}`}
                aria-pressed={isActive}
                style={{
                  position: 'relative', width: '100%', height: 64,
                  boxSizing: 'border-box', padding: '0 16px 0 14px',
                  border: 0, background: 'transparent', color: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left', cursor: isActive ? 'default' : 'pointer',
                }}
              >
                {/* Workspace icon */}
                <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 21, background: glass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ws.isPersonal ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/>
                    </svg>
                  )}
                </span>

                {/* Name + sub-label */}
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ws.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: soft }}>{ws.sub}</span>
                </span>

                {/* Member avatars + document count */}
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  {memberInitials.map((ini, idx) => (
                    <span key={idx} style={{
                      width: 30, height: 30, marginLeft: idx === 0 ? 0 : -9,
                      borderRadius: 15, background: '#fff', color: 'var(--m-ink)',
                      border: `2px solid ${bg}`, boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {ini}
                    </span>
                  ))}
                </span>
              </button>
            </div>

            {/* ── Expanded body ────────────────────────────────────────── */}
            {isActive && (
              <div style={{ boxSizing: 'border-box', padding: '18px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {loadingId === ws.id ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.4" strokeLinecap="round" aria-label="Betöltés" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  </div>
                ) : renderBody(ws, colors)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
