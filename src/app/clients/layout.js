export default function ClientsLayout({ children }) {
  return (
    <>
      <style>{`
        :root { --sidebar-w: 0px !important; --mobile-header-h: 0px !important; }
        .app-main { margin-left: 0 !important; padding-top: 0 !important; }
      `}</style>
      {children}
    </>
  );
}
