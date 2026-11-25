'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { Lock } from 'lucide-react';

export function WorkspaceNotActivatedBanner() {
  const t = useTranslations('collectives');
  const { activeCollectiveId } = useApp();
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24, background: '#FFF4CD',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={34} color="#B45309" />
      </div>
      <div>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {t('notActivatedBannerTitle')}
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 380 }}>
          {t('activateSubtitle')}
        </div>
      </div>
      <Link
        href={activeCollectiveId ? `/elofizetes?activate=${activeCollectiveId}` : '/elofizetes'}
        style={{
          height: 52, padding: '0 28px', border: 0, borderRadius: 26,
          background: '#fff', color: '#0E1116',
          fontSize: 15, fontWeight: 700, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        {t('notActivatedBannerBtn')}
      </Link>
    </div>
  );
}

export function WorkspaceFrozenBanner({ isOwner }) {
  const t = useTranslations('collectives');
  return (
    <div style={{
      borderRadius: 20, padding: '14px 18px',
      background: 'rgba(183,28,28,0.18)', border: '1px solid rgba(183,28,28,0.4)',
      display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexShrink: 0,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: 'rgba(183,28,28,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={20} color="#F87171" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#F87171', marginBottom: 2 }}>
          {t('frozenBannerTitle')}
        </div>
      </div>
      {isOwner && (
        <Link
          href="/elofizetes"
          style={{
            height: 38, padding: '0 16px', border: 0, borderRadius: 19,
            background: '#F87171', color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}
        >
          {t('frozenBannerBtn')}
        </Link>
      )}
    </div>
  );
}
