'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import DesktopSidebar from './DesktopSidebar';
import '@/styles/desktop.css';
import { Menu, X } from 'lucide-react';

export default function DesktopShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Close overlay whenever the user navigates
  useEffect(() => { setNavOpen(false); }, [pathname]);

  return (
    <div className={`dk-root${navOpen ? ' dk-nav-open' : ''}`}>
      <DesktopSidebar />

      <main className="dk-mn">
        {children}
      </main>

      {/* Hamburger — sibling of dk-mn, positioned absolute within dk-root.
          Visually lands inside the dk-mh header band. Never inside a scroll
          container, so it can't be scrolled over by page content. */}
      <button
        className="dk-nav-toggle"
        onClick={() => setNavOpen(o => !o)}
        aria-label={navOpen ? 'Navigáció bezárása' : 'Navigáció megnyitása'}
      >
        {navOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Scrim — closes overlay when clicked */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 199 }}
        />
      )}
    </div>
  );
}
