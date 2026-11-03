/**
 * i18n consistency — verifies that hu.json, de.json, en.json
 * all contain exactly the same set of keys (nested paths).
 *
 * A failure here means a key was added to one file but not the others,
 * or was deleted from one file but not the others.
 * Fix: update all three JSON files to have the same keys.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, '../messages');

function loadJson(locale) {
  return JSON.parse(readFileSync(resolve(MESSAGES_DIR, `${locale}.json`), 'utf8'));
}

/** Recursively collect all dot-notation key paths from a nested object. */
function collectPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...collectPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths.sort();
}

const LOCALES = ['hu', 'de', 'en'];
const data    = Object.fromEntries(LOCALES.map(l => [l, loadJson(l)]));
const paths   = Object.fromEntries(LOCALES.map(l => [l, collectPaths(data[l])]));

describe('i18n JSON consistency', () => {
  for (const [localeA, localeB] of [['hu', 'de'], ['hu', 'en'], ['de', 'en']]) {
    it(`${localeA}.json and ${localeB}.json have identical key sets`, () => {
      const setA = new Set(paths[localeA]);
      const setB = new Set(paths[localeB]);

      const onlyInA = paths[localeA].filter(k => !setB.has(k));
      const onlyInB = paths[localeB].filter(k => !setA.has(k));

      if (onlyInA.length || onlyInB.length) {
        const lines = [];
        if (onlyInA.length) lines.push(`Keys only in ${localeA}:\n  ${onlyInA.join('\n  ')}`);
        if (onlyInB.length) lines.push(`Keys only in ${localeB}:\n  ${onlyInB.join('\n  ')}`);
        throw new Error(lines.join('\n\n'));
      }

      expect(onlyInA).toHaveLength(0);
      expect(onlyInB).toHaveLength(0);
    });
  }

  it('no locale has empty string values (placeholder forgotten)', () => {
    const violations = [];
    for (const locale of LOCALES) {
      for (const path of paths[locale]) {
        const value = path.split('.').reduce((o, k) => o?.[k], data[locale]);
        if (value === '') violations.push(`${locale}: "${path}" is empty string`);
      }
    }
    if (violations.length) throw new Error(violations.join('\n'));
    expect(violations).toHaveLength(0);
  });
});
