import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
import LoadingGate from '@/components/LoadingGate';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
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
