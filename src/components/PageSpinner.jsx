// No 'use client' — works as a Suspense fallback in server components
// and as an early return in client components.
export default function PageSpinner() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base, #f8fafc)',
      zIndex: 9999,
    }}>
      <div className="global-spinner" />
    </div>
  );
}
