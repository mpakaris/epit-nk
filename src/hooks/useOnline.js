'use client';
import { useState, useEffect } from 'react';

export default function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator !== 'undefined') setOnline(navigator.onLine);
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
