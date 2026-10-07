export default function NaploLayout({ children }) {
  return (
    <>
      {/* Zero out sidebar width + mobile header height before hydration so there's no layout flash */}
      <style>{`
        :root {
          --sidebar-w: 0px !important;
          --mobile-header-h: 0px !important;
        }
        .app-main {
          margin-left: 0 !important;
          padding-top: 0 !important;
        }
      `}</style>
      {children}
    </>
  );
}
