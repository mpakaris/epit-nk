// Central registry for survey item units.
// key   — value stored in DB; never change these.
// tKey  — i18n key in the surveyDetail namespace; pass a surveyDetail t() to getUnitLabel().
// When tKey is absent the label equals the key (universal symbols like m², kg, l).

export const SURVEY_UNITS = [
  // ── Area / Length ────────────────────────────────────────────
  { key: 'm²'      },
  { key: 'm'       },
  { key: 'fm',       tKey: 'itemsUnitFm'      },   // lm / lfm
  { key: 'm³'      },
  { key: 'cm'      },
  { key: 'mm'      },
  // ── Count / Packaging ────────────────────────────────────────
  { key: 'db',       tKey: 'itemsUnitDb'      },   // pcs / Stk
  { key: 'csomag',   tKey: 'itemsUnitCsomag'  },   // pkg / Pkg
  { key: 'zsák',     tKey: 'itemsUnitZsak'    },   // bag / Sack
  { key: 'doboz',    tKey: 'itemsUnitDoboz'   },   // box / Karton
  { key: 'tekercs',  tKey: 'itemsUnitTekercs' },   // roll / Rolle
  { key: 'lap',      tKey: 'itemsUnitLap'     },   // sheet / Platte
  // ── Weight / Volume ──────────────────────────────────────────
  { key: 'kg'      },
  { key: 'g'       },
  { key: 't'       },
  { key: 'l'       },
  // ── Time ─────────────────────────────────────────────────────
  { key: 'h',        tKey: 'itemsUnitH'       },   // hour / Stunde
  { key: 'nap',      tKey: 'itemsUnitNap'     },   // day / Tag
  { key: 'hét',      tKey: 'itemsUnitHet'     },   // week / Woche
  { key: 'hó',       tKey: 'itemsUnitHo'      },   // month / Monat
  // ── Distance ─────────────────────────────────────────────────
  { key: 'km'      },
];

// Unit subsets shown per item type (order determines dropdown order)
export const UNITS_BY_TYPE = {
  material:  ['m²', 'm', 'fm', 'm³', 'cm', 'mm', 'db', 'csomag', 'zsák', 'doboz', 'tekercs', 'lap', 'kg', 'g', 't', 'l'],
  labour:    ['m²', 'm³', 'm', 'fm', 'db', 'h', 'nap', 'hét', 'hó'],
  equipment: ['db', 'h', 'nap', 'hét', 'hó'],
  transport: ['db', 'm³', 'km', 'nap', 't', 'kg'],
  other:     ['db', 'h', 'nap', 'hét', 'm²', 'm³', 'csomag'],
};

// All keys as a flat array (fallback when type is unknown)
export const ALL_UNIT_KEYS = SURVEY_UNITS.map(u => u.key);

export const DEFAULT_UNIT_BY_TYPE = {
  material:  'm²',
  labour:    'h',
  equipment: 'nap',
  transport: 'db',
  other:     'db',
};

/**
 * Returns the translated label for a stored unit key.
 * @param {string} unitKey  — the value stored in DB (e.g. 'nap', 'db', 'm²')
 * @param {Function} t      — useTranslations('surveyDetail') result
 */
export function getUnitLabel(unitKey, t) {
  const def = SURVEY_UNITS.find(u => u.key === unitKey);
  if (!def || !def.tKey) return unitKey;
  return t(def.tKey);
}
