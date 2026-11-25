'use client';

import { ReadOnlyError } from '@/lib/ReadOnlyError';
import { useReadOnlyUpgradeContext } from '@/context/ReadOnlyUpgradeContext';

/**
 * Used inside detail pages (and their sub-components) to intercept read-only
 * errors and show the UpgradeModal.
 *
 * Requires the page to be wrapped in <ReadOnlyUpgradeProvider> (which renders
 * the modal and owns its open state).
 *
 * Usage — in any component inside the provider:
 *   const { handleError, guardReadOnly } = useReadOnlyUpgrade();
 *
 *   // In a catch block from an action function:
 *   catch (err) {
 *     if (handleError(err)) return;
 *     setError(err.message);
 *   }
 *
 *   // Before making a mutation (UI-side guard):
 *   if (guardReadOnly(isReadOnly)) return;
 *
 *   // With a direct fetch() call:
 *   if (!res.ok) {
 *     const { absorbed, error } = await handleResponse(res);
 *     if (absorbed) return;
 *     setAlert(error || 'Hiba történt.');
 *     return;
 *   }
 */
export function useReadOnlyUpgrade() {
  const { openUpgrade } = useReadOnlyUpgradeContext();

  function handleError(err) {
    if (err instanceof ReadOnlyError || err?.code === 'READ_ONLY') {
      openUpgrade();
      return true;
    }
    return false;
  }

  async function handleResponse(res) {
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (data?.read_only) { openUpgrade(); return { absorbed: true, error: null }; }
    return { absorbed: false, error: data?.error || null };
  }

  function guardReadOnly(isReadOnly) {
    if (isReadOnly) { openUpgrade(); return true; }
    return false;
  }

  return { handleError, handleResponse, guardReadOnly, openUpgrade };
}
