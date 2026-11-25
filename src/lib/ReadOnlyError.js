/**
 * Thrown by action functions when the API returns { read_only: true }.
 * Detail pages catch this and show UpgradeModal instead of an alert.
 */
export class ReadOnlyError extends Error {
  constructor() {
    super('READ_ONLY');
    this.code = 'READ_ONLY';
  }
}

/**
 * Drop-in helper for action files:
 *   const data = await res.json();
 *   throwOnError(res, data, 'Hiba a módosításkor');
 */
export function throwOnError(res, data, fallback) {
  if (!res.ok) {
    if (data?.read_only) throw new ReadOnlyError();
    throw new Error(data?.error || fallback);
  }
}
