import ClientPortal from '../[id]/ClientPortal';

export const metadata = { title: 'Bakos Péter – Ügyfél portál (Demo)' };

// ── static demo data ──────────────────────────────────────────────────────────

const CLIENT = {
  id: 'demo',
  name: 'Bakos Péter',
  address: '1124 Budapest, Alkotás u. 33.',
  phone: '+36 30 123 4567',
  email: 'bakos.peter@email.hu',
};

const ENTITY = { id: 'demo-entity', name: 'Nemes Renováló Kft.' };

const BATH_ENTRIES = [
  { id: 'e1', entry_type: 'material', work_description: 'Falicsempe (60×60 Rectified)', quantity: 24, unit: 'm²', unit_price: 4500, amount_huf: 108000, section_id: 'demo-s1', notes: 'Apavisa fehér matt' },
  { id: 'e2', entry_type: 'material', work_description: 'Padlócsempe (30×60 Anti-slip)', quantity: 8, unit: 'm²', unit_price: 5200, amount_huf: 41600, section_id: 'demo-s1' },
  { id: 'e3', entry_type: 'labour', work_description: 'Burkolás (fal + padló)', quantity: 32, unit: 'm²', unit_price: 4800, amount_huf: 153600, section_id: 'demo-s1' },
  { id: 'e4', entry_type: 'material', work_description: 'Szaniter szett (WC, mosdó, kád)', quantity: 1, unit: 'db', unit_price: 185000, amount_huf: 185000, section_id: 'demo-s1' },
  { id: 'e5', entry_type: 'labour', work_description: 'Szaniter szerelés', quantity: 1, unit: 'db', unit_price: 85000, amount_huf: 85000, section_id: 'demo-s1' },
];

const HALL_ENTRIES = [
  { id: 'e6', entry_type: 'material', work_description: 'Padlócsempe (30×60 fényes)', quantity: 6, unit: 'm²', unit_price: 4800, amount_huf: 28800, section_id: 'demo-s2' },
  { id: 'e7', entry_type: 'labour', work_description: 'Padlóburkolás', quantity: 6, unit: 'm²', unit_price: 3800, amount_huf: 22800, section_id: 'demo-s2' },
  { id: 'e8', entry_type: 'labour', work_description: 'Festés (2 réteg)', quantity: 24, unit: 'm²', unit_price: 1400, amount_huf: 33600, section_id: 'demo-s2' },
];

const QUOTES = [
  {
    id: 'demo-q1',
    title: 'Bakos villa – Fürdőszoba és előszoba felújítás',
    status: 'sent',
    created_at: '2026-10-01T09:00:00Z',
    work_type: 'Burkolás, szaniter szerelés, festés',
    location: '1124 Budapest, Alkotás u. 33.',
    start_date: '2026-10-20',
    end_date: '2026-11-30',
    tax_percent: 27,
    description: 'Komplett fürdőszoba felújítás (burkolás, szaniterek, csaptelepek cseréje) és az előszoba padló- és falfelújítása.',
    project_id: null,
    entries: [...BATH_ENTRIES, ...HALL_ENTRIES],
    sections: [
      {
        id: 'demo-s1',
        name: 'Fürdőszoba',
        size_m2: 8,
        description: null,
        survey_entry_id: null,
        photos: [],
        entries: BATH_ENTRIES,
      },
      {
        id: 'demo-s2',
        name: 'Előszoba',
        size_m2: 6,
        description: null,
        survey_entry_id: null,
        photos: [],
        entries: HALL_ENTRIES,
      },
    ],
  },
];

const PROJECT_ENTRIES = [
  {
    id: 'd1',
    project_id: 'demo-p1',
    entry_date: '2026-09-03',
    title: 'Bontási munkák megkezdve',
    body: 'A régi konyhabútort és csempéket szétbontottuk és kiszállítottuk. A falak és padló előkészítése elvégezve, alapozás felvíve.',
    work_type: 'Bontás',
    author_name: 'Nemes Renováló Kft.',
    client_note: null,
    photos: [],
  },
  {
    id: 'd2',
    project_id: 'demo-p1',
    entry_date: '2026-09-12',
    title: 'Csempézés kész, bútor beépítés megkezdve',
    body: 'A fali és padló csempézést befejeztük. Az új konyhabútor elemei megérkeztek, az alsó szekrénysort beépítettük. A felső szekrények és a munkalap beépítése holnap folytatódik.',
    work_type: 'Burkolás',
    author_name: 'Nemes Renováló Kft.',
    client_note: 'Köszönöm a gyors haladást! A csempék nagyon szépek lettek.',
    photos: [],
  },
  {
    id: 'd3',
    project_id: 'demo-p1',
    entry_date: '2026-09-26',
    title: 'Projekt befejezve – átadás megtörtént',
    body: 'Minden munkafázis sikeresen befejeződött. A csaptelepeket és a gázkészüléket beszereltük, a próbaüzem rendben lezajlott. Az ügyfél elvégezte az átvételi ellenőrzést.',
    work_type: 'Átadás',
    author_name: 'Nemes Renováló Kft.',
    client_note: 'Nagyon elégedett vagyok az eredménnyel. Ajánlom másoknak is!',
    photos: [],
  },
];

const PROJECTS = [
  {
    id: 'demo-p1',
    name: 'Bakos villa – Konyha felújítás',
    description: 'Konyhabútor csere, teljes csempézés, csaptelep és gázkészülék csere.',
    start_date: '2026-09-01',
    end_date: '2026-09-28',
    invoiceTotal: 485000,
    diaryEntries: PROJECT_ENTRIES,
    linkedQuote: null,
  },
];

export default function DemoClientPortalPage() {
  return (
    <ClientPortal
      client={CLIENT}
      entity={ENTITY}
      quotes={QUOTES}
      projects={PROJECTS}
    />
  );
}
