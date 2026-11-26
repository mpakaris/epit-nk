import { cookies } from 'next/headers';
import { getMessages } from 'next-intl/server';
import { detectMobile } from '@/lib/detectMobile';
import DemoClientLayout from './DemoClientLayout';

export default async function DemoLayout({ children }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'hu';
  const [messages, isMobile] = await Promise.all([
    getMessages({ locale }),
    detectMobile(),
  ]);

  return (
    <DemoClientLayout locale={locale} messages={messages} isMobile={isMobile}>
      {children}
    </DemoClientLayout>
  );
}
