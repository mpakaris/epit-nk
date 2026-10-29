'use client';

import { useEffect } from 'react';

/** Locks body scroll while `locked` is true; restores on unmount or when lock releases. */
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}
