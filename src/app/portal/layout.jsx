'use client';
import { useEffect } from 'react';

export default function PortalLayout({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', '0px');
    root.style.setProperty('--mobile-header-h', '0px');
    document.body.style.background = '#f1f5f9';
    const main = document.querySelector('.app-main');
    if (main) { main.style.paddingTop = '0'; main.style.marginLeft = '0'; }
    return () => {
      root.style.removeProperty('--sidebar-w');
      root.style.removeProperty('--mobile-header-h');
      document.body.style.background = '';
      if (main) { main.style.paddingTop = ''; main.style.marginLeft = ''; }
    };
  }, []);
  return children;
}
