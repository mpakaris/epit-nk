import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import DesktopShell from '@/components/desktop/DesktopShell';
import LoadingGate from '@/components/LoadingGate';
import { detectMobile } from '@/lib/detectMobile';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const [messages, isMobile] = await Promise.all([
    getMessages({ locale }),
    detectMobile(),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoadingGate>
        {isMobile ? (
          <div className="m-root" style={{ minHeight: '100dvh', background: 'var(--m-canvas)' }}>
            {children}
          </div>
        ) : (
          <DesktopShell>
            {children}
          </DesktopShell>
        )}
      </LoadingGate>
    </NextIntlClientProvider>
  );
}
