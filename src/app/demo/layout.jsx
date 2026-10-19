'use client';

import React, { useEffect } from 'react';
import { DemoProvider } from '@/context/DemoContext';
import DemoBanner from '@/components/demo/DemoBanner';
import Sidebar from '@/components/Sidebar';

const BANNER_H = 40; // px — matches DemoBanner's rendered height

function DemoShell({ children }) {
  // Always show the workspace tooltip fresh each demo session
  useEffect(() => {
    sessionStorage.removeItem('ws_tooltip_dismissed');
  }, []);

  return (
    // Fixed overlay covers the real (unauthenticated) app layout entirely
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-base)', zIndex: 500,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/*
        Inject CSS to push the Sidebar down by the banner height.
        The Sidebar is position:fixed z-index:40; DemoBanner is z-index:50
        so the banner always sits on top of the sidebar strip.
      */}
      <style>{`
        .demo-mode .app-sidebar {
          top: ${BANNER_H}px !important;
          height: calc(100vh - ${BANNER_H}px) !important;
        }
        .demo-mode .app-main {
          min-height: unset !important;
          height: 100%;
          overflow-y: auto;
        }
      `}</style>

      {/* Banner — z-index: 50 sits above the sidebar's z-index: 40 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 50 }}>
        <DemoBanner />
      </div>

      {/* App shell — same structure as real app */}
      <div className="app-layout demo-mode" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DemoLayout({ children }) {
  return (
    <DemoProvider>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
