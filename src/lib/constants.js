export const INVOICE_CATEGORIES = [
  { id: 'Anyag', label: 'Anyag', desc: 'Építőanyagok, fa, cement, burkolat', color: 'anyag' },
  { id: 'Szerszám/Eszköz', label: 'Szerszám/Eszköz', desc: 'Gépbérlés, szerszámok, állványzat', color: 'eszkoz' },
  { id: 'Szállítás', label: 'Szállítás', desc: 'Teherfuvarozás, konténer, üzemanyag', color: 'szallitas' },
  { id: 'Engedély/Hatóság', label: 'Engedély/Hatóság', desc: 'Tervezés, illetékek, földhivatal', color: 'hatosag' },
  { id: 'Egyéb', label: 'Egyéb', desc: 'Vállalkozói munkadíj, étkezés, egyéb', color: 'egyeb' }
];

export const QUOTE_STATUSES = [
  { id: 'draft', label: 'Vázlat', color: 'muted' },
  { id: 'sent', label: 'Kiküldve', color: 'warning' },
  { id: 'accepted', label: 'Elfogadva', color: 'success' },
  { id: 'rejected', label: 'Elutasítva', color: 'danger' }
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
