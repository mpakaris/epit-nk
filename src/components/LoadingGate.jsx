'use client';

import { useApp } from '@/context/AppContext';
import { usePathname } from 'next/navigation';

// Routes that are public — gate is skipped so server-rendered content shows immediately
// and unauthenticated users don't get stuck on an infinite spinner.
const PUBLIC_PREFIXES = ['/p/', '/clients/', '/naplo/', '/login', '/change-password'];

export default function LoadingGate({ children }) {
  const { loading, dataReady } = useApp();
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // Block render until BOTH the auth check (loading) and the data fetch (dataReady) are done.
  // Without checking dataReady, there is a brief window where loading=false but dataReady=false
  // and per-page guards would flash "Betöltés..." before the gate fires.
  if (!isPublic && (loading || !dataReady)) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        zIndex: 9999,
      }}>
        <div className="global-spinner" />
      </div>
    );
  }

  return children;
}
