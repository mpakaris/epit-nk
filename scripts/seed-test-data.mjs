/**
 * Seed test data for 3 OAuth users.
 * Run: node --env-file=.env.local scripts/seed-test-data.mjs
 *
 * Creates collectives, clients, surveys (with sections + tételek),
 * quotes (some linked to surveys), and projects (with invoices + labour).
 * All records are tagged with [MOCK] so they can be identified / deleted.
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── helpers ──────────────────────────────────────────────────────────────────

const ok = (label, { data, error }) => {
  if (error) { console.error(`✗ ${label}:`, error.message); process.exit(1); }
  console.log(`✓ ${label}`);
  return data;
};

const ins = async (table, rows, label) =>
  ok(label || table, await sb.from(table).insert(Array.isArray(rows) ? rows : [rows]).select());

const isSingle = async (table, rows, label) => {
  const res = await sb.from(table).insert(rows).select().single();
  return ok(label || table, res);
};

// ── 1. Resolve users ─────────────────────────────────────────────────────────

console.log('\n━━ Resolving users ━━');

const { data: { users: authUsers }, error: auErr } = await sb.auth.admin.listUsers({ perPage: 200 });
if (auErr) { console.error('Cannot list users:', auErr.message); process.exit(1); }

const find = (email) => {
  const u = authUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!u) { console.error(`User not found: ${email}`); process.exit(1); }
  return u.id;
};

const A = find('nikos.mpakaris@googlemail.com');     // Nikos G
const B = find('nikos.mpakaris@mppm-consulting.com'); // MPPM
const C = find('mpakaris@gmail.com');                // Michael

console.log(`  A = ${A.slice(0,8)}… (nikos.mpakaris@googlemail.com)`);
console.log(`  B = ${B.slice(0,8)}… (nikos.mpakaris@mppm-consulting.com)`);
console.log(`  C = ${C.slice(0,8)}… (mpakaris@gmail.com)`);

// ── 2. Collectives ───────────────────────────────────────────────────────────

console.log('\n━━ Collectives ━━');

const collMPPM = await isSingle('collectives', {
  name: '[MOCK] MPPM Épülettechnika Kft.',
}, 'collective MPPM');

const collFeluj = await isSingle('collectives', {
  name: '[MOCK] Felújítók BT.',
}, 'collective Felújítók BT.');

const cMPPM  = collMPPM.id;
const cFeluj = collFeluj.id;

// Memberships
await ins('collective_members', [
  { collective_id: cMPPM,  user_id: A, role: 'owner',       status: 'active' },
  { collective_id: cMPPM,  user_id: B, role: 'admin',        status: 'active' },
  { collective_id: cMPPM,  user_id: C, role: 'contributor',  status: 'active' },
  { collective_id: cFeluj, user_id: A, role: 'owner',        status: 'active' },
  { collective_id: cFeluj, user_id: C, role: 'contributor',  status: 'active' },
], 'memberships');

// ── 3. Clients ───────────────────────────────────────────────────────────────
// Clients are ALWAYS personal (GDPR) — no collective_id

console.log('\n━━ Clients ━━');

const clientsA = await ins('clients', [
  { owner_id: A, name: '[MOCK] Kovács László',  email: 'kovacs.laszlo.mock@epitek.dev', phone: '+36301234567', address: 'Budapest, Pannónia utca 12. 5/3.' },
  { owner_id: A, name: '[MOCK] Szabó Anna',     email: 'szabo.anna.mock@epitek.dev',    phone: '+36702345678', address: 'Budapest, Víg utca 8.' },
  { owner_id: A, name: '[MOCK] Horváth Béla',   email: 'horvath.bela.mock@epitek.dev',  phone: '+36209876543' },
], 'clients (User A)');

const clientsB = await ins('clients', [
  { owner_id: B, name: '[MOCK] Nagy Katalin',   email: 'nagy.katalin.mock@epitek.dev',  phone: '+36303334455', address: 'Budapest, Thököly út 44. 3/12.' },
  { owner_id: B, name: '[MOCK] Renner GmbH',    email: 'mock.renner@epitek.dev',        phone: '+4917612345678', address: 'Budapest, Váci út 76.' },
], 'clients (User B)');

const clientsC = await ins('clients', [
  { owner_id: C, name: '[MOCK] Tóth Gábor',     email: 'toth.gabor.mock@epitek.dev',   phone: '+36305556677', address: 'Budapest, Bartók Béla út 22.' },
  { owner_id: C, name: '[MOCK] Kiss Margit',     email: 'kiss.margit.mock@epitek.dev',  phone: '+36309998877', address: 'Budapest, Dohány utca 42. 2/8.' },
], 'clients (User C)');

const [cKovacs, cSzabo, cHorvath] = clientsA;
const [cNagy, cRenner]            = clientsB;
const [cToth, cKiss]              = clientsC;

// ── 4. Surveys ───────────────────────────────────────────────────────────────

console.log('\n━━ Surveys ━━');

// ─ User A personal ─
const sKovacs = await isSingle('surveys', {
  owner_id: A, collective_id: null, created_by: A,
  title: '[MOCK] Kovács László lakás – BP XIII.',
  location: 'Budapest, Pannónia utca 12. 5/3.',
  client_id: cKovacs.id,
  notes: 'Teljes lakásfelújítás. Igény: modern, skandináv stílus. Beköltözési határidő: 2026. augusztus.',
  status: 'active',
}, 'survey: Kovács lakás');

const sSzabo = await isSingle('surveys', {
  owner_id: A, collective_id: null, created_by: A,
  title: '[MOCK] Szabó Anna ház – BP VIII.',
  location: 'Budapest, Víg utca 8.',
  client_id: cSzabo.id,
  notes: 'Szaniter csere + csempézés. Ügyfél sürgős, 3 héten belül kellene.',
  status: 'active',
}, 'survey: Szabó ház');

// ─ User B personal ─
const sNagy = await isSingle('surveys', {
  owner_id: B, collective_id: null, created_by: B,
  title: '[MOCK] Nagy Katalin lakás – Zugló',
  location: 'Budapest, Thököly út 44. 3/12.',
  client_id: cNagy.id,
  notes: 'Konyha + fürdőszoba felújítás. Budget: 1,8 M Ft. Ügyfél maga végzi a bontást.',
  status: 'active',
}, 'survey: Nagy Katalin');

// ─ User C personal ─
const sToth = await isSingle('surveys', {
  owner_id: C, collective_id: null, created_by: C,
  title: '[MOCK] Tóth Gábor nyaraló – Balatonföldvár',
  location: 'Balatonföldvár, Bajcsy-Zsilinszky u. 14.',
  client_id: cToth.id,
  notes: 'Szezonra kész kell legyen (május 1.). Fürdőszoba + konyha csere, nappali festés.',
  status: 'active',
}, 'survey: Tóth nyaraló');

// ─ MPPM collective ─
const sKakavis = await isSingle('surveys', {
  owner_id: A, collective_id: cMPPM, created_by: A,
  title: '[MOCK] Kakavis House – XIV. ker.',
  location: 'Budapest, Ilka utca 33.',
  notes: 'Görög megbízó, kommunikáció angolul. Luxus kategóriás felújítás, nincs budget limit. Alaprajzot már megkaptuk.',
  status: 'active',
}, 'survey: Kakavis House (MPPM)');

const sIroda = await isSingle('surveys', {
  owner_id: B, collective_id: cMPPM, created_by: B,
  title: '[MOCK] Irodafelújítás – V. ker.',
  location: 'Budapest, Váci út 76.',
  client_id: cRenner.id,
  notes: 'Renner GmbH iroda. Éjszakai munkavégzés szükséges (munkanapokon). Gipszkarton válaszfalak + padló.',
  status: 'active',
}, 'survey: Irodafelújítás (MPPM)');

// ─ Felújítók BT collective ─
const sKiss = await isSingle('surveys', {
  owner_id: A, collective_id: cFeluj, created_by: A,
  title: '[MOCK] Kiss Margit bérlemény – BP VII.',
  location: 'Budapest, Dohány utca 42. 2/8.',
  client_id: null,
  notes: 'Bérlemény kiadásra készítendő fel. Minimál költség, max hatás. Üresen áll, szabad a munkavégzés.',
  status: 'active',
}, 'survey: Kiss Margit (Felújítók BT)');

// ── 5. Survey entries (sections / rooms) ─────────────────────────────────────

console.log('\n━━ Survey entries ━━');

// helper
async function addSections(surveyId, createdBy, sections) {
  const rows = sections.map((s, i) => ({
    survey_id:    surveyId,
    created_by:   createdBy,
    name:         s.name,
    description:  s.description || null,
    width_m:      s.w   || null,
    length_m:     s.l   || null,
    height_m:     s.h   || null,
    size_m2:      s.w && s.l ? Math.round(s.w * s.l * 100) / 100 : null,
    window_count: s.windows ?? 0,
    door_count:   s.doors   ?? 0,
    sort_order:   i,
  }));
  const { data, error } = await sb.from('survey_entries').insert(rows).select();
  if (error) { console.error('survey_entries error:', error.message); process.exit(1); }
  return data;
}

const entrKovacs = await addSections(sKovacs.id, A, [
  { name: 'Fürdőszoba',  w: 2.8,  l: 1.9,  h: 2.7, windows: 1, doors: 1, description: 'Burkolás + csaptelep csere. Meglévő kád bontandó, zuhanyzó beépítése. Radiátor is cserélendő.' },
  { name: 'Konyha',      w: 4.2,  l: 3.1,  h: 2.7, windows: 1, doors: 1, description: 'Teljes konyhabútor csere. Ügyfél saját konyhát hoz. Villany + vízszerelés szükséges. Csempézés 1,2 m-ig.' },
  { name: 'Nappali',     w: 5.8,  l: 4.3,  h: 2.8, windows: 2, doors: 1, description: 'Festés, parketta csere. Álmennyezet spotlámpa kiépítéssel (12 pont).' },
  { name: 'Háló',        w: 3.9,  l: 3.2,  h: 2.8, windows: 1, doors: 1, description: 'Festés, szőnyeg elbontás + parketta lerakás.' },
  { name: 'WC',          w: 1.4,  l: 1.2,  h: 2.7, windows: 0, doors: 1, description: 'Teljes csempézés, WC csere, mosdókagyló csere.' },
]);

const entrSzabo = await addSections(sSzabo.id, A, [
  { name: 'Előszoba', w: 2.1, l: 1.8, h: 2.6, windows: 0, doors: 2, description: 'Burkolat csere, ajtó csere.' },
  { name: 'Fürdőszoba', w: 2.4, l: 1.6, h: 2.6, windows: 1, doors: 1, description: 'Komplett szaniter + burkolat felújítás. WC, kád, csapok, csempék cserélendők.' },
  { name: 'WC', w: 1.2, l: 1.0, h: 2.6, windows: 0, doors: 1, description: 'WC csere + falicsempe.' },
]);

const entrNagy = await addSections(sNagy.id, B, [
  { name: 'Konyha',      w: 3.8, l: 2.9, h: 2.6, windows: 1, doors: 1, description: 'Ügyfél hoz kész konyhát (IKEA). Villany + víz bekötés, csempézés hátfalra.' },
  { name: 'Fürdőszoba',  w: 2.2, l: 1.7, h: 2.6, windows: 0, doors: 1, description: 'Zuhanytálca + csempézés. Meglévő kád bontás ügyfél csinálja.' },
  { name: 'Előszoba',    w: 1.9, l: 1.5, h: 2.6, windows: 0, doors: 2, description: 'Járólap csere.' },
]);

const entrToth = await addSections(sToth.id, C, [
  { name: 'Konyha',          w: 3.5, l: 2.8, h: 2.5, windows: 1, doors: 1, description: 'Teljes konyha felújítás, ügyfél saját bútor. Csempe + villanymunkák.' },
  { name: 'Nappali/Étkező',  w: 6.1, l: 4.8, h: 2.5, windows: 3, doors: 2, description: 'Festés 2 réteg, padló polírozás, mennyezeti lámpa csere.' },
  { name: 'Fürdőszoba',      w: 2.3, l: 1.8, h: 2.5, windows: 1, doors: 1, description: 'Zuhanyzó + csaptelep, burkolat teljesen új.' },
  { name: 'Terasz',          w: 4.2, l: 2.1, h: 0,   windows: 0, doors: 1, description: 'Kültéri járólap, 8,82 m². Fagymentes anyag szükséges.' },
]);

const entrKakavis = await addSections(sKakavis.id, A, [
  { name: 'Fürdőszoba A',    w: 3.2, l: 2.4, h: 3.1, windows: 1, doors: 1, description: 'Luxus burkolat, márványhatású nagy formátum (80×80). Rain shower, szabadon álló kád.' },
  { name: 'Fürdőszoba B',    w: 2.8, l: 2.0, h: 3.1, windows: 0, doors: 1, description: 'Vendég fürdő. Fali WC, beépített tároló, backlit tükör.' },
  { name: 'WC',              w: 1.5, l: 1.2, h: 3.1, windows: 0, doors: 1, description: 'Fali WC, öntöde csempe, push-to-open szekrény.' },
  { name: 'Konyha',          w: 5.4, l: 4.1, h: 3.1, windows: 2, doors: 1, description: 'Sziget kialakítás, gránit munkalap, Bora főzőlap a pulton. Rejtett elszívó.' },
  { name: 'Nappali/Étkező',  w: 8.2, l: 6.0, h: 3.1, windows: 4, doors: 2, description: 'Álmennyezet feszített PVC-vel. 20 pont spotlámpa, indirekt LED sárga szegély. Herringbone parketta.' },
]);

const entrIroda = await addSections(sIroda.id, B, [
  { name: 'Recepció',     w: 4.5, l: 3.8, h: 3.0, windows: 2, doors: 2, description: 'Gipszkarton tároló fal + céglogó háttér (üveg). Vinyl padló.' },
  { name: 'Tárgyaló',     w: 5.2, l: 4.0, h: 3.0, windows: 2, doors: 1, description: 'Akusztikus mennyezet panel, festés, szőnyegpadló. Kivetítő kialakítás.' },
  { name: 'Irodatér',     w: 9.8, l: 7.2, h: 3.0, windows: 6, doors: 2, description: '24 íróasztal, nyitott tér. Gipszkarton osztófalak (2 db), vinyl padló, LED világítás cserével.' },
  { name: 'Konyhasarok',  w: 2.4, l: 2.0, h: 3.0, windows: 1, doors: 0, description: 'Kis konyhabútor bekötés, csempe 1 m-ig, vinyl padló.' },
  { name: 'Mosdó',        w: 2.0, l: 1.8, h: 3.0, windows: 0, doors: 1, description: 'Csempézés, 2 mosdókagyló, tükör, szárítókézi.' },
]);

const entrKiss = await addSections(sKiss.id, A, [
  { name: 'Nappali',     w: 4.8, l: 3.6, h: 2.7, windows: 2, doors: 2, description: 'Festés 2 réteg fehér, parketta csiszolás + lakkozás.' },
  { name: 'Fürdőszoba',  w: 2.0, l: 1.5, h: 2.7, windows: 0, doors: 1, description: 'Komplett csempe csere, WC + mosdó csere, csaptelep.' },
  { name: 'Konyha',      w: 3.2, l: 2.4, h: 2.7, windows: 1, doors: 1, description: 'Festés, csempe hátfal, mosogató csere. Bútor marad.' },
  { name: 'Előszoba',    w: 1.8, l: 1.4, h: 2.7, windows: 0, doors: 3, description: 'Festés, járólap csere.' },
]);

console.log(`  Entries created for all 7 surveys`);

// ── 6. Survey entry items (tételek) ──────────────────────────────────────────

console.log('\n━━ Survey entry items (tételek) ━━');

async function addItems(surveyId, entryId, ownerId, items) {
  const rows = items.map((it, i) => ({
    survey_id:    surveyId,
    entry_id:     entryId,
    owner_id:     ownerId,
    created_by:   ownerId,
    description:  it.desc,
    quantity:     it.qty   ?? null,
    unit:         it.unit  ?? null,
    entry_type:   it.type  ?? 'labour',
    source:       it.src   ?? 'user_note',
    is_confirmed: it.confirmed ?? true,
    sort_order:   i,
  }));
  const { error } = await sb.from('survey_entry_items').insert(rows);
  if (error) console.error('  items error:', error.message);
}

// Kovács – Fürdőszoba
await addItems(sKovacs.id, entrKovacs[0].id, A, [
  { desc: 'Burkolat bontás',            qty: 7.6,  unit: 'm²',  type: 'labour' },
  { desc: 'Falicsempe lerakás',          qty: 15.2, unit: 'm²',  type: 'labour' },
  { desc: 'Padlócsempe lerakás',         qty: 5.3,  unit: 'm²',  type: 'labour' },
  { desc: 'Csaptelep csere (zuhanyzó)',   qty: 1,    unit: 'db',  type: 'material' },
  { desc: 'Zuhanytálca beépítés',        qty: 1,    unit: 'db',  type: 'labour' },
  { desc: 'Radiátor csere',              qty: 1,    unit: 'db',  type: 'material' },
  { desc: 'Fugázás',                     qty: 20.5, unit: 'm²',  type: 'labour' },
]);

// Kovács – Konyha
await addItems(sKovacs.id, entrKovacs[1].id, A, [
  { desc: 'Csempézés hátfal (1,2 m-ig)', qty: 5.0,  unit: 'm²',  type: 'labour' },
  { desc: 'Járólap lerakás',             qty: 13.0, unit: 'm²',  type: 'labour' },
  { desc: 'Villanyszerelés (4 körös)',   qty: 1,    unit: 'átalány', type: 'labour' },
  { desc: 'Vízszerelés bekötés',         qty: 1,    unit: 'átalány', type: 'labour' },
  { desc: 'Ízlés szerint konyhapult',    qty: 3.2,  unit: 'fm',  type: 'material', src: 'ai_suggestion', confirmed: false },
]);

// Kovács – Nappali
await addItems(sKovacs.id, entrKovacs[2].id, A, [
  { desc: 'Festés (alapozó + 2 réteg)',  qty: 77.0, unit: 'm²',  type: 'labour' },
  { desc: 'Parketta lerakás',            qty: 24.9, unit: 'm²',  type: 'labour' },
  { desc: 'Álmennyezet gipszkarton',     qty: 24.9, unit: 'm²',  type: 'labour' },
  { desc: 'Spotlámpa beépítés (12 db)', qty: 12,   unit: 'db',  type: 'labour' },
]);

// Kovács – WC
await addItems(sKovacs.id, entrKovacs[4].id, A, [
  { desc: 'Falicsempe',  qty: 6.7,  unit: 'm²',  type: 'labour' },
  { desc: 'Padlócsempe', qty: 1.7,  unit: 'm²',  type: 'labour' },
  { desc: 'WC csoport csere', qty: 1, unit: 'db', type: 'material' },
  { desc: 'Mosdókagyló + csap', qty: 1, unit: 'db', type: 'material' },
]);

// Szabó – Fürdőszoba
await addItems(sSzabo.id, entrSzabo[1].id, A, [
  { desc: 'Komplett burkolat bontás',    qty: 11.5, unit: 'm²',  type: 'labour' },
  { desc: 'Falicsempe lerakás',          qty: 11.5, unit: 'm²',  type: 'labour' },
  { desc: 'Kád eltávolítás, zuhanytálca', qty: 1,  unit: 'db',  type: 'labour' },
  { desc: 'Csaptelep csere',             qty: 1,    unit: 'db',  type: 'material' },
  { desc: 'Mosógép bekötés',             qty: 1,    unit: 'db',  type: 'labour' },
]);

// Kakavis – Fürdőszoba A (luxus)
await addItems(sKakavis.id, entrKakavis[0].id, A, [
  { desc: 'Nagy formátumú burkolat (80×80) – anyag', qty: 8.5, unit: 'm²', type: 'material' },
  { desc: 'Márványhatású burkolat lerakás',           qty: 8.5, unit: 'm²', type: 'labour' },
  { desc: 'Rain shower rendszer',                    qty: 1,   unit: 'db', type: 'material' },
  { desc: 'Szabadon álló kád',                       qty: 1,   unit: 'db', type: 'material' },
  { desc: 'Szaniter installálás',                    qty: 1,   unit: 'átalány', type: 'labour' },
  { desc: 'Fali WC + Geberit keret',                 qty: 1,   unit: 'db', type: 'material' },
  { desc: 'Backlit tükör (120×80)',                  qty: 1,   unit: 'db', type: 'material' },
]);

// Kakavis – Konyha
await addItems(sKakavis.id, entrKakavis[3].id, A, [
  { desc: 'Gránit munkalap (3 fm)',      qty: 3.0,  unit: 'fm',  type: 'material' },
  { desc: 'Munkalap beépítés',           qty: 3.0,  unit: 'fm',  type: 'labour'   },
  { desc: 'Bora főzőlap beszerelés',     qty: 1,    unit: 'db',  type: 'labour'   },
  { desc: 'Rejtett elszívó kialakítás',  qty: 1,    unit: 'átalány', type: 'labour' },
  { desc: 'Csempézés (hátfal)',          qty: 8.1,  unit: 'm²',  type: 'labour'   },
  { desc: 'Villanyszerelés (sziget)',    qty: 1,    unit: 'átalány', type: 'labour' },
]);

// Iroda – Irodatér
await addItems(sIroda.id, entrIroda[2].id, B, [
  { desc: 'Gipszkarton osztófal (2×3m)', qty: 2,    unit: 'db',  type: 'labour'   },
  { desc: 'Vinyl padló lerakás',         qty: 70.6, unit: 'm²',  type: 'labour'   },
  { desc: 'LED lámpasor csere',          qty: 24,   unit: 'db',  type: 'material' },
  { desc: 'Festés',                      qty: 149.0, unit: 'm²', type: 'labour'   },
]);

// Kiss – Nappali
await addItems(sKiss.id, entrKiss[0].id, A, [
  { desc: 'Festés (alapozó + 2 réteg fehér)', qty: 38.3, unit: 'm²', type: 'labour'   },
  { desc: 'Parketta csiszolás + lakkozás',    qty: 17.3, unit: 'm²', type: 'labour'   },
  { desc: 'Mennyezeti lámpacsere',            qty: 2,    unit: 'db', type: 'material' },
  { desc: 'Gitt + csiszolás falak',           qty: 38.3, unit: 'm²', type: 'labour',  src: 'ai_suggestion', confirmed: false },
]);

// Kiss – Fürdőszoba
await addItems(sKiss.id, entrKiss[1].id, A, [
  { desc: 'Csempe bontás + lerakás',     qty: 9.0,  unit: 'm²',  type: 'labour'   },
  { desc: 'WC + tartály csere',          qty: 1,    unit: 'db',  type: 'material' },
  { desc: 'Mosdó + csap csere',          qty: 1,    unit: 'db',  type: 'material' },
  { desc: 'Szilikon fugázás',            qty: 9.0,  unit: 'm²',  type: 'labour'   },
]);

// Kiss – Konyha
await addItems(sKiss.id, entrKiss[2].id, A, [
  { desc: 'Festés (1 réteg)',     qty: 21.4, unit: 'm²', type: 'labour' },
  { desc: 'Csempe hátfal csere',  qty: 2.8,  unit: 'm²', type: 'labour' },
  { desc: 'Mosogató csere + bekötés', qty: 1, unit: 'db', type: 'labour' },
]);

// Kiss – Előszoba
await addItems(sKiss.id, entrKiss[3].id, A, [
  { desc: 'Festés',          qty: 13.6, unit: 'm²', type: 'labour' },
  { desc: 'Járólap csere',   qty: 2.5,  unit: 'm²', type: 'labour' },
]);

// Nagy Katalin – Konyha
await addItems(sNagy.id, entrNagy[0].id, B, [
  { desc: 'Villany + víz bekötés (IKEA)', qty: 1,   unit: 'átalány', type: 'labour' },
  { desc: 'Csempézés hátfal',             qty: 3.8, unit: 'm²',  type: 'labour'   },
  { desc: 'Padlóburkolat lerakás',        qty: 11.0, unit: 'm²', type: 'labour'   },
]);

console.log(`  Tételek created`);

// ── 7. Survey media (photos + layout) ────────────────────────────────────────

console.log('\n━━ Survey media ━━');

const photos = {
  bathroom:    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&w=800&q=80',
  bathroom2:   'https://images.unsplash.com/photo-1543489822-c49534f3271f?auto=format&w=800&q=80',
  kitchen:     'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&w=800&q=80',
  kitchen2:    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&w=800&q=80',
  livingroom:  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&w=800&q=80',
  renovation:  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&w=800&q=80',
  tiles:       'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?auto=format&w=800&q=80',
  floorplan:   'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&w=800&q=80',
  apartment:   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&w=800&q=80',
  construction:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&w=800&q=80',
  office:      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&w=800&q=80',
  luxury:      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&w=800&q=80',
};

const mediaRows = [
  // Kovács – survey-level layout + photos
  { survey_id: sKovacs.id, entry_id: null,           media_type: 'layout', mime_type: 'image/jpeg', file_name: 'alaprajz.jpg',    drive_file_id: 'mock/kovacs-layout.jpg',    drive_view_url: photos.floorplan,   thumbnail_url: photos.floorplan  },
  { survey_id: sKovacs.id, entry_id: entrKovacs[0].id, media_type: 'photo', mime_type: 'image/jpeg', file_name: 'furdoszoba1.jpg', drive_file_id: 'mock/kovacs-bath1.jpg',     drive_view_url: photos.bathroom,   thumbnail_url: photos.bathroom   },
  { survey_id: sKovacs.id, entry_id: entrKovacs[0].id, media_type: 'photo', mime_type: 'image/jpeg', file_name: 'furdoszoba2.jpg', drive_file_id: 'mock/kovacs-bath2.jpg',     drive_view_url: photos.tiles,      thumbnail_url: photos.tiles      },
  { survey_id: sKovacs.id, entry_id: entrKovacs[1].id, media_type: 'photo', mime_type: 'image/jpeg', file_name: 'konyha.jpg',     drive_file_id: 'mock/kovacs-kitchen.jpg',   drive_view_url: photos.kitchen,    thumbnail_url: photos.kitchen    },
  { survey_id: sKovacs.id, entry_id: entrKovacs[2].id, media_type: 'photo', mime_type: 'image/jpeg', file_name: 'nappali.jpg',    drive_file_id: 'mock/kovacs-living.jpg',    drive_view_url: photos.livingroom, thumbnail_url: photos.livingroom },
  // Kakavis – luxus fotók
  { survey_id: sKakavis.id, entry_id: null,              media_type: 'layout', mime_type: 'image/jpeg', file_name: 'alaprajz.jpg',   drive_file_id: 'mock/kakavis-layout.jpg',   drive_view_url: photos.floorplan,  thumbnail_url: photos.floorplan  },
  { survey_id: sKakavis.id, entry_id: entrKakavis[0].id, media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'furdo_a.jpg',    drive_file_id: 'mock/kakavis-bath-a.jpg',  drive_view_url: photos.luxury,     thumbnail_url: photos.luxury     },
  { survey_id: sKakavis.id, entry_id: entrKakavis[3].id, media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'konyha.jpg',     drive_file_id: 'mock/kakavis-kitchen.jpg', drive_view_url: photos.kitchen2,   thumbnail_url: photos.kitchen2   },
  { survey_id: sKakavis.id, entry_id: entrKakavis[4].id, media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'nappali.jpg',    drive_file_id: 'mock/kakavis-living.jpg',  drive_view_url: photos.apartment,  thumbnail_url: photos.apartment  },
  // Iroda
  { survey_id: sIroda.id, entry_id: null,            media_type: 'layout', mime_type: 'image/jpeg', file_name: 'iroda_alaprajz.jpg', drive_file_id: 'mock/iroda-layout.jpg',    drive_view_url: photos.floorplan,  thumbnail_url: photos.floorplan  },
  { survey_id: sIroda.id, entry_id: entrIroda[2].id, media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'irodater.jpg',     drive_file_id: 'mock/iroda-office.jpg',    drive_view_url: photos.office,     thumbnail_url: photos.office     },
  // Szabó
  { survey_id: sSzabo.id, entry_id: entrSzabo[1].id, media_type: 'photo', mime_type: 'image/jpeg', file_name: 'furdoszoba.jpg', drive_file_id: 'mock/szabo-bath.jpg', drive_view_url: photos.bathroom2, thumbnail_url: photos.bathroom2 },
  // Tóth
  { survey_id: sToth.id,  entry_id: entrToth[0].id,  media_type: 'photo', mime_type: 'image/jpeg', file_name: 'konyha.jpg', drive_file_id: 'mock/toth-kitchen.jpg', drive_view_url: photos.kitchen,  thumbnail_url: photos.kitchen   },
  // Kiss – alaprajz (survey-level layout, the only valid survey-level media type)
  { survey_id: sKiss.id, entry_id: null,                  media_type: 'layout', mime_type: 'image/jpeg', file_name: 'alaprajz.jpg',   drive_file_id: 'mock/kiss-layout.jpg',   drive_view_url: photos.floorplan,  thumbnail_url: photos.floorplan  },
  // Kiss – section photos
  { survey_id: sKiss.id, entry_id: null, /* filled below */ media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'nappali1.jpg',   drive_file_id: 'mock/kiss-nappali1.jpg', drive_view_url: photos.livingroom, thumbnail_url: photos.livingroom },
  { survey_id: sKiss.id, entry_id: null, /* filled below */ media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'furdoszoba.jpg', drive_file_id: 'mock/kiss-bath.jpg',     drive_view_url: photos.bathroom,   thumbnail_url: photos.bathroom   },
  { survey_id: sKiss.id, entry_id: null, /* filled below */ media_type: 'photo',  mime_type: 'image/jpeg', file_name: 'konyha.jpg',     drive_file_id: 'mock/kiss-kitchen.jpg',  drive_view_url: photos.kitchen,    thumbnail_url: photos.kitchen    },
];

const { error: mediaErr } = await sb.from('survey_media').insert(mediaRows);
if (mediaErr) console.error('  survey_media error:', mediaErr.message);
else console.log(`  ${mediaRows.length} media records created`);

// ── 8. Quotes ─────────────────────────────────────────────────────────────────

console.log('\n━━ Quotes ━━');

// User A personal – draft, NOT linked to survey
const qKovacsDraft = await isSingle('quotes', {
  owner_id: A, collective_id: null, created_by: A,
  title: '[MOCK] Kovács László – Komplex lakásfelújítás 2026',
  client_id: cKovacs.id,
  status: 'draft',
  location: 'Budapest, Pannónia utca 12.',
  work_type: 'Komplex lakásfelújítás',
  description: 'Fürdőszoba, konyha, nappali, háló teljes felújítása. Skandináv stílus.',
  start_date: '2026-06-01',
  end_date:   '2026-08-15',
}, 'quote: Kovács draft');

// User A personal – sent, linked to sSzabo
const qSzaboSent = await isSingle('quotes', {
  owner_id: A, collective_id: null, created_by: A,
  title: '[MOCK] Szabó Anna – Szaniter csere + burkolás',
  client_id: cSzabo.id,
  survey_id: sSzabo.id,
  status: 'sent',
  location: 'Budapest, Víg utca 8.',
  work_type: 'Szaniter + burkolat',
  start_date: '2026-04-07',
  end_date:   '2026-04-25',
}, 'quote: Szabó sent (linked to survey)');

// Flip Szabó survey to done
await sb.from('surveys').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', sSzabo.id);
console.log('  ↳ Szabó survey flipped to done');

// User B personal – draft, linked to sNagy
const qNagy = await isSingle('quotes', {
  owner_id: B, collective_id: null, created_by: B,
  title: '[MOCK] Nagy Katalin – Konyha + Fürdőszoba',
  client_id: cNagy.id,
  survey_id: sNagy.id,
  status: 'draft',
  work_type: 'Burkolás + konyha bekötés',
  start_date: '2026-05-12',
  end_date:   '2026-05-30',
}, 'quote: Nagy draft (linked to survey)');

// MPPM collective – sent, linked to sKakavis
const qKakavis = await isSingle('quotes', {
  owner_id: A, collective_id: cMPPM, created_by: A,
  title: '[MOCK] Kakavis House – 1. árajánlat (luxus csomag)',
  client_id: null,
  survey_id: sKakavis.id,
  status: 'sent',
  location: 'Budapest, Ilka utca 33.',
  work_type: 'Luxus lakásfelújítás',
  description: 'Teljes felújítás prémium anyagokkal. Rain shower, gránit pultok, herringbone parketta.',
  start_date: '2026-07-01',
  end_date:   '2026-11-30',
}, 'quote: Kakavis sent (MPPM)');

// Flip Kakavis survey to done
await sb.from('surveys').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', sKakavis.id);
console.log('  ↳ Kakavis survey flipped to done');

// MPPM collective – accepted, linked to sIroda → project follows
const qIroda = await isSingle('quotes', {
  owner_id: B, collective_id: cMPPM, created_by: B,
  title: '[MOCK] Renner GmbH – Irodafelújítás',
  client_id: cRenner.id,
  survey_id: sIroda.id,
  status: 'accepted',
  location: 'Budapest, Váci út 76.',
  work_type: 'Irodafelújítás',
  description: 'Gipszkarton osztófalak, vinyl padló, festés, LED csere. Éjszakai munkavégzés.',
  start_date: '2026-03-15',
  end_date:   '2026-04-30',
}, 'quote: Iroda accepted (MPPM)');

// Flip Iroda survey to done
await sb.from('surveys').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', sIroda.id);
console.log('  ↳ Iroda survey flipped to done');

// User C personal – draft (not linked)
const qKiss = await isSingle('quotes', {
  owner_id: C, collective_id: cFeluj, created_by: C,
  title: '[MOCK] Kiss Margit – Bérlemény felkészítés',
  client_id: cKiss.id,
  survey_id: sKiss.id,
  status: 'draft',
  work_type: 'Festés + csempe + parketta',
  start_date: '2026-05-01',
  end_date:   '2026-05-20',
}, 'quote: Kiss draft (Felújítók BT)');

// ── 9. Quote sections + entries ───────────────────────────────────────────────

console.log('\n━━ Quote sections + entries ━━');

async function addQuoteSection(quoteId, createdBy, name, desc, sizeM2, surveyEntryId, sortOrder) {
  const { data, error } = await sb.from('quote_sections').insert({
    quote_id:        quoteId,
    created_by:      createdBy,
    name,
    description:     desc || null,
    size_m2:         sizeM2 || null,
    survey_entry_id: surveyEntryId || null,
    sort_order:      sortOrder,
  }).select().single();
  if (error) { console.error('  quote_section err:', error.message); return null; }
  return data;
}

async function addQuoteEntries(sectionId, quoteId, userId, entries) {
  const rows = entries.map((e, i) => ({
    quote_id:         quoteId,
    section_id:       sectionId,
    user_id:          userId,
    entry_type:       e.type  || 'labour',
    work_description: e.desc,
    quantity:         e.qty   || null,
    unit:             e.unit  || null,
    unit_price:       e.price || null,
    amount_huf:       Math.max(1, e.total || (e.qty && e.price ? Math.round(e.qty * e.price) : 1000)),
    notes:            e.notes || null,
  }));
  const { error } = await sb.from('quote_entries').insert(rows);
  if (error) console.error('  quote_entries err:', error.message);
}

// ─ Kovács draft quote (manual, no survey link) ─
const qKovacsS1 = await addQuoteSection(qKovacsDraft.id, A, 'Fürdőszoba munkák', 'Burkolás, szaniter csere, zuhanyzó', 5.3, null, 0);
const qKovacsS2 = await addQuoteSection(qKovacsDraft.id, A, 'Konyha munkák', 'Csempézés, villanymunkák, bekötések', 13.0, null, 1);
const qKovacsS3 = await addQuoteSection(qKovacsDraft.id, A, 'Festés + parketta', 'Nappali, háló', 39.3, null, 2);

if (qKovacsS1) await addQuoteEntries(qKovacsS1.id, qKovacsDraft.id, A, [
  { desc: 'Burkolat bontás',         qty: 15.3, unit: 'm²',  price: 2500,  type: 'labour'   },
  { desc: 'Falicsempe lerakás',      qty: 10.2, unit: 'm²',  price: 5500,  type: 'labour'   },
  { desc: 'Padlócsempe lerakás',     qty: 5.3,  unit: 'm²',  price: 5000,  type: 'labour'   },
  { desc: 'Zuhanytálca + csap',      qty: 1,    unit: 'db',  price: 48000, type: 'material' },
  { desc: 'Radiátor (600×600)',      qty: 1,    unit: 'db',  price: 32000, type: 'material' },
]);
if (qKovacsS2) await addQuoteEntries(qKovacsS2.id, qKovacsDraft.id, A, [
  { desc: 'Csempézés hátfal',        qty: 5.0,  unit: 'm²',  price: 5500,  type: 'labour'   },
  { desc: 'Járólap lerakás',         qty: 13.0, unit: 'm²',  price: 4800,  type: 'labour'   },
  { desc: 'Villanyszerelés',         qty: 1,    unit: 'átalány', total: 95000, type: 'labour' },
  { desc: 'Vízszerelés',             qty: 1,    unit: 'átalány', total: 65000, type: 'labour' },
]);
if (qKovacsS3) await addQuoteEntries(qKovacsS3.id, qKovacsDraft.id, A, [
  { desc: 'Festés (alapozó + 2 rét)',qty: 77.0, unit: 'm²',  price: 1800,  type: 'labour'   },
  { desc: 'Parketta lerakás',        qty: 39.3, unit: 'm²',  price: 4200,  type: 'labour'   },
  { desc: 'Parketta anyag (tölgy)',  qty: 42.0, unit: 'm²',  price: 8900,  type: 'material' },
]);

// ─ Szabó sent quote (imported from survey) ─
const qSzaboS1 = await addQuoteSection(qSzaboSent.id, A, 'Fürdőszoba', null, 3.84, entrSzabo[1].id, 0);
const qSzaboS2 = await addQuoteSection(qSzaboSent.id, A, 'WC',         null, 1.2,  entrSzabo[2].id, 1);

if (qSzaboS1) await addQuoteEntries(qSzaboS1.id, qSzaboSent.id, A, [
  { desc: 'Komplett burkolat bontás', qty: 11.5, unit: 'm²',  price: 2200, type: 'labour'   },
  { desc: 'Falicsempe lerakás',       qty: 8.5,  unit: 'm²',  price: 5200, type: 'labour'   },
  { desc: 'Padlócsempe lerakás',      qty: 3.84, unit: 'm²',  price: 4800, type: 'labour'   },
  { desc: 'Zuhanytálca csere',        qty: 1,    unit: 'db', total: 52000, type: 'material' },
  { desc: 'Csaptelep csere',          qty: 1,    unit: 'db', total: 28000, type: 'material' },
  { desc: 'Mosógép bekötés',          qty: 1,    unit: 'db', total: 15000, type: 'labour'   },
]);
if (qSzaboS2) await addQuoteEntries(qSzaboS2.id, qSzaboSent.id, A, [
  { desc: 'Csempe bontás + lerakás',  qty: 5.6,  unit: 'm²',  price: 6800, type: 'labour'   },
  { desc: 'WC csoport csere',         qty: 1,    unit: 'db', total: 38000, type: 'material' },
]);

// ─ Kakavis (MPPM collective) – luxus ─
const qKakS1 = await addQuoteSection(qKakavis.id, A, 'Fürdőszoba A (luxus)', null, 7.68, entrKakavis[0].id, 0);
const qKakS2 = await addQuoteSection(qKakavis.id, A, 'Fürdőszoba B (vendég)', null, 5.6, entrKakavis[1].id, 1);
const qKakS3 = await addQuoteSection(qKakavis.id, A, 'Konyha',               null, 22.1, entrKakavis[3].id, 2);
const qKakS4 = await addQuoteSection(qKakavis.id, A, 'Nappali + étkező',      null, 49.2, entrKakavis[4].id, 3);

if (qKakS1) await addQuoteEntries(qKakS1.id, qKakavis.id, A, [
  { desc: 'Burkolat (80×80 márvány hatású)', qty: 8.5, unit: 'm²', price: 18500, type: 'material' },
  { desc: 'Burkolat lerakás nagy formátum',  qty: 8.5, unit: 'm²', price: 9800,  type: 'labour'   },
  { desc: 'Rain shower szett (Grohe)',        qty: 1,   unit: 'db', total: 285000, type: 'material' },
  { desc: 'Szabadon álló kád (Duravit)',      qty: 1,   unit: 'db', total: 420000, type: 'material' },
  { desc: 'Szaniter installálás',             qty: 1,   unit: 'átalány', total: 85000, type: 'labour' },
  { desc: 'Backlit tükör 120×80',            qty: 1,   unit: 'db', total: 78000,  type: 'material' },
]);
if (qKakS3) await addQuoteEntries(qKakS3.id, qKakavis.id, A, [
  { desc: 'Gránit munkalap (Black Pearl)', qty: 3.2, unit: 'fm', price: 68000, type: 'material' },
  { desc: 'Munkalap beépítés',            qty: 3.2, unit: 'fm', price: 12000, type: 'labour'   },
  { desc: 'Bora főzőlap beszerelés',      qty: 1,   unit: 'db', total: 45000, type: 'labour'   },
  { desc: 'Csempézés hátfal',             qty: 8.1, unit: 'm²', price: 7200,  type: 'labour'   },
  { desc: 'Villany + elszívó kialakítás', qty: 1,   unit: 'átalány', total: 120000, type: 'labour' },
]);
if (qKakS4) await addQuoteEntries(qKakS4.id, qKakavis.id, A, [
  { desc: 'Álmennyezet PVC feszített',    qty: 49.2, unit: 'm²', price: 8500,  type: 'labour'   },
  { desc: 'Spotlámpa beépítés (20 db)',   qty: 20,   unit: 'db', price: 3500,  type: 'labour'   },
  { desc: 'Indirekt LED szegély',         qty: 28.4, unit: 'fm', price: 4200,  type: 'material' },
  { desc: 'Herringbone parketta – anyag', qty: 52.0, unit: 'm²', price: 12800, type: 'material' },
  { desc: 'Parketta lerakás',             qty: 49.2, unit: 'm²', price: 6500,  type: 'labour'   },
]);

// ─ Iroda (MPPM collective) – accepted ─
const qIrS1 = await addQuoteSection(qIroda.id, B, 'Recepció',    null, 17.1, entrIroda[0].id, 0);
const qIrS2 = await addQuoteSection(qIroda.id, B, 'Tárgyaló',   null, 20.8, entrIroda[1].id, 1);
const qIrS3 = await addQuoteSection(qIroda.id, B, 'Irodatér',   null, 70.6, entrIroda[2].id, 2);
const qIrS4 = await addQuoteSection(qIroda.id, B, 'Konyhasarok', null, 4.8, entrIroda[3].id, 3);

if (qIrS3) await addQuoteEntries(qIrS3.id, qIroda.id, B, [
  { desc: 'Gipszkarton osztófal',       qty: 2,    unit: 'db',  total: 85000, type: 'labour'   },
  { desc: 'Vinyl padló lerakás',        qty: 70.6, unit: 'm²',  price: 3800,  type: 'labour'   },
  { desc: 'Vinyl padló anyag',          qty: 75.0, unit: 'm²',  price: 4200,  type: 'material' },
  { desc: 'LED csere',                  qty: 24,   unit: 'db',  price: 8500,  type: 'material' },
  { desc: 'Festés',                     qty: 149.0, unit: 'm²', price: 1600,  type: 'labour'   },
]);

console.log('  Quote sections + entries created');

// ── 10. Projects ──────────────────────────────────────────────────────────────

console.log('\n━━ Projects ━━');

// User A personal – linked to Szabó sent quote
const pSzabo = await isSingle('projects', {
  owner_id: A, collective_id: null, created_by: A,
  name: '[MOCK] Szabó Anna – Szaniter kivitelezés 2026',
  description: 'Fürdőszoba és WC komplett felújítás. Munka közbeni visszajelzés ügyfélnek a portálon.',
  start_date: '2026-04-07',
  end_date:   '2026-04-25',
}, 'project: Szabó (User A personal)');

// User C personal
const pToth = await isSingle('projects', {
  owner_id: C, collective_id: null, created_by: C,
  name: '[MOCK] Tóth nyaraló projekt',
  description: 'Nyaralóba május 1. előtt kész kell lenni. Konyha + fürdőszoba + terasz.',
  start_date: '2026-04-14',
  end_date:   '2026-04-30',
}, 'project: Tóth nyaraló (User C)');

// MPPM collective – linked to Iroda accepted quote
const pIroda = await isSingle('projects', {
  owner_id: B, collective_id: cMPPM, created_by: B,
  name: '[MOCK] Renner iroda – kivitelezés',
  description: 'Éjszakai munkavégzés. Renner GmbH jóváhagyta az árajánlatot. Minden anyag megrendelve.',
  start_date: '2026-03-15',
  end_date:   '2026-04-30',
}, 'project: Iroda (MPPM collective)');

// Felújítók BT – Kiss Margit
const pKiss = await isSingle('projects', {
  owner_id: A, collective_id: cFeluj, created_by: A,
  name: '[MOCK] Kiss Margit bérlemény felkészítés',
  description: 'Kiadásra készítés. Gyors munka, 3 hét alatt kész kell legyen.',
  start_date: '2026-05-01',
  end_date:   '2026-05-20',
}, 'project: Kiss Margit (Felújítók BT)');

// ── 11. Labour entries + invoices ─────────────────────────────────────────────

console.log('\n━━ Labour entries ━━');

const { error: labErr } = await sb.from('labour_entries').insert([
  // Szabó project — uploaded_by = user UUID, date, value_huf = hours × rate
  { project_id: pSzabo.id, uploaded_by: A, labour_type: 'Burkolóipari munka', hours: 8,  hourly_rate: 6500, value_huf: 52000, date: '2026-04-07', description: 'Bontás + alap előkészítés', unit: 'h' },
  { project_id: pSzabo.id, uploaded_by: A, labour_type: 'Burkolóipari munka', hours: 8,  hourly_rate: 6500, value_huf: 52000, date: '2026-04-08', description: 'Falicsempe első nap',        unit: 'h' },
  { project_id: pSzabo.id, uploaded_by: A, labour_type: 'Szaniter szerelés',  hours: 6,  hourly_rate: 7500, value_huf: 45000, date: '2026-04-14', description: 'Zuhanytálca + csaptelep',   unit: 'h' },
  // Iroda project (MPPM)
  { project_id: pIroda.id, uploaded_by: B, labour_type: 'Gipszkarton',       hours: 12, hourly_rate: 7000, value_huf: 84000,  date: '2026-03-15', description: 'Osztófalak (éjszaka)',  unit: 'h' },
  { project_id: pIroda.id, uploaded_by: B, labour_type: 'Vinyl padló',        hours: 16, hourly_rate: 5500, value_huf: 88000,  date: '2026-03-17', description: '2 éjszaka, irodatér', unit: 'h' },
  { project_id: pIroda.id, uploaded_by: C, labour_type: 'Festés',             hours: 14, hourly_rate: 4800, value_huf: 67200,  date: '2026-03-20', description: 'Recepció + tárgyaló', unit: 'h' },
  { project_id: pIroda.id, uploaded_by: B, labour_type: 'Villanyszerelés',    hours: 8,  hourly_rate: 8500, value_huf: 68000,  date: '2026-03-22', description: 'LED + konyhasarok',   unit: 'h' },
  // Tóth project
  { project_id: pToth.id,  uploaded_by: C, labour_type: 'Burkolóipari munka', hours: 10, hourly_rate: 5800, value_huf: 58000,  date: '2026-04-14', description: 'Fürdő bontás + csempézés', unit: 'h' },
  { project_id: pToth.id,  uploaded_by: C, labour_type: 'Festés',             hours: 8,  hourly_rate: 4500, value_huf: 36000,  date: '2026-04-18', description: 'Nappali festés',           unit: 'h' },
]);
if (labErr) console.error('  labour_entries err:', labErr.message);
else console.log('  Labour entries created');

console.log('\n━━ Invoices (material costs) ━━');

// invoices use: uploaded_by, value_huf, category, description, image_url, storage_path
const invRows = [
  { project_id: pSzabo.id, uploaded_by: A, value_huf: 48500,  description: 'Zuhanytálca + csaptelep (OBI)',     category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pSzabo.id, uploaded_by: A, value_huf: 36200,  description: 'Falicsempe 15 m² (Hornbach)',       category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pSzabo.id, uploaded_by: A, value_huf: 8500,   description: 'Fugázó, szilikon, alapozó',        category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pIroda.id, uploaded_by: B, value_huf: 315000, description: 'Vinyl padló anyag (75 m² Gerflor)', category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pIroda.id, uploaded_by: B, value_huf: 204000, description: 'LED lámpasor 24 db (Trilux)',      category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pIroda.id, uploaded_by: B, value_huf: 185000, description: 'Gipszkarton alapanyag + profil',  category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pIroda.id, uploaded_by: B, value_huf: 42000,  description: 'Szerszámszállítás (kétszer)',      category: 'Szállítás', image_url: '', storage_path: '' },
  { project_id: pToth.id,  uploaded_by: C, value_huf: 52000,  description: 'Fürdőszoba csempe (18 m²)',        category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pToth.id,  uploaded_by: C, value_huf: 28000,  description: 'Terasz kültéri járólap',           category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pToth.id,  uploaded_by: C, value_huf: 15000,  description: 'Festék (15 l fehér + alapozó)',    category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pKiss.id,  uploaded_by: A, value_huf: 22000,  description: 'Fürdőszoba csempe 9 m²',           category: 'Anyag',     image_url: '', storage_path: '' },
  { project_id: pKiss.id,  uploaded_by: A, value_huf: 18500,  description: 'Festék + alapozó (két szoba)',     category: 'Anyag',     image_url: '', storage_path: '' },
];
const { error: invErr } = await sb.from('invoices').insert(invRows);
if (invErr) console.error('  invoices err:', invErr.message);
else console.log('  Invoices created');

// ── Done ─────────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Mock data seeded successfully!\n');
console.log('Collectives:');
console.log(`  MPPM Épülettechnika Kft.  → ${cMPPM}`);
console.log(`  Felújítók BT.             → ${cFeluj}`);
console.log('\nSurveys (7 total, 3 flipped to done):');
console.log(`  Kovács lakás (A personal, active)  → ${sKovacs.id}`);
console.log(`  Szabó ház    (A personal, done)    → ${sSzabo.id}`);
console.log(`  Nagy Katalin (B personal, active)  → ${sNagy.id}`);
console.log(`  Tóth nyaraló (C personal, active)  → ${sToth.id}`);
console.log(`  Kakavis House (MPPM, done)         → ${sKakavis.id}`);
console.log(`  Irodafelújítás (MPPM, done)        → ${sIroda.id}`);
console.log(`  Kiss Margit (Felújítók BT, active) → ${sKiss.id}`);
console.log('\nQuotes (6): 2 draft, 2 sent, 1 accepted');
console.log('\nProjects (4): all open');
console.log('\nTo remove all mock data, delete records where name/title starts with "[MOCK]"');
