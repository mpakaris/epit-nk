export const INVOICE_CATEGORIES = [
  { id: 'Anyag', label: 'Anyag', desc: 'Építőanyagok, fa, cement, burkolat', color: 'anyag' },
  { id: 'Munka', label: 'Munka', desc: 'Kőműves, villanyszerelő, festő munkadíjak', color: 'munka' },
  { id: 'Szerszám/Eszköz', label: 'Szerszám/Eszköz', desc: 'Gépbérlés, szerszámok, állványzat', color: 'eszkoz' },
  { id: 'Szállítás', label: 'Szállítás', desc: 'Teherfuvarozás, konténer, üzemanyag', color: 'szallitas' },
  { id: 'Engedély/Hatóság', label: 'Engedély/Hatóság', desc: 'Tervezés, illetékek, földhivatal', color: 'hatosag' },
  { id: 'Egyéb', label: 'Egyéb', desc: 'Étkezés, egyéb felmerülő költségek', color: 'egyeb' }
];

export function formatHUF(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 Ft';
  return new Intl.NumberFormat('hu-HU', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(Math.round(amount)) + ' Ft';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
