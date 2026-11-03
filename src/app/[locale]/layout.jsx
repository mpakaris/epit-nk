import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
import LoadingGate from '@/components/LoadingGate';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoadingGate>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            {children}
          </main>
        </div>
      </LoadingGate>
    </NextIntlClientProvider>
  );
}
