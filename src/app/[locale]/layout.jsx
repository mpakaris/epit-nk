import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
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
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        )}
      </LoadingGate>
    </NextIntlClientProvider>
  );
}
