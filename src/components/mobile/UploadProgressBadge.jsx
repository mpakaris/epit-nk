'use client';

import React, { useEffect, useState } from 'react';

/**
 * Small inline badge showing upload queue state.
 * Shows nothing when everything is done with no errors.
 *
 * Props: { pending, uploading, done, error, onRetry }
 */
export default function UploadProgressBadge({ pending, uploading, done, error, onRetry }) {
  const [showDone, setShowDone] = useState(false);
  const active = pending + uploading;
  const total  = active + done + error;

  useEffect(() => {
    if (active === 0 && done > 0 && error === 0) {
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), 2000);
      return () => clearTimeout(t);
    } else {
      setShowDone(false);
    }
  }, [active, done, error]);

  if (total === 0 || (active === 0 && error === 0 && !showDone)) return null;

  const pillBase = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, lineHeight: 1.3,
    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
  };

  if (error > 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...pillBase, background: '#fee2e2', color: '#b91c1c' }}>
          ⚠ {error} hiba
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Újra
          </button>
        )}
      </span>
    );
  }

  if (showDone) {
    return <span style={{ ...pillBase, background: '#dcfce7', color: '#16a34a' }}>✓ Feltöltve</span>;
  }

  return (
    <span style={{ ...pillBase, background: '#f1f5f9', color: '#475569' }}>
      ⬆ {uploading}/{active + done}
    </span>
  );
}
