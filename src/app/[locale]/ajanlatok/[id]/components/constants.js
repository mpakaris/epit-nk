// Shared constants for quote detail components
import { Package, Hammer, Wrench, Truck, MoreHorizontal } from 'lucide-react';

export const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
export const sortEntries = (arr) => [...arr].sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));

export const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
export const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};
export const QUOTE_ENTRY_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép/eszköz', transport: 'Szállítás', other: 'Egyéb' };
