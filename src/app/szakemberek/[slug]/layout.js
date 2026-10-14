'use client';

import { useEffect } from 'react';

export default function SzakemberLayout({ children }) {
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', '0px');
    const main = document.querySelector('.app-main');
    const layout = document.querySelector('.app-layout');
    if (main) { main.style.paddingTop = '0'; main.style.background = 'transparent'; }
    if (layout) layout.style.background = 'transparent';
    return () => {
      document.documentElement.style.removeProperty('--sidebar-w');
      if (main) { main.style.paddingTop = ''; main.style.background = ''; }
      if (layout) layout.style.background = '';
    };
  }, []);

  return children;
}
