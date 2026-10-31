'use client';

import { useLayoutEffect, useRef } from 'react';

/** Locks body scroll while `locked` is true; restores scroll position on unlock. */
export function useScrollLock(locked) {
  const scrollY = useRef(0);
  const didLock = useRef(false);

  useLayoutEffect(() => {
    if (locked) {
      scrollY.current = window.scrollY;
      didLock.current = true;
      document.body.style.overflow   = 'hidden';
      document.body.style.position   = 'fixed';
      document.body.style.width      = '100%';
      document.body.style.top        = `-${scrollY.current}px`;
    } else if (didLock.current) {
      didLock.current = false;
      document.body.style.overflow   = '';
      document.body.style.position   = '';
      document.body.style.width      = '';
      document.body.style.top        = '';
      window.scrollTo(0, scrollY.current);
    }
    return () => {
      if (didLock.current) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width    = '';
        document.body.style.top      = '';
        window.scrollTo(0, scrollY.current);
        didLock.current = false;
      }
    };
  }, [locked]);
}
