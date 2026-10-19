import { Hammer } from 'lucide-react';

export default function LegalLayout({ title, lastUpdated, children }) {
  const yr = new Date().getFullYear();
  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
      background: '#f8fafc', zIndex: 9999,
      fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 1.25rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Hammer size={15} color="#93c5fd" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Epitek</span>
          </a>
          <a href="/" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textDecoration: 'none', whiteSpace: 'nowrap' }}>← Főoldal</a>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 0.35rem', lineHeight: 1.2 }}>
          {title}
        </h1>
        {lastUpdated && (
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 2.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
            Utolsó frissítés: {lastUpdated}
          </p>
        )}
        <div style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.85 }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '1.25rem 1.5rem' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>© {yr} MPPM Consulting Kft. – Epitek</span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="/impressum"   target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>Impresszum</a>
            <a href="/adatkezeles" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>Adatkezelés</a>
            <a href="/aszf"        target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>ÁSZF</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
