import { toSlug } from '@/lib/utils';

export function extractSocialHandle(value, platform) {
  if (!value) return '';
  let v = value.trim();
  // If someone pastes a full URL, extract the handle
  if (v.includes('tiktok.com/')) v = v.split('tiktok.com/').pop().split('/')[0];
  if (v.includes('instagram.com/')) v = v.split('instagram.com/').pop().split('/')[0];
  // Normalize: always store with leading @
  return '@' + v.replace(/^@+/, '');
}

export function formatHunPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let num = digits;
  if (num.startsWith('36')) num = num.slice(2);
  else if (num.startsWith('06')) num = num.slice(2);
  else if (num.startsWith('0')) num = num.slice(1);
  num = num.slice(0, 9);
  let out = '+36';
  if (num.length >= 1) out += ' ' + num.slice(0, 2);
  if (num.length >= 3) out += ' ' + num.slice(2, 5);
  if (num.length >= 6) out += ' ' + num.slice(5, 7);
  if (num.length >= 8) out += ' ' + num.slice(7, 9);
  return out;
}

export function buildSuggestions(lastName, firstName, tradeSlug) {
  const l = toSlug(lastName.trim());
  const f = toSlug(firstName.trim());
  if (!l && !f) return [];

  const results = [];
  if (l && f) {
    results.push(`${l}-${f}`);
    if (tradeSlug) results.push(`${l}-${f}-${tradeSlug}`);
    results.push(`${f}-${l}`);
    if (tradeSlug) results.push(`${f}-${l}-${tradeSlug}`);
  } else {
    const s = l || f;
    results.push(s);
    if (tradeSlug) results.push(`${s}-${tradeSlug}`);
  }
  return [...new Set(results)].filter(s => s.length >= 3);
}

// Pre-fill: Hungarian display names are typically "Vezetéknév Keresztnév"
export function splitDisplayName(displayName) {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
  return { lastName: parts[0] || '', firstName: '' };
}

export function normalisePricingContent(content) {
  const raw = content.items || [];
  if (!raw.length || raw[0].entries !== undefined) return content;
  return {
    ...content,
    cols: 2,
    items: raw.map(old => ({
      title: old.service || '',
      vat: 'gross',
      entries: old.price ? [{ label: old.note || '', price: old.price, unit: old.unit || 'm²' }] : [],
    })),
  };
}

export const PRICE_UNITS = ['m²', 'm³', 'm', 'fm', 'db', 'óra', 'nap', 'kg', 't', 'átalány'];
