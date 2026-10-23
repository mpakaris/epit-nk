import { createAdminClient } from '@/lib/supabase/admin';

const fmtN = n => (n != null ? String(n).replace('.', ',') : null);

function formatRoom(e) {
  const parts = [];
  if (e.width_m && e.length_m) parts.push(`${fmtN(e.width_m)}×${fmtN(e.length_m)}m`);
  if (e.height_m) parts.push(`${fmtN(e.height_m)}m magas`);
  if (e.door_count > 0) parts.push(`${e.door_count} ajtó`);
  if (e.window_count > 0) parts.push(`${e.window_count} ablak`);
  const dims = parts.length ? ` (${parts.join(', ')})` : '';
  const desc = e.description ? ` — megjegyzés: "${e.description}"` : '';
  return `    - ${e.name}${dims}${desc}`;
}

export async function buildAgentContext(account, conversation) {
  const admin        = createAdminClient();
  const userId       = account.userId;
  const collectiveId = conversation.workspace_chosen
    ? conversation.active_collective_id
    : account.collectiveId;

  const scopeFilter = collectiveId
    ? q => q.eq('collective_id', collectiveId)
    : q => q.eq('owner_id', userId).is('collective_id', null);

  const [
    { data: collectives },
    { data: personalProjects },
    { data: personalQuotes },
    { data: personalSurveys },
    { data: profile },
    { data: premiumSub },
  ] = await Promise.all([
    admin.from('collective_members')
      .select('collective:collectives(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active'),

    admin.from('projects').select('id, name, closed_at, collective_id')
      .eq('owner_id', userId).is('collective_id', null).is('closed_at', null)
      .order('created_at', { ascending: false }).limit(8),

    admin.from('quotes').select('id, title, status, collective_id')
      .eq('owner_id', userId).is('collective_id', null).neq('status', 'deleted')
      .order('created_at', { ascending: false }).limit(8),

    // Personal surveys — always load regardless of active workspace; exclude done
    admin.from('surveys')
      .select('id, title, notes, location, client_id, collective_id, owner_id, created_by, created_at, status, done_at')
      .eq('owner_id', userId)
      .is('collective_id', null)
      .is('deleted_at', null)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(8),

    // Profile (email, subscription info)
    admin.from('profiles')
      .select('display_name, email, subscription_tier, is_subscription_premium, trial_ends_at')
      .eq('id', userId)
      .maybeSingle(),

    // Active subscription (for renewal date)
    admin.from('subscriptions')
      .select('product_family, status, period_end')
      .eq('user_id', userId)
      .in('product_family', ['premium', 'bundle'])
      .in('status', ['active', 'trialing', 'scheduled_cancel'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Load surveys for ALL collectives the user belongs to
  const collectiveList = (collectives || []).map(m => m.collective).filter(Boolean);
  const collectiveIds  = collectiveList.map(c => c.id);
  let collectiveSurveys  = [];
  let collectiveProjects = [];
  let collectiveQuotes   = [];
  if (collectiveIds.length) {
    const [{ data: cs }, { data: cp }, { data: cq }] = await Promise.all([
      admin.from('surveys')
        .select('id, title, notes, location, client_id, collective_id, owner_id, created_by, created_at, status, done_at')
        .in('collective_id', collectiveIds)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(24),
      admin.from('projects').select('id, name, collective_id')
        .in('collective_id', collectiveIds).is('closed_at', null)
        .order('created_at', { ascending: false }).limit(20),
      admin.from('quotes').select('id, title, status, collective_id')
        .in('collective_id', collectiveIds).neq('status', 'deleted')
        .order('created_at', { ascending: false }).limit(20),
    ]);
    collectiveSurveys  = cs || [];
    collectiveProjects = cp || [];
    collectiveQuotes   = cq || [];
  }

  // All surveys combined for entry/layout/client loading
  const surveys = [...(personalSurveys || []), ...collectiveSurveys];

  // Load client names for surveys that have a client_id
  const clientIds = [...new Set((surveys || []).map(s => s.client_id).filter(Boolean))];
  let clientMap = {};
  if (clientIds.length) {
    const { data: clients } = await admin.from('clients')
      .select('id, name')
      .in('id', clientIds);
    for (const c of clients || []) clientMap[c.id] = c.name;
  }

  // Load display names for survey creators
  const creatorIds = [...new Set((surveys || []).map(s => s.created_by).filter(Boolean))];
  let creatorMap = {};
  if (creatorIds.length) {
    const { data: profiles } = await admin.from('profiles')
      .select('id, display_name')
      .in('id', creatorIds);
    for (const p of profiles || []) creatorMap[p.id] = p.display_name;
  }

  // Load layout counts per survey (survey_media with media_type='layout')
  const surveyIds = (surveys || []).map(s => s.id);
  let layoutCountMap = {};
  if (surveyIds.length) {
    const { data: layoutRows } = await admin.from('survey_media')
      .select('survey_id')
      .in('survey_id', surveyIds)
      .eq('media_type', 'layout');
    for (const r of layoutRows || []) {
      layoutCountMap[r.survey_id] = (layoutCountMap[r.survey_id] || 0) + 1;
    }
  }
  let entries = [];
  if (surveyIds.length) {
    const { data: e } = await admin.from('survey_entries')
      .select('id, survey_id, name, width_m, length_m, height_m, door_count, window_count, description')
      .in('survey_id', surveyIds)
      .order('created_at', { ascending: true });
    entries = e || [];
  }

  // Group entries by survey_id
  const entriesBySurvey = {};
  for (const e of entries) {
    if (!entriesBySurvey[e.survey_id]) entriesBySurvey[e.survey_id] = [];
    entriesBySurvey[e.survey_id].push(e);
  }

  const activeWorkspaceName = collectiveId
    ? (collectives || []).find(m => m.collective?.id === collectiveId)?.collective?.name || 'Kollektíva'
    : 'Személyes';

  const allProjectsEarly = [...(personalProjects || []), ...collectiveProjects];
  const activeSurvey  = (surveys || []).find(s => s.id === conversation.active_survey_id);
  const activeProject = allProjectsEarly.find(p => p.id === conversation.active_project_id);

  // Subscription info string
  const tierLabel = { basic: 'Ingyenes (Basic)', trial: 'Trial (ingyenes próbaidőszak)', premium: 'Prémium' };
  const subTier   = profile?.subscription_tier || 'basic';
  let subLine     = tierLabel[subTier] || subTier;
  if (subTier === 'trial' && profile?.trial_ends_at) {
    subLine += ` — lejár: ${profile.trial_ends_at.slice(0, 10)}`;
  } else if (premiumSub?.period_end) {
    const label = premiumSub.status === 'scheduled_cancel' ? 'lejár' : 'megújul';
    subLine += ` — ${label}: ${premiumSub.period_end.slice(0, 10)}`;
  }

  // Build system prompt
  const lines = [
    'Te Whinself vagy — az OkosSzaki (Epitek) WhatsApp asszisztense.',
    'Az OkosSzaki egy alkalmazás magyar szakembereknek: felmérések, árajánlatok, projektek.',
    'Felmérés státuszok: active=folyamatban, reopened=újranyitva (volt lezárva, de pótmunka miatt újra szerkesztik). A lezárt (done) felmérések nem jelennek meg itt — a felhasználó az alkalmazásban láthatja őket.',
    '',
    `Felhasználó: ${account.displayName}`,
    `Aktív fiók: ${activeWorkspaceName}`,
    `Mai dátum: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '=== Fiókadatok ===',
    `Email: ${profile?.email || '(ismeretlen)'}`,
    `Előfizetés: ${subLine}`,
    '',
    '=== Általános mód (fiókválasztás nélkül is megválaszolható) ===',
    'Ha a felhasználó fiókadatokat kér (pl. "Ki vagyok én?", "Mi az email-em?", "Mikor újul meg az előfizetésem?"), válaszolj a fenti Fiókadatok alapján — NEM kell fiókot kérni.',
    'Ha a felhasználó MINDEN fiókból kér összesítőt (pl. "Listázz minden dokumentumot"), a lenti felmérés/projekt/árajánlat listákból válaszolj — NEM kell fiókot kérni.',
    'Fiókot csak akkor kérj, ha egy konkrét fiókon belüli ÍRÁSI műveletet kell elvégezni (pl. helyiség hozzáadása, fotó csatolása), és nem egyértelmű, hogy melyik fiókba kerüljön.',
    '',
    '=== WhatsApp-on NEM lehetséges ===',
    'Az alábbiak biztonsági okokból KIZÁRÓLAG az alkalmazásban végezhetők el — WhatsApp-on keresztül nem:',
    '- Személyes adatok (név, email) módosítása vagy törlése',
    '- Előfizetés módosítása, lemondása, megújítása',
    '- Jelszó módosítása',
    '- Felhasználói fiók törlése',
    'Ha ilyet kér: "❌ Ez csak az OkosSzaki alkalmazásban lehetséges."',
    '',
    '=== Képességek kérdésnél ===',
    'Ha a felhasználó azt kérdezi, hogy mit tud ez a bot, mit lehet csinálni, milyen funkciók érhetők el (pl. "Mit tudsz?", "Mire jó ez?", "Mit csinálhatok itt?", "Segítesz valamiben?"), válaszolj ezzel a sablonnal — szó szerint, pontosan így formázva:',
    '',
    'Szia! 👋 Ezeket tudom segíteni WhatsApp-on:',
    '',
    '*📋 Felmérések*',
    '• Felméréseid listázása (minden fiókból)',
    '• Helyiség hozzáadása felméréshez',
    '• Méretek, ajtók, ablakok rögzítése',
    '• Megjegyzés fűzése helyiséghez vagy felméréshez',
    '• Fotók csatolása (képet küldj, megmondom hova kerül)',
    '',
    '*🔨 Projektek & 💼 Árajánlatok*',
    '• Listázás, keresés cím/kulcsszó alapján',
    '',
    '*👤 Fiókadatok*',
    '• Profil megtekintése (név, email)',
    '• Előfizetés állapota és megújulás dátuma',
    '',
    '*🔍 Keresés*',
    '• Kulcsszó keresés minden dokumentumban, minden fiókban',
    '',
    '❌ *Amit NEM tudok:* adatmódosítás, törlés, jelszócsere, előfizetés kezelés — ezek csak az alkalmazásban lehetségesek.',
    '',
    '❓ Miben segíthetek?',
    '',
  ];

  if (activeSurvey) {
    lines.push(`Aktív felmérés: "${activeSurvey.title}" (id: ${activeSurvey.id})`);
  } else {
    lines.push('Aktív felmérés: nincs');
  }
  if (activeProject) {
    lines.push(`Aktív projekt: "${activeProject.name}" (id: ${activeProject.id})`);
  } else {
    lines.push('Aktív projekt: nincs');
  }
  lines.push('');

  // Current working context
  const hasCtx = conversation.current_document_id;
  if (hasCtx) {
    const ageMin = conversation.current_context_set_at
      ? Math.round((Date.now() - new Date(conversation.current_context_set_at).getTime()) / 60_000)
      : null;
    const ageStr = ageMin !== null ? ` (beállítva: ${ageMin} perce)` : '';
    lines.push('=== Aktuális munkakontextus ===');
    lines.push(`Dokumentum: "${conversation.current_document_name}" (${conversation.current_document_type}, id: ${conversation.current_document_id})${ageStr}`);
    if (conversation.current_area) lines.push(`Terület/Helyiség: ${conversation.current_area}${conversation.current_area_id ? ` (id: ${conversation.current_area_id})` : ''}`);
    lines.push('');
  } else {
    lines.push('=== Aktuális munkakontextus ===');
    lines.push('(nincs beállítva — az első művelet után automatikusan beállítódik)');
    lines.push('');
  }

  // Documents section — all types grouped by workspace
  lines.push('=== Dokumentumok (fiókonként) ===');

  const workspaces = [
    {
      label:    'Személyes',
      surveys:  personalSurveys  || [],
      projects: personalProjects || [],
      quotes:   personalQuotes   || [],
    },
    ...collectiveList.map(c => ({
      label:    c.name,
      collectiveId: c.id,
      surveys:  collectiveSurveys .filter(s => s.collective_id === c.id),
      projects: collectiveProjects.filter(p => p.collective_id === c.id),
      quotes:   collectiveQuotes  .filter(q => q.collective_id === c.id),
    })),
  ];

  for (const ws of workspaces) {
    const total = ws.surveys.length + ws.quotes.length + ws.projects.length;
    lines.push(`--- ${ws.label}${total === 0 ? ' (üres)' : ''} ---`);

    if (ws.surveys.length) {
      lines.push('  Felmérések:');
      ws.surveys.forEach((s, i) => {
        const rooms       = entriesBySurvey[s.id] || [];
        const clientName  = s.client_id ? clientMap[s.client_id] : null;
        const layoutCount = layoutCountMap[s.id] || 0;
        const creatorName = s.created_by ? (creatorMap[s.created_by] || s.created_by) : null;
        const isActive    = s.id === conversation.active_survey_id;
        lines.push(`  ${i + 1}. ${s.title} (id: ${s.id})`);
        if (s.location)   lines.push(`     Helyszín: ${s.location}`);
        lines.push(`     Ügyfél: ${clientName ? clientName : '(nincs)'}`);
        if (creatorName)  lines.push(`     Létrehozta: ${creatorName}`);
        if (s.created_at) lines.push(`     Létrehozva: ${s.created_at.slice(0, 10)}`);
        lines.push(`     Alaprajz: ${layoutCount > 0 ? `${layoutCount} db` : '(nincs)'}`);
        if (s.notes)      lines.push(`     Megjegyzések: ${s.notes.slice(0, 200)}${s.notes.length > 200 ? '…' : ''}`);
        if (rooms.length) {
          if (isActive) {
            lines.push(`     Helyiségek (${rooms.length}):`);
            for (const r of rooms) lines.push(formatRoom(r));
          } else {
            lines.push(`     Helyiségek (${rooms.length}): ${rooms.map(r => r.name).join(', ')}`);
          }
        } else {
          lines.push('     Helyiségek: (még nincs)');
        }
      });
    }

    if (ws.quotes.length) {
      lines.push('  Árajánlatok:');
      ws.quotes.forEach((q, i) => lines.push(`  ${i + 1}. ${q.title} (id: ${q.id}, státusz: ${q.status})`));
    }

    if (ws.projects.length) {
      lines.push('  Projektek:');
      ws.projects.forEach((p, i) => lines.push(`  ${i + 1}. ${p.name} (id: ${p.id})`));
    }
  }
  lines.push('');

  lines.push('=== Utasítások ===');
  lines.push('- MINDIG magyarul válaszolj — kivétel nélkül, függetlenül attól, hogy a felhasználó milyen nyelven ír.');
  lines.push('- Eszközökkel (tool) olvass/írj adatot; soha ne találj ki ID-t vagy adatot.');
  lines.push('- Ha hivatkozik egy felmérésre/projektre neve alapján, a fenti listából azonosítsd be az ID-t.');
  lines.push('- Ha valami nem egyértelmű, tegyél fel EGY rövid kérdést — ne sorold fel az összes lehetőséget.');
  lines.push('- Kulcsszó / téma keresés ("milyen dokumentumok...", "hol szerepel X?", "keress Y-t", "welche Dokumente..."): keresd az ÖSSZES fiókban — Személyes + minden Kollektíva.');
  lines.push('  Keresési terület: a kulcsszót keresd (1) a dokumentum NEVÉBEN/TÍTUSÁBAN, (2) a szekciók/helyiségek nevében, (3) a megjegyzésekben/notes mezőben. Ha bármelyikben megtalálható → találat.');
  lines.push('  Kötelező formátum:');
  lines.push('  Keresés: "X" — N fiók átvizsgálva');
  lines.push('  [üres sor]');
  lines.push('  --- Mein Kollektiv II --- 2 találat:');
  lines.push('  • Kakavis House — Fürdő (szekció neve)');
  lines.push('  • Ding Dong Bums — Fürdőszoba (szekció neve)');
  lines.push('  [üres sor]');
  lines.push('  --- Személyes --- 2 találat:');
  lines.push('  • Nikoek fürdőszoba renoválás (dokumentum neve)');
  lines.push('  • MPPM Consulting - WC & Fürdőszoba (dokumentum neve)');
  lines.push('  [üres sor]');
  lines.push('  --- Mein Kollektiv --- nincs találat');
  lines.push('  Szabályok: (a) MINDEN fiókot mutasd — találattal és anélkül is. (b) A találat forrását zárójelben jelöld: (dokumentum neve) / (szekció neve) / (megjegyzés). (c) NE kérdezz vissza, ha az eredmény önmagáért beszél. (d) Ikonokat ne használj a keresési eredményekben.');
  lines.push('');
  lines.push('=== Válasz formátum ===');
  lines.push('Minden műveleti válasz legyen strukturált, rövid, ikon-alapú. Prózás magyarázat TILOS.');
  lines.push('Siker minta:');
  lines.push('  📋 Felmérés: "Ding Dong Bums"');
  lines.push('  🏠 Helyiség: Konyha');
  lines.push('  ✅ Megjegyzés hozzáfűzve');
  lines.push('');
  lines.push('Hiba minta:');
  lines.push('  📋 Felmérés: "Ding Dong Bums"');
  lines.push('  🏠 Helyiség: Konyha');
  lines.push('  ❌ Nem található ez a helyiség');
  lines.push('');
  lines.push('Ikonok (műveleti válaszoknál): 📋 felmérés | 🔨 projekt | 💼 árajánlat | 🏠 helyiség | 🖼️ fotó | 📄 dokumentum/alaprajz | 👤 ügyfél | 📍 helyszín | ⏱️ munkaidő | 💰 kiadás');
  lines.push('Kérdésnél (pontosítás szükséges): egyetlen sor, pl. "❓ Melyik felméréshez?"');
  lines.push('Médiakérésnél (képek visszaküldése): az eszköz visszaadja { sent, total }. Ha sent > 0: "🖼️ Elküldve: {sent} / {total} fotó". Ha sent == 0: "❌ Nem sikerült elküldeni ({total} db). Nézd meg az alkalmazásban."');
  lines.push('');
  lines.push('=== Szabályok ===');
  lines.push('- Médiacsatolás:');
  lines.push('  1. Nincs "[Média csatolva —" tag az üzenetben → "❓ Küldd el a képeket!"');
  lines.push('  2. Van tag ÉS szöveges utasítás → csatold az utasítás alapján.');
  lines.push('  3. Van tag DE nincs szöveges utasítás (caption nélküli kép) → nézd meg az utolsó 1-2 előző üzenetet a kontextusban:');
  lines.push('     a) Ha az előző üzenetben egyértelmű helyszín szerepel (pl. "add to Nappali", "Konyha képei") → csatold oda, ne kérdezz.');
  lines.push('     b) Ha az előző válaszod már "❓ Hova kerüljön?" volt → NE ismételd meg. Csak annyit: "⏳ Várom a választ — melyik helyiséghez?"');
  lines.push('     c) Ha nincs kontextus → "❓ Hova kerüljön? (melyik felmérés / helyiség)"');
  lines.push('- set_context kötelező: minden felmérés/projekt/helyiség művelet után MINDIG hívd meg a set_context eszközt. Ez rögzíti a munkakontextust, hogy a következő képek/üzenetek automatikusan a jó helyre kerüljenek LLM hívás nélkül.');
  lines.push('  Például: attach_media után → set_context(document_id, "survey", document_name, area, area_id)');
  lines.push('  Például: add_room után → set_context(survey_id, "survey", survey_name, room_name, entry_id)');
  lines.push('- Ha a felhasználó egy MÁSIK felmérésre hivatkozik (nem az aktívra), hívd meg a set_context-et mielőtt bármit csinálsz.');
  lines.push('- Ha eszköz hibát ad (success: false) → mutasd az ❌ sort, kérd pontosítást.');
  lines.push('- KRITIKUS SZABÁLY: Adatírásról (megjegyzés, helyiség, fotó, stb.) SOHA ne jelents sikert, ha (a) nem hívtál eszközt, VAGY (b) az eszköz success:false-t adott vissza. Eszköz hívása nélkül nincs mentés. Hazudni tilos.');
  lines.push('- Lekérdezésnél (mit tartalmaz X?): ha az adat létezik → add vissza. Ha nem létezik / null → mondd el hogy nincs, ÉS ajánld fel az egyértelmű következő lépést. Pl.: "Nincs ügyfél hozzárendelve. Hozzárendeljek egyet? (add meg a nevet)"');
  lines.push('- Összefoglaló / dokumentumlista kérésnél ("hány felmérés?", "mi van?", "mutasd", "milyen dokumentumok?", "overview"): adj strukturált összefoglalót fiókonként — NE hívj eszközt. Minden fiókot mutasd. Formátum (sorrend: Felmérések → Árajánlatok → Projektek):');
  lines.push('  --- Személyes (üres) ---');
  lines.push('  [üres sor]');
  lines.push('  --- Mein Kollektiv ---');
  lines.push('  Felmérések:');
  lines.push('  1. Test Survey');
  lines.push('  Árajánlatok:');
  lines.push('  1. Minta Árajánlat (elfogadott)');
  lines.push('  [üres sor]');
  lines.push('  --- Mein Kollektiv II ---');
  lines.push('  Felmérések:');
  lines.push('  1. Ding Dong Bums');
  lines.push('  2. New Survey Test');
  lines.push('  Projektek:');
  lines.push('  1. Felújítás projekt');
  lines.push('  [üres sor majd:] ❓ Keresel valamit konkrétan?');
  lines.push('  Szabályok: (a) Ha egy fiók teljesen üres → "--- Név (üres) ---" egyetlen sor, semmi más. (b) Ha van tartalom → csak azok a szekciók jelennek meg, amikben van elem. (c) Sorrend mindig: Felmérések → Árajánlatok → Projektek.');
  lines.push('- TÖRLÉS TILOS: felmérést, helyiséget, képet soha ne törölj — "❌ Törlés csak az alkalmazásban lehetséges."');
  lines.push('- Megjegyzés hozzáfűzéshez mindig append_room_note / append_survey_note — ezek időbélyeggel fűzik hozzá, nem írják felül.');

  return {
    systemPrompt: lines.join('\n'),
    activeSurvey,
    activeProject,
    surveys:    surveys            || [],
    projects:   allProjectsEarly,
    quotes:     [...(personalQuotes || []), ...collectiveQuotes],
    workspaces: workspaces         || [],
    entriesBySurvey,
  };
}
