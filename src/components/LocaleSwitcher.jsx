'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { routing } from '@/i18n/routing';

export default function LocaleSwitcher({ style }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '0.2rem', ...style }}>
      {routing.locales.map(loc => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          disabled={locale === loc}
          style={{
            background: locale === loc ? 'var(--primary)' : 'transparent',
            color: locale === loc ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${locale === loc ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.62rem',
            fontWeight: 800,
            padding: '0.18rem 0.38rem',
            cursor: locale === loc ? 'default' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.4,
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
