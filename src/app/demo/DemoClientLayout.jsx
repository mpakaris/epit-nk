'use client';

import React, { useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { DemoProvider } from '@/context/DemoContext';
import DemoBanner from '@/components/demo/DemoBanner';
import DesktopShell from '@/components/desktop/DesktopShell';

function DemoShell({ isMobile, children }) {
  useEffect(() => {
    sessionStorage.removeItem('ws_tooltip_dismissed');
  }, []);

  return (
    <div className="demo-layout" style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* dk-root normally uses 100vh; shrink it to fill remaining space below the banner */}
      <style>{`.demo-layout .dk-root { height: 100% !important; }`}</style>

      <div style={{ flexShrink: 0, position: 'relative', zIndex: 50 }}>
        <DemoBanner />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isMobile ? (
          <div className="m-root" style={{ height: '100%', background: 'var(--m-canvas)', overflowY: 'auto' }}>
            {children}
          </div>
        ) : (
          <DesktopShell>{children}</DesktopShell>
        )}
      </div>
    </div>
  );
}

export default function DemoClientLayout({ locale, messages, isMobile, children }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DemoProvider>
        <DemoShell isMobile={isMobile}>{children}</DemoShell>
      </DemoProvider>
    </NextIntlClientProvider>
  );
}
