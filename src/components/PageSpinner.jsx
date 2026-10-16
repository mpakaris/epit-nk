// No 'use client' — works as a Suspense fallback in server components
// and as an early return in client components.
export default function PageSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
    }}>
      <div className="global-spinner" />
    </div>
  );
}
