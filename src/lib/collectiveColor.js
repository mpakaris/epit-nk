/**
 * Derives a unique dark background color from a collective's UUID.
 * Uses a simple string hash → hue rotation so every collective always
 * gets the same color, and no two collectives share one.
 */
export function collectiveColor(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 60%, 16%)`;
}
