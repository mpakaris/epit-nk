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
    { data: projects },
    { data: quotes },
    { data: personalSurveys },
  ] = await Promise.all([
    admin.from('collective_members')
      .select('collective:collectives(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active'),

    scopeFilter(admin.from('projects').select('id, name, closed_at'))
      .is('closed_at', null)
      .order('created_at', { ascending: false })
      .limit(8),

    scopeFilter(admin.from('quotes').select('id, title, status'))
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(8),

    // Personal surveys — always load regardless of active workspace
    admin.from('surveys')
      .select('id, title, notes, location, client_id, collective_id')
      .eq('owner_id', userId)
      .is('collective_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  // Load surveys for ALL collectives the user belongs to
  const collectiveList = (collectives || []).map(m => m.collective).filter(Boolean);
  const collectiveIds  = collectiveList.map(c => c.id);
  let collectiveSurveys = [];
  if (collectiveIds.length) {
    const { data: cs } = await admin.from('surveys')
      .select('id, title, notes, location, client_id, collective_id')
      .in('collective_id', collectiveIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(24);
    collectiveSurveys = cs || [];
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
    : 'Személyes munkaterület';

  const activeSurvey  = (surveys || []).find(s => s.id === conversation.active_survey_id);
  const activeProject = (projects || []).find(p => p.id === conversation.active_project_id);

  // Build system prompt
  const lines = [
    'Te Whinself vagy — az OkosSzaki (Epitek) WhatsApp asszisztense.',
    'Az OkosSzaki egy alkalmazás magyar szakembereknek: felmérések, árajánlatok, projektek.',
    '',
    `Felhasználó: ${account.displayName}`,
    `Aktív munkaterület: ${activeWorkspaceName}`,
    `Mai dátum: ${new Date().toISOString().slice(0, 10)}`,
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

  // Surveys section — grouped by workspace
  lines.push('=== Felmérések (munkaterületenként) ===');

  const workspaces = [
    { label: 'Személyes munkaterület', surveys: personalSurveys || [] },
    ...collectiveList.map(c => ({
      label: c.name,
      collectiveId: c.id,
      surveys: collectiveSurveys.filter(s => s.collective_id === c.id),
    })),
  ];

  for (const ws of workspaces) {
    lines.push(`📁 *${ws.label}* | ${ws.surveys.length} felmérés${ws.surveys.length === 0 ? ': nincs felmérés' : ':'}`);
    if (ws.surveys.length === 0) {
      lines.push('  (nincs felmérés)');
    } else {
      for (const s of ws.surveys) {
        const rooms       = entriesBySurvey[s.id] || [];
        const clientName  = s.client_id ? clientMap[s.client_id] : null;
        const layoutCount = layoutCountMap[s.id] || 0;
        lines.push(`  • "${s.title}" (id: ${s.id})`);
        if (s.location)   lines.push(`    Helyszín: ${s.location}`);
        lines.push(`    Ügyfél: ${clientName ? `"${clientName}"` : '(nincs)'}`);
        lines.push(`    Alaprajz: ${layoutCount > 0 ? `${layoutCount} db` : '(nincs)'}`);
        if (s.notes)      lines.push(`    Megjegyzések: ${s.notes.slice(0, 150)}${s.notes.length > 150 ? '…' : ''}`);
        if (rooms.length) {
          lines.push(`    Helyiségek (${rooms.length}): ${rooms.map(r => r.name).join(', ')}`);
        } else {
          lines.push('    Helyiségek: (még nincs)');
        }
      }
    }
  }
  lines.push('');

  // Projects section
  if (projects?.length) {
    lines.push('=== Projektek ===');
    for (const p of projects) lines.push(`• "${p.name}" (id: ${p.id})`);
    lines.push('');
  } else {
    lines.push('=== Projektek ===\n(nincs nyitott projekt)\n');
  }

  // Quotes section
  if (quotes?.length) {
    lines.push('=== Árajánlatok ===');
    for (const q of quotes) lines.push(`• "${q.title}" (id: ${q.id}, státusz: ${q.status})`);
    lines.push('');
  }

  lines.push('=== Utasítások ===');
  lines.push('- MINDIG magyarul válaszolj — kivétel nélkül, függetlenül attól, hogy a felhasználó milyen nyelven ír.');
  lines.push('- Eszközökkel (tool) olvass/írj adatot; soha ne találj ki ID-t vagy adatot.');
  lines.push('- Ha hivatkozik egy felmérésre/projektre neve alapján, a fenti listából azonosítsd be az ID-t.');
  lines.push('- Ha valami nem egyértelmű, tegyél fel EGY rövid kérdést — ne sorold fel az összes lehetőséget.');
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
  lines.push('Ikonok: 📋 felmérés | 📁 projekt | 💼 árajánlat | 🏠 helyiség | 🖼️ fotó | 📄 dokumentum/alaprajz | 👤 ügyfél | 📍 helyszín | ⏱️ munkaidő | 💰 kiadás');
  lines.push('Kérdésnél (pontosítás szükséges): egyetlen sor, pl. "❓ Melyik felméréshez?"');
  lines.push('Médiakérésnél (képek visszaküldése): csak "🖼️ Elküldve: N fotó" — a képek már megérkeztek.');
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
  lines.push('- Összefoglaló / darabszám kérésnél ("hány felmérés?", "mi van?", "mutasd", "overview"): adj strukturált összefoglalót munkaterületenként — NE hívj eszközt. Minden munkaterületet mutasd, az üreseket is. Formátum (WhatsApp-kompatibilis, *bold* és sortörések):');
  lines.push('  📁 *Személyes munkaterület* | 0 felmérés: nincs felmérés');
  lines.push('  [üres sor]');
  lines.push('  📁 *Mein Kollektiv* | 1 felmérés:');
  lines.push('  1. "Test Survey"');
  lines.push('  [üres sor]');
  lines.push('  📁 *Mein Kollektiv II* | 2 felmérés:');
  lines.push('  1. "Ding Dong Bums"');
  lines.push('  2. "New Survey Test"');
  lines.push('  [üres sor majd:] ❓ Keresel valamit konkrétan?');
  lines.push('  Szabály: ha 0 felmérés → "nincs felmérés" UGYANABBAN a sorban (nincs számozás). Ha ≥1 → külön sorokba számozva.');
  lines.push('- TÖRLÉS TILOS: felmérést, helyiséget, képet soha ne törölj — "❌ Törlés csak az alkalmazásban lehetséges."');
  lines.push('- Megjegyzés hozzáfűzéshez mindig append_room_note / append_survey_note — ezek időbélyeggel fűzik hozzá, nem írják felül.');

  return {
    systemPrompt: lines.join('\n'),
    activeSurvey,
    activeProject,
    surveys:    surveys       || [],
    projects:   projects      || [],
    quotes:     quotes        || [],
    workspaces: workspaces    || [],
    entriesBySurvey,
  };
}
