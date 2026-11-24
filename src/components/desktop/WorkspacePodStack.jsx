'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Lock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

function PodHeader({ ws, collapsed, onClick, extra }) {
  const isNotActivated = ws.status === 'not_activated';
  const isFrozen = ws.status === 'frozen';

  return (
    <div
      role={collapsed ? 'button' : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onClick={collapsed ? onClick : undefined}
      onKeyDown={collapsed ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={{
        background: ws.bg,
        padding: '20px 28px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: collapsed ? 'pointer' : 'default',
        opacity: (collapsed && isNotActivated) ? 0.55 : 1,
      }}
    >
      {/* Glow circle — matches dk-mh decoration */}
      <span style={{
        position: 'absolute', right: -90, top: -150,
        width: 340, height: 340, borderRadius: 170,
        background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
      }} />

      {/* Dot */}
      <span style={{ position: 'relative', width: 14, height: 14, borderRadius: 7, background: ws.dot, flexShrink: 0 }}>
        {(isNotActivated || isFrozen) && (
          <Lock
            size={9}
            style={{ position: 'absolute', top: -3, right: -3, color: '#fff', background: isNotActivated ? '#B45309' : '#B71C1C', borderRadius: 3, padding: 1 }}
          />
        )}
      </span>

      {/* Workspace name */}
      <span style={{
        position: 'relative', flex: 1,
        color: ws.fg,
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {ws.name}
      </span>

      {extra && !collapsed && (
        <span style={{ position: 'relative', flexShrink: 0 }}>{extra}</span>
      )}
      {collapsed && (
        <ChevronRight size={22} color="rgba(255,255,255,0.65)" aria-hidden="true" style={{ position: 'relative', flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function WorkspacePodStack({ children, localOnly = false, headerExtra }) {
  const t = useTranslations('sidebar');
  const { collectives, activeCollectiveId, setActiveContext, contextSwitching } = useApp();
  const [localOpenId, setLocalOpenId] = useState(null);

  const openId    = localOnly ? localOpenId : activeCollectiveId;
  const handleOpen = localOnly ? setLocalOpenId : setActiveContext;

  const workspaces = [
    {
      id: null,
      name: t('personal'),
      bg: PERSONAL_COLOR.bg,
      dot: '#2A2F3A',
      fg: PERSONAL_COLOR.fg,
      status: 'active',
    },
    ...(collectives || []).map(c => {
      const colors = podColor(c.collective_id);
      return {
        id: c.collective_id,
        name: c.name,
        bg: colors.deep,
        dot: colors.bg,
        fg: colors.fg,
        status: c.status,
        role: c.role,
      };
    }),
  ];

  const content = typeof children === 'function' ? children(openId) : children;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {workspaces.map(ws => {
        const isOpen = ws.id === openId;

        if (isOpen) {
          return (
            <div key={String(ws.id)} style={{ borderRadius: 24, overflow: 'hidden' }}>
              <PodHeader ws={ws} collapsed={false} extra={headerExtra} />
              <div style={{
                background: '#fff', color: '#0E1116',
                display: 'flex', flexDirection: 'column', gap: 16,
                padding: '20px 28px 28px',
              }}>
                {!localOnly && contextSwitching
                  ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                      <div className="dk-ws-spinner-dark" />
                    </div>
                  )
                  : content
                }
              </div>
            </div>
          );
        }

        return (
          <div
            key={String(ws.id)}
            style={{ borderRadius: 24, overflow: 'hidden' }}
          >
            <PodHeader ws={ws} collapsed onClick={() => handleOpen(ws.id)} />
          </div>
        );
      })}
    </div>
  );
}
