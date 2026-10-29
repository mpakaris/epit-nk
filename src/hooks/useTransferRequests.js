'use client';

import { useState, useEffect } from 'react';

/**
 * Manages outgoing transfer request state for list pages.
 * Fetches on mount (when dataReady), exposes addTransfer and retractTransfer.
 * retractTransfer throws on API error so callers can surface it their own way.
 */
export function useTransferRequests({ dataReady, isDemoMode }) {
  const [outgoingTransfers, setOutgoingTransfers] = useState([]);

  useEffect(() => {
    if (!dataReady || isDemoMode) return;
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOutgoingTransfers(d.requests || []))
      .catch(() => {});
  }, [dataReady, isDemoMode]);

  const addTransfer = (request) =>
    setOutgoingTransfers(prev => [...prev, request]);

  const retractTransfer = async (requestId) => {
    const res = await fetch(`/api/transfer-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retract' }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Hiba történt. Kérjük, próbáld újra.');
    }
    setOutgoingTransfers(prev => prev.filter(r => r.id !== requestId));
  };

  return { outgoingTransfers, addTransfer, retractTransfer };
}
