'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import UpgradeModal from '@/components/UpgradeModal';

const Ctx = createContext({ openUpgrade: () => {} });

/**
 * Wrap any detail page (or subtree) with this provider.
 * Any nested component can call openUpgrade() without prop drilling.
 * The UpgradeModal is portalled to document.body so it is never clipped
 * by overflow:hidden or stacking contexts in the page tree.
 */
export function ReadOnlyUpgradeProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Ctx.Provider value={{ openUpgrade: () => setOpen(true) }}>
      {children}
      {mounted && createPortal(
        <UpgradeModal isOpen={open} onClose={() => setOpen(false)} mode="readOnly" />,
        document.body
      )}
    </Ctx.Provider>
  );
}

/** Returns { openUpgrade } — call it to show the upgrade modal. */
export function useReadOnlyUpgradeContext() {
  return useContext(Ctx);
}
