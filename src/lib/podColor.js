/**
 * Maps a collective UUID to one of the curated mobile-pods workspace
 * colour palette entries. Uses the same hash as collectiveColor() so
 * the slot assignment is deterministic per collective.
 *
 * Returned object keys match the token names in .m-root (globals.css):
 *   bg    = pod strip background
 *   deep  = body / deep background
 *   fg    = text on bg
 *   soft  = muted text colour on bg
 *   glass = avatar circle background on bg
 *   glow  = decorative glow circle background
 *   plusBg / plusFg = dock "+" button colours
 */

const PALETTE = [
  // cobalt
  { bg: '#2F5BFF', deep: '#0E1840', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.88)', glass: 'rgba(255,255,255,0.17)', glow: 'rgba(255,255,255,0.10)', plusBg: '#2F5BFF', plusFg: '#FFFFFF' },
  // orange
  { bg: '#FF8A2B', deep: '#241409', fg: '#0E1116', soft: 'rgba(14,17,22,0.80)',    glass: 'rgba(14,17,22,0.10)',    glow: 'rgba(255,255,255,0.22)', plusBg: '#FF8A2B', plusFg: '#0E1116' },
  // teal (survey-ish, but as workspace — different deep)
  { bg: '#0A7F72', deep: '#06302C', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.80)', glass: 'rgba(255,255,255,0.15)', glow: 'rgba(255,255,255,0.08)', plusBg: '#0A7F72', plusFg: '#FFFFFF' },
  // rose
  { bg: '#E11D48', deep: '#3B0618', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.84)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)', plusBg: '#E11D48', plusFg: '#FFFFFF' },
  // violet
  { bg: '#7C3AED', deep: '#1C1038', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.86)', glass: 'rgba(255,255,255,0.14)', glow: 'rgba(255,255,255,0.09)', plusBg: '#7C3AED', plusFg: '#FFFFFF' },
];

export const PERSONAL_COLOR = {
  bg: '#15181E', deep: '#0D0F13', fg: '#FFFFFF', soft: 'rgba(255,255,255,0.76)',
  glass: 'rgba(255,255,255,0.09)', glow: 'rgba(255,255,255,0.05)',
  plusBg: '#FFFFFF', plusFg: '#15181E',
};

export function podColor(collectiveId = '') {
  let h = 0;
  for (let i = 0; i < collectiveId.length; i++) {
    h = Math.imul(31, h) + collectiveId.charCodeAt(i) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}
