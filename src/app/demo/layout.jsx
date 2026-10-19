'use client';

import React from 'react';
import { DemoProvider } from '@/context/DemoContext';
import DemoBanner from '@/components/demo/DemoBanner';

export default function DemoLayout({ children }) {
  return (
    <DemoProvider>
      {/* Fixed overlay covers the real app layout (sidebar + margin-left) entirely */}
      <div style={{
        position: 'fixed', inset: 0, overflowY: 'auto',
        background: 'var(--bg-base)', zIndex: 500,
        display: 'flex', flexDirection: 'column',
      }}>
        <DemoBanner />
        <div className="app-main" style={{ marginLeft: 0 }}>
          {children}
        </div>
      </div>
    </DemoProvider>
  );
}
