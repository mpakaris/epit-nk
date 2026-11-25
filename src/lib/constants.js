export const INVOICE_CATEGORY_COLORS = {
  'material':  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'labour':    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  'equipment': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'delivery':  { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  'parking':   { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  'other':     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

export const INVOICE_CATEGORIES = [
  { id: 'material',  label: 'Anyag',             desc: 'Építőanyagok, fa, cement, burkolat'  },
  { id: 'labour',    label: 'Munka',             desc: 'Alvállalkozói munkadíj, számla'       },
  { id: 'equipment', label: 'Szerszám/Eszköz',   desc: 'Gépbérlés, szerszámok, állványzat'   },
  { id: 'delivery',  label: 'Szállítás',         desc: 'Teherfuvarozás, konténer, üzemanyag'  },
  { id: 'parking',   label: 'Engedély/Hatóság',  desc: 'Tervezés, illetékek, földhivatal'     },
  { id: 'other',     label: 'Egyéb',             desc: 'Étkezés, vegyes kiadás'               },
];

export const QUOTE_ENTRY_TYPES = [
  { id: 'material',  label: 'Anyag',        desc: 'Építőanyag, burkolat, festék…'  },
  { id: 'labour',    label: 'Munkadíj',      desc: 'Saját vagy alvállalkozói munka' },
  { id: 'equipment', label: 'Eszközbérlés',  desc: 'Gép, állvány, szerszám bérlés' },
  { id: 'transport', label: 'Szállítás',     desc: 'Fuvar, konténer, fuvarozás'    },
  { id: 'other',     label: 'Egyéb',         desc: 'Engedély, hatóság, vegyes'     }
];

export const QUANTITY_UNITS = ['h', 'db', 'm', 'fm', 'm²', 'm³', 'kg', 't', 'l', 'zsák', 'csomag'];
export const LABOUR_UNITS   = ['h', 'nap', 'm²', 'm', 'fm', 'db'];

// Maps unit storage keys to surveyDetail i18n translation keys.
// Use with useTranslations('surveyDetail') — falls back to the raw key if no mapping exists.
export const UNIT_I18N = {
  db:     'itemsUnitDb',
  nap:    'itemsUnitNap',
  zsák:   'itemsUnitZsak',
  csomag: 'itemsUnitCsomag',
  fm:     'itemsUnitFm',
  h:      'itemsUnitH',
};

export const QUOTE_STATUSES = [
  { id: 'draft',    label: 'Vázlat',     color: 'muted'   },
  { id: 'sent',     label: 'Kiküldve',   color: 'warning' },
  { id: 'accepted', label: 'Elfogadva',  color: 'success' },
  { id: 'rejected', label: 'Elutasítva', color: 'danger'  }
];

export function formatHUF(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 Ft';
  return new Intl.NumberFormat('hu-HU', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(Math.round(amount)) + ' Ft';
}

const CURRENCY_FMT = {
  HUF: null,                    // delegate to formatHUF
  EUR: ['de-DE', 2, 'EUR'],
  GBP: ['en-GB', 2, 'GBP'],
  USD: ['en-US', 2, 'USD'],
};

export function formatMoney(amount, currency = 'HUF') {
  if (!currency || currency === 'HUF') return formatHUF(amount);
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  const cfg = CURRENCY_FMT[currency];
  if (!cfg) return formatHUF(amount);
  return new Intl.NumberFormat(cfg[0], {
    style: 'currency',
    currency: cfg[2],
    maximumFractionDigits: cfg[1],
    minimumFractionDigits: cfg[1],
  }).format(Number(amount));
}

export function formatDate(dateStr, locale = 'hu-HU') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export const MAX_DIARY_PHOTOS = 10;
