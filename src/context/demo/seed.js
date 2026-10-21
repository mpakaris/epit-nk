// ─── Demo seed data — all IDs use a recognisable dd-prefix UUID scheme ───────
// Increment SEED_VERSION when any data changes to trigger a localStorage reset.
export const SEED_VERSION = 3;

// ── IDs ───────────────────────────────────────────────────────────────────────
export const ID = {
  collective:    'dd000000-0000-0000-0000-000000000001',
  userOwner:     'dd000000-0000-0000-0000-000000000010', // Nemes Péter (personal + collective owner)
  userEva:       'dd000000-0000-0000-0000-000000000011', // Balogh Éva   (contributor)
  userMarton:    'dd000000-0000-0000-0000-000000000012', // Tóth Márton  (contributor)
  client1:       'dd000000-0000-0000-0000-000000000020', // Bakos Péter
  client2:       'dd000000-0000-0000-0000-000000000021', // Horváth Anna
  projP1:        'dd000000-0000-0000-0000-000000000030', // personal project 1
  projP2:        'dd000000-0000-0000-0000-000000000031', // personal project 2
  projC1:        'dd000000-0000-0000-0000-000000000032', // collective project 1
  projC2:        'dd000000-0000-0000-0000-000000000033', // collective project 2
  surveyP1:      'dd000000-0000-0000-0000-000000000040', // personal survey
  surveyC1:      'dd000000-0000-0000-0000-000000000041', // collective survey
  quoteP1:       'dd000000-0000-0000-0000-000000000050', // personal quote
  quoteC1:       'dd000000-0000-0000-0000-000000000051', // collective quote
  roomP1_1:      'dd000000-0000-0000-0000-000000000060', // project room
  roomP1_2:      'dd000000-0000-0000-0000-000000000061',
  roomC1_1:      'dd000000-0000-0000-0000-000000000062',
  qSectP1_1:     'dd000000-0000-0000-0000-000000000070', // quote sections
  qSectP1_2:     'dd000000-0000-0000-0000-000000000071',
  qSectC1_1:     'dd000000-0000-0000-0000-000000000072',
  qSectC1_2:     'dd000000-0000-0000-0000-000000000073',
  qSectC1_3:     'dd000000-0000-0000-0000-000000000074',
};

const now  = new Date().toISOString();
const d    = (offset) => { const dt = new Date(); dt.setDate(dt.getDate() + offset); return dt.toISOString().slice(0, 10); };

// ── Users ─────────────────────────────────────────────────────────────────────
export const DEMO_USER = {
  id:                    ID.userOwner,
  email:                 'nemes@demo.okosszaki.hu',
  display_name:          'Nemes Péter',
  role:                  'user',
  active_collective_id:  null,
  is_subscription_premium: true,
  must_change_password:  false,
  default_tax_percent:   27,
};

export const DEMO_USERS = [
  { id: ID.userOwner,  display_name: 'Nemes Péter',    email: 'nemes@demo.okosszaki.hu',  role: 'user', collective_role: 'owner'       },
  { id: ID.userEva,    display_name: 'Balogh Éva',     email: 'balogh@demo.okosszaki.hu', role: 'user', collective_role: 'contributor' },
  { id: ID.userMarton, display_name: 'Tóth Márton',    email: 'toth@demo.okosszaki.hu',   role: 'user', collective_role: 'contributor' },
];

// ── Collective ────────────────────────────────────────────────────────────────
export const DEMO_COLLECTIVES = [
  { collective_id: ID.collective, name: 'Nemes Renováló Kft.', role: 'owner' },
];

// ── Clients ───────────────────────────────────────────────────────────────────
export const DEMO_CLIENTS = [
  { id: ID.client1, owner_id: ID.userOwner, name: 'Bakos Péter',   phone: '+36 30 123 4567', email: 'bakos@email.hu',  address: '1124 Budapest, Alkotás u. 33.',  notes: 'Megbízható ügyfél, gyors döntéshozó.' },
  { id: ID.client2, owner_id: ID.userOwner, name: 'Horváth Anna',  phone: '+36 20 987 6543', email: 'horvath@email.hu', address: '8600 Siófok, Balatoni út 12.',   notes: 'Nyaraló felújítás, nyáron időzített.' },
];

// ── Projects (personal) ───────────────────────────────────────────────────────
export const DEMO_PROJECTS = [
  {
    id: ID.projP1, owner_id: ID.userOwner, created_by: ID.userOwner,
    collective_id: null, client_id: ID.client1,
    name: 'Bakos villa – Fürdőszoba felújítás',
    description: 'Komplett burkolás, szaniter csere, gépészet',
    start_date: d(-30), end_date: d(10), status: 'active',
    members: [ID.userOwner], created_at: d(-35),
  },
  {
    id: ID.projP2, owner_id: ID.userOwner, created_by: ID.userOwner,
    collective_id: null, client_id: ID.client2,
    name: 'Horváth – Garázsbeépítés',
    description: 'Vasbeton szerkezet, kapu, villany',
    start_date: d(-60), end_date: d(-5), status: 'active',
    members: [ID.userOwner], created_at: d(-65),
  },
  // Collective projects
  {
    id: ID.projC1, owner_id: ID.userOwner, created_by: ID.userOwner,
    collective_id: ID.collective, client_id: ID.client1,
    name: 'Bakos villa – Teljes felújítás',
    description: 'Teljes körű belsőépítészeti és gépészeti felújítás',
    start_date: d(-45), end_date: d(30), status: 'active',
    members: [ID.userOwner, ID.userEva, ID.userMarton], created_at: d(-50),
  },
  {
    id: ID.projC2, owner_id: ID.userOwner, created_by: ID.userOwner,
    collective_id: ID.collective, client_id: ID.client2,
    name: 'Siófoki nyaraló – Tetőcsere',
    description: 'Teljes tetőszerkezet csere, hőszigetelés, ereszrendszer',
    start_date: d(-20), end_date: d(40), status: 'active',
    members: [ID.userOwner, ID.userMarton], created_at: d(-25),
  },
];

// ── Invoices ──────────────────────────────────────────────────────────────────
export const DEMO_INVOICES = [
  // projP1
  { id: 'di001', project_id: ID.projP1, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf: 185000, category: 'Anyag',           description: 'Járólap és fugázó (45 m²)',       room_id: ID.roomP1_1, created_at: d(-28), image_url: '' },
  { id: 'di002', project_id: ID.projP1, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf:  95000, category: 'Anyag',           description: 'Szaniter csomag (WC, mosdó)',     room_id: ID.roomP1_1, created_at: d(-20), image_url: '' },
  { id: 'di003', project_id: ID.projP1, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf:  38000, category: 'Szerszám/Eszköz', description: 'Kézi csempevágó bérlet',          room_id: null,        created_at: d(-25), image_url: '' },
  { id: 'di004', project_id: ID.projP1, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf:  22000, category: 'Szállítás',        description: 'Anyagszállítás (2 fuvar)',         room_id: null,        created_at: d(-26), image_url: '' },
  // projP2
  { id: 'di005', project_id: ID.projP2, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf: 420000, category: 'Anyag',           description: 'Vasbeton anyagok (beton, acél)',  room_id: null,        created_at: d(-55), image_url: '' },
  { id: 'di006', project_id: ID.projP2, uploaded_by: ID.userOwner, uploader_name: 'Nemes Péter', value_huf: 145000, category: 'Anyag',           description: 'Szekcionális garázskapu',          room_id: null,        created_at: d(-40), image_url: '' },
  // projC1
  { id: 'di007', project_id: ID.projC1, uploaded_by: ID.userOwner,  uploader_name: 'Nemes Péter',  value_huf: 340000, category: 'Anyag',           description: 'Gipszkarton és acélprofil',        room_id: ID.roomC1_1, created_at: d(-42), image_url: '' },
  { id: 'di008', project_id: ID.projC1, uploaded_by: ID.userEva,    uploader_name: 'Balogh Éva',   value_huf: 128000, category: 'Anyag',           description: 'Villanyszereléki anyagok',         room_id: null,        created_at: d(-35), image_url: '' },
  { id: 'di009', project_id: ID.projC1, uploaded_by: ID.userMarton, uploader_name: 'Tóth Márton',  value_huf:  98000, category: 'Anyag',           description: 'Vízszerelési idomok, csövek',      room_id: null,        created_at: d(-30), image_url: '' },
  { id: 'di010', project_id: ID.projC1, uploaded_by: ID.userOwner,  uploader_name: 'Nemes Péter',  value_huf:  65000, category: 'Szállítás',        description: 'Anyagszállítás (3 fuvar)',          room_id: null,        created_at: d(-43), image_url: '' },
  // projC2
  { id: 'di011', project_id: ID.projC2, uploaded_by: ID.userOwner,  uploader_name: 'Nemes Péter',  value_huf: 680000, category: 'Anyag',           description: 'Tetőcserép és alátétfólia',        room_id: null,        created_at: d(-18), image_url: '' },
  { id: 'di012', project_id: ID.projC2, uploaded_by: ID.userMarton, uploader_name: 'Tóth Márton',  value_huf:  72000, category: 'Anyag',           description: 'Ereszcsatorna és rögzítők',        room_id: null,        created_at: d(-15), image_url: '' },
];

// ── Labour entries ────────────────────────────────────────────────────────────
export const DEMO_LABOUR = [
  // projP1
  { id: 'dl001', project_id: ID.projP1, uploaded_by: ID.userOwner,  date: d(-27), labour_type: 'Burkolás (falicsempe)',      hours: 16, hourly_rate: 4500,  value_huf: 72000,  unit: 'h', room_id: ID.roomP1_1 },
  { id: 'dl002', project_id: ID.projP1, uploaded_by: ID.userOwner,  date: d(-22), labour_type: 'Szaniter szerelés',           hours:  8, hourly_rate: 5500,  value_huf: 44000,  unit: 'h', room_id: ID.roomP1_1 },
  // projC1
  { id: 'dl003', project_id: ID.projC1, uploaded_by: ID.userOwner,  date: d(-40), labour_type: 'Gipszkarton szerkezet',       hours: 24, hourly_rate: 4200,  value_huf: 100800, unit: 'h', room_id: ID.roomC1_1 },
  { id: 'dl004', project_id: ID.projC1, uploaded_by: ID.userEva,    date: d(-33), labour_type: 'Villanyszereléki munkák',     hours: 20, hourly_rate: 5800,  value_huf: 116000, unit: 'h', room_id: null        },
  { id: 'dl005', project_id: ID.projC1, uploaded_by: ID.userMarton, date: d(-28), labour_type: 'Vízszerelés és beépítés',     hours: 16, hourly_rate: 5500,  value_huf:  88000, unit: 'h', room_id: null        },
  // projC2
  { id: 'dl006', project_id: ID.projC2, uploaded_by: ID.userOwner,  date: d(-17), labour_type: 'Tetőcsere és héjalás',        hours: 32, hourly_rate: 4800,  value_huf: 153600, unit: 'h', room_id: null        },
  { id: 'dl007', project_id: ID.projC2, uploaded_by: ID.userMarton, date: d(-12), labour_type: 'Ereszcsatorna szerelés',      hours:  8, hourly_rate: 4500,  value_huf:  36000, unit: 'h', room_id: null        },
];

// ── Project rooms ─────────────────────────────────────────────────────────────
export const DEMO_PROJECT_ROOMS = [
  { id: ID.roomP1_1, project_id: ID.projP1, name: 'Fürdőszoba',       size_m2: 8.5,  sort_order: 1, created_at: now },
  { id: ID.roomP1_2, project_id: ID.projP1, name: 'WC',                size_m2: 2.2,  sort_order: 2, created_at: now },
  { id: ID.roomC1_1, project_id: ID.projC1, name: 'Nappali + étkező', size_m2: 42.0, sort_order: 1, created_at: now },
];

// ── Surveys ───────────────────────────────────────────────────────────────────
export const DEMO_SURVEYS = [
  {
    id: ID.surveyP1, owner_id: ID.userOwner, collective_id: null,
    title: 'Bakos villa – Felmérés',
    location: '1124 Budapest, Alkotás u. 33.',
    notes: 'Teljes fürdőszobai és konyhai felmérés. Ügyfél jelen volt.',
    date: d(-32), client_id: ID.client1, created_at: d(-32), created_by: ID.userOwner,
    shared_with: [],
  },
  {
    id: ID.surveyC1, owner_id: ID.userOwner, collective_id: ID.collective,
    title: 'Bakos villa – Teljes belső felmérés',
    location: '1124 Budapest, Alkotás u. 33.',
    notes: 'Komplex felmérés az összes helyiségre. Csapatban végezve.',
    date: d(-47), client_id: ID.client1, created_at: d(-47), created_by: ID.userOwner,
    shared_with: [ID.userEva, ID.userMarton],
  },
];

// ── Survey entries (rooms) ────────────────────────────────────────────────────
export const DEMO_SURVEY_ENTRIES = {
  [ID.surveyP1]: [
    { id: 'dse001', survey_id: ID.surveyP1, name: 'Fürdőszoba',   width_m: 2.8, length_m: 3.1, height_m: 2.6, size_m2: 8.7,  window_count: 1, door_count: 1, description: 'Északi fal csempés, többi vakolat', sort_order: 1 },
    { id: 'dse002', survey_id: ID.surveyP1, name: 'WC',            width_m: 1.4, length_m: 1.6, height_m: 2.6, size_m2: 2.2,  window_count: 0, door_count: 1, description: '',                                 sort_order: 2 },
    { id: 'dse003', survey_id: ID.surveyP1, name: 'Konyha',        width_m: 3.2, length_m: 4.5, height_m: 2.75, size_m2: 14.4, window_count: 2, door_count: 1, description: 'Kályha pozíció módosítandó',      sort_order: 3 },
  ],
  [ID.surveyC1]: [
    { id: 'dse004', survey_id: ID.surveyC1, name: 'Nappali',       width_m: 5.4, length_m: 6.2, height_m: 2.75, size_m2: 33.5, window_count: 3, door_count: 2, description: 'Parketta csere szükséges',         sort_order: 1 },
    { id: 'dse005', survey_id: ID.surveyC1, name: 'Háló 1',        width_m: 3.5, length_m: 4.2, height_m: 2.75, size_m2: 14.7, window_count: 2, door_count: 1, description: '',                                 sort_order: 2 },
    { id: 'dse006', survey_id: ID.surveyC1, name: 'Háló 2',        width_m: 3.2, length_m: 3.8, height_m: 2.75, size_m2: 12.2, window_count: 1, door_count: 1, description: 'Beépített szekrény marad',         sort_order: 3 },
    { id: 'dse007', survey_id: ID.surveyC1, name: 'Fürdőszoba',    width_m: 2.8, length_m: 3.1, height_m: 2.6,  size_m2: 8.7,  window_count: 1, door_count: 1, description: 'Teljes bontás és újraépítés',      sort_order: 4 },
  ],
};

// ── Quotes ────────────────────────────────────────────────────────────────────
export const DEMO_QUOTES = [
  {
    id: ID.quoteP1, owner_id: ID.userOwner, collective_id: null,
    title: 'Bakos villa – Fürdőszoba ajánlat',
    location: '1124 Budapest, Alkotás u. 33.',
    work_type: 'Burkolás, szaniter, gépészet',
    description: 'Komplett fürdőszoba felújítás burkolással, szaniter cserével és gépészeti munkákkal.',
    start_date: d(-30), end_date: d(10),
    status: 'sent', client_id: ID.client1,
    tax_percent: 27, total_amount_huf: 590120,
    created_at: d(-35), created_by: ID.userOwner, shared_with: [],
  },
  {
    id: ID.quoteC1, owner_id: ID.userOwner, collective_id: ID.collective,
    title: 'Bakos villa – Teljes belső ajánlat',
    location: '1124 Budapest, Alkotás u. 33.',
    work_type: 'Gipszkarton, villany, víz, burkolás, festés',
    description: 'Teljes körű belsőépítészeti felújítás csapataink közreműködésével.',
    start_date: d(-45), end_date: d(30),
    status: 'sent', client_id: ID.client1,
    tax_percent: 27, total_amount_huf: 1341100,
    created_at: d(-50), created_by: ID.userOwner, shared_with: [ID.userEva, ID.userMarton],
  },
];

// ── Quote sections ────────────────────────────────────────────────────────────
export const DEMO_QUOTE_SECTIONS = [
  { id: ID.qSectP1_1, quote_id: ID.quoteP1, name: 'Fürdőszoba',       description: 'Teljes burkolás, szaniter csere, villanyszerelés', sort_order: 1 },
  { id: ID.qSectP1_2, quote_id: ID.quoteP1, name: 'WC',               description: 'Csempézés, WC szett csere',                       sort_order: 2 },
  { id: ID.qSectC1_1, quote_id: ID.quoteC1, name: 'Nappali + étkező', description: 'Gipszkarton álmennyezet, festés, padló',           sort_order: 1 },
  { id: ID.qSectC1_2, quote_id: ID.quoteC1, name: 'Háló 1',           description: 'Glettelés, festés, padlócsere',                   sort_order: 2 },
  { id: ID.qSectC1_3, quote_id: ID.quoteC1, name: 'Fürdőszoba',       description: 'Teljes bontás, burkolás, szaniter',               sort_order: 3 },
];

// ── Quote entries ─────────────────────────────────────────────────────────────
export const DEMO_QUOTE_ENTRIES = [
  // ── quoteP1 / Fürdőszoba ─────────────────────────────────────────────────
  { id: 'dqe001', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Bontás, burkolat eltávolítása',    entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 45000,  notes: 'Falicsempe + padlólap bontás, törmelék elvitel' },
  { id: 'dqe002', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Falicsempe burkolás (munkadíj)',    entry_type: 'labour',    quantity: 24,   unit: 'm²',  unit_price: 4500,  amount_huf: 108000, notes: '' },
  { id: 'dqe003', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Falicsempe anyag (25×40 cm)',       entry_type: 'material',  quantity: 26,   unit: 'm²',  unit_price: 3200,  amount_huf: 83200,  notes: '10% vágási veszteséggel' },
  { id: 'dqe004', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Padlólap burkolás (munkadíj)',      entry_type: 'labour',    quantity: 8.7,  unit: 'm²',  unit_price: 3800,  amount_huf: 33060,  notes: '' },
  { id: 'dqe005', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Padlólap anyag (60×60 cm)',         entry_type: 'material',  quantity: 10,   unit: 'm²',  unit_price: 4200,  amount_huf: 42000,  notes: '' },
  { id: 'dqe006', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Szaniter csomag beépítése',         entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 85000,  notes: 'WC, mosdó, zuhanykabin' },
  { id: 'dqe007', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Vízszigetelő anyag + felhordás',    entry_type: 'material',  quantity: 8.7,  unit: 'm²',  unit_price: 2800,  amount_huf: 24360,  notes: 'Mapei Mapelastic' },
  { id: 'dqe008', quote_id: ID.quoteP1, section_id: ID.qSectP1_1, user_id: ID.userOwner, work_description: 'Villanyszerelési munkák',           entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 38000,  notes: 'Lámpapontok, kapcsoló, konnektorok' },

  // ── quoteP1 / WC ─────────────────────────────────────────────────────────
  { id: 'dqe009', quote_id: ID.quoteP1, section_id: ID.qSectP1_2, user_id: ID.userOwner, work_description: 'Bontás és előkészítés',             entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 22000,  notes: '' },
  { id: 'dqe010', quote_id: ID.quoteP1, section_id: ID.qSectP1_2, user_id: ID.userOwner, work_description: 'Falicsempe burkolás (munkadíj)',    entry_type: 'labour',    quantity: 9,    unit: 'm²',  unit_price: 4500,  amount_huf: 40500,  notes: '' },
  { id: 'dqe011', quote_id: ID.quoteP1, section_id: ID.qSectP1_2, user_id: ID.userOwner, work_description: 'Csempe anyag (25×40 cm)',           entry_type: 'material',  quantity: 10,   unit: 'm²',  unit_price: 2200,  amount_huf: 22000,  notes: '' },
  { id: 'dqe012', quote_id: ID.quoteP1, section_id: ID.qSectP1_2, user_id: ID.userOwner, work_description: 'Padlólap burkolás (munkadíj)',      entry_type: 'labour',    quantity: 2.2,  unit: 'm²',  unit_price: 3800,  amount_huf: 8360,   notes: '' },
  { id: 'dqe013', quote_id: ID.quoteP1, section_id: ID.qSectP1_2, user_id: ID.userOwner, work_description: 'WC szett beépítés (falra függesztett)', entry_type: 'labour', quantity: null, unit: null,  unit_price: null,  amount_huf: 45000,  notes: 'Geberit tartállyal' },

  // ── quoteC1 / Nappali + étkező ───────────────────────────────────────────
  { id: 'dqe014', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Gipszkarton álmennyezet szerelés',  entry_type: 'labour',    quantity: 33.5, unit: 'm²',  unit_price: 4200,  amount_huf: 140700, notes: '' },
  { id: 'dqe015', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Gipszkarton lap + acélprofil',      entry_type: 'material',  quantity: 33.5, unit: 'm²',  unit_price: 2800,  amount_huf: 93800,  notes: 'Knauf rendszer' },
  { id: 'dqe016', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userEva,   work_description: 'Villamos csatlakozók (10 db)',      entry_type: 'labour',    quantity: 10,   unit: 'db',  unit_price: 8500,  amount_huf: 85000,  notes: 'Gipszkarton mögötti kábelek is benne' },
  { id: 'dqe017', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Glettelés + alapozás',              entry_type: 'labour',    quantity: 80,   unit: 'm²',  unit_price: 1400,  amount_huf: 112000, notes: '' },
  { id: 'dqe018', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Festés (2 réteg)',                  entry_type: 'labour',    quantity: 80,   unit: 'm²',  unit_price: 1200,  amount_huf: 96000,  notes: '' },
  { id: 'dqe019', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Festék + alapozó anyag',            entry_type: 'material',  quantity: 80,   unit: 'm²',  unit_price: 650,   amount_huf: 52000,  notes: 'Baumit prémium beltéri' },
  { id: 'dqe020', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Laminált padló fektetés',           entry_type: 'labour',    quantity: 33.5, unit: 'm²',  unit_price: 3200,  amount_huf: 107200, notes: '' },
  { id: 'dqe021', quote_id: ID.quoteC1, section_id: ID.qSectC1_1, user_id: ID.userOwner, work_description: 'Laminált padló + lábléc anyag',     entry_type: 'material',  quantity: 36,   unit: 'm²',  unit_price: 3800,  amount_huf: 136800, notes: 'Quick-Step, 10% veszteséggel' },

  // ── quoteC1 / Háló 1 ─────────────────────────────────────────────────────
  { id: 'dqe022', quote_id: ID.quoteC1, section_id: ID.qSectC1_2, user_id: ID.userOwner, work_description: 'Glettelés + alapozás',              entry_type: 'labour',    quantity: 48,   unit: 'm²',  unit_price: 1400,  amount_huf: 67200,  notes: '' },
  { id: 'dqe023', quote_id: ID.quoteC1, section_id: ID.qSectC1_2, user_id: ID.userOwner, work_description: 'Festés (2 réteg)',                  entry_type: 'labour',    quantity: 48,   unit: 'm²',  unit_price: 1200,  amount_huf: 57600,  notes: '' },
  { id: 'dqe024', quote_id: ID.quoteC1, section_id: ID.qSectC1_2, user_id: ID.userOwner, work_description: 'Festék + alapozó anyag',            entry_type: 'material',  quantity: 50,   unit: 'm²',  unit_price: 650,   amount_huf: 32500,  notes: '' },
  { id: 'dqe025', quote_id: ID.quoteC1, section_id: ID.qSectC1_2, user_id: ID.userOwner, work_description: 'Padlószőnyeg bontás + laminált padló fektetés', entry_type: 'labour', quantity: 14.7, unit: 'm²', unit_price: 4200, amount_huf: 61740, notes: '' },
  { id: 'dqe026', quote_id: ID.quoteC1, section_id: ID.qSectC1_2, user_id: ID.userOwner, work_description: 'Laminált padló + lábléc anyag',     entry_type: 'material',  quantity: 16,   unit: 'm²',  unit_price: 3800,  amount_huf: 60800,  notes: '' },

  // ── quoteC1 / Fürdőszoba ─────────────────────────────────────────────────
  { id: 'dqe027', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userOwner, work_description: 'Teljes bontás és előkészítés',      entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 45000,  notes: '' },
  { id: 'dqe028', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userOwner, work_description: 'Falicsempe burkolás (munkadíj)',    entry_type: 'labour',    quantity: 28,   unit: 'm²',  unit_price: 4800,  amount_huf: 134400, notes: '' },
  { id: 'dqe029', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userOwner, work_description: 'Falicsempe anyag (30×60 cm)',       entry_type: 'material',  quantity: 30,   unit: 'm²',  unit_price: 3400,  amount_huf: 102000, notes: '' },
  { id: 'dqe030', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userOwner, work_description: 'Padlólap burkolás (munkadíj)',      entry_type: 'labour',    quantity: 8.7,  unit: 'm²',  unit_price: 4200,  amount_huf: 36540,  notes: '' },
  { id: 'dqe031', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userMarton,'work_description': 'Szaniter csomag beépítése',       entry_type: 'labour',    quantity: null, unit: null,  unit_price: null,  amount_huf: 95000,  notes: 'WC, mosdó, zuhanykabin, radiátor' },
  { id: 'dqe032', quote_id: ID.quoteC1, section_id: ID.qSectC1_3, user_id: ID.userOwner, work_description: 'Vízszigetelő anyag + felhordás',    entry_type: 'material',  quantity: 8.7,  unit: 'm²',  unit_price: 2800,  amount_huf: 24360,  notes: '' },
];
