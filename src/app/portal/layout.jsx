export default function PortalLayout({ children }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#f1f5f9',
      zIndex: 500,
      overflowY: 'auto',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {children}
    </div>
  );
}
