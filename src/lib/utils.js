/** Strips Hungarian diacritics and lowercases — for accent-insensitive search. */
export const normalizeHU = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Converts a string to a URL-safe slug (handles Hungarian characters). */
export function toSlug(str) {
  return (str || '').toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Short date: "jún. 15." */
export const formatDateShort = (d) =>
  d ? new Date(d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) : null;

/** Medium date: "2024. jún. 15." */
export const formatDateMedium = (d) =>
  d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
