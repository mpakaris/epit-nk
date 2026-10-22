import { createAdminClient } from '@/lib/supabase/admin';
import { saveConversation, saveLastAction } from './conversation';
import { logAudit } from '@/lib/audit';
import { attachMedia as attachMediaAction } from './actions/attachMedia';

// Accent-insensitive normalization for Hungarian room names
// e.g. "Fürdőszoba" and "Fürdöszoba" both normalize to "furdoszoba"
function normalizeHu(s) {
  return (s || '').toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i').replace(/[óòöő]/g, 'o')
    .replace(/[úùüű]/g, 'u');
}

// Find a survey entry by name with accent-insensitive partial match
async function findEntry(admin, surveyId, roomName) {
  const { data: entries } = await admin.from('survey_entries')
    .select('id, name, description')
    .eq('survey_id', surveyId);
  if (!entries?.length) return null;
  const needle = normalizeHu(roomName);
  return entries.find(e => normalizeHu(e.name).includes(needle) || needle.includes(normalizeHu(e.name))) || null;
}

// ── Tool JSON schemas for OpenAI ─────────────────────────────────────────────

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'create_survey',
      description: 'Új felmérés (survey) létrehozása. Használd ha a felhasználó új felmérést akar indítani.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A felmérés neve' },
          location: { type: 'string', description: 'Helyszín / cím (opcionális)' },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_room',
      description: 'Helyiség/terület hozzáadása egy felméréshez. Használd ha a felhasználó méretet ad meg.',
      parameters: {
        type: 'object',
        properties: {
          survey_id:    { type: 'string' },
          name:         { type: 'string', description: 'Helyiség neve pl. Konyha, Fürdőszoba' },
          width_m:      { type: 'number' },
          length_m:     { type: 'number' },
          height_m:     { type: 'number', description: 'Belmagasság méterben (opcionális)' },
          window_count: { type: 'integer', description: 'Ablakok száma (alapértelmezett: 0)' },
          door_count:   { type: 'integer', description: 'Ajtók száma (alapértelmezett: 0)' },
          description:  { type: 'string', description: 'Megjegyzés a helyiséghez (opcionális)' },
        },
        required: ['survey_id', 'name', 'width_m', 'length_m'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_room',
      description: 'Meglévő helyiség adatainak módosítása — megjegyzés hozzáadása/szerkesztése, méretek javítása, ajtó/ablak szám módosítása.',
      parameters: {
        type: 'object',
        properties: {
          survey_id:    { type: 'string' },
          room_name:    { type: 'string', description: 'A módosítandó helyiség neve (kis/nagybetű érzéketlen)' },
          description:  { type: 'string', description: 'Új megjegyzés szövege' },
          width_m:      { type: 'number' },
          length_m:     { type: 'number' },
          height_m:     { type: 'number' },
          window_count: { type: 'integer' },
          door_count:   { type: 'integer' },
        },
        required: ['survey_id', 'room_name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_survey',
      description: 'Felmérés nevének vagy helyszínének módosítása. NEM törölhető a felmérés — csak szerkeszthető.',
      parameters: {
        type: 'object',
        properties: {
          survey_id: { type: 'string' },
          title:     { type: 'string', description: 'Új felmérés neve (opcionális)' },
          location:  { type: 'string', description: 'Új helyszín / cím (opcionális)' },
        },
        required: ['survey_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'append_survey_note',
      description: 'Megjegyzés hozzáfűzése a felmérés egészéhez (nem írja felül a meglévőt — időbélyeggel fűzi hozzá).',
      parameters: {
        type: 'object',
        properties: {
          survey_id: { type: 'string' },
          note:      { type: 'string', description: 'A hozzáfűzendő megjegyzés szövege' },
        },
        required: ['survey_id', 'note'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'append_room_note',
      description: 'Megjegyzés hozzáfűzése egy helyiséghez (nem írja felül a meglévőt — időbélyeggel fűzi hozzá).',
      parameters: {
        type: 'object',
        properties: {
          survey_id: { type: 'string' },
          room_name: { type: 'string' },
          note:      { type: 'string', description: 'A hozzáfűzendő megjegyzés szövege' },
        },
        required: ['survey_id', 'room_name', 'note'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_survey_client',
      description: 'Ügyfél hozzárendelése egy felméréshez név alapján. Megkeresi az ügyfelet a felhasználó ügyféllistájában.',
      parameters: {
        type: 'object',
        properties: {
          survey_id:   { type: 'string' },
          client_name: { type: 'string', description: 'Az ügyfél neve (részleges egyezés is elfogadott)' },
        },
        required: ['survey_id', 'client_name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attach_media',
      description: 'Fotó, videó, alaprajz vagy dokumentum csatolása felméréshez vagy projekthez. Csak akkor hívd meg, ha az üzenetben valóban van média URL.',
      parameters: {
        type: 'object',
        properties: {
          target:       { type: 'string', enum: ['survey', 'project'], description: 'Hova kerüljön' },
          target_id:    { type: 'string', description: 'Felmérés vagy projekt ID' },
          room_name:    { type: 'string', description: 'Specifikus helyiség neve (opcionális, felméréshez)' },
          media_subtype: {
            type: 'string',
            enum: ['photo', 'layout'],
            description: 'photo = helyiség fotó; layout = alaprajz / floor plan. Alapértelmezett: photo.',
          },
        },
        required: ['target', 'target_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_labour',
      description: 'Munkaidő rögzítése egy projekten.',
      parameters: {
        type: 'object',
        properties: {
          project_id:  { type: 'string' },
          hours:       { type: 'number' },
          labour_type: { type: 'string', description: 'Munka típusa pl. burkolás, festés, kőműves' },
          hourly_rate: { type: 'number', description: 'Órabér Ft-ban (opcionális)' },
          work_date:   { type: 'string', description: 'Dátum YYYY-MM-DD formátumban, null = mai nap' },
        },
        required: ['project_id', 'hours', 'labour_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_expense',
      description: 'Számla/kiadás rögzítése egy projekten.',
      parameters: {
        type: 'object',
        properties: {
          project_id:  { type: 'string' },
          amount_huf:  { type: 'number', description: 'Összeg forintban' },
          description: { type: 'string', description: 'Leírás pl. csempe, festék' },
          category:    { type: 'string', enum: ['Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'] },
        },
        required: ['project_id', 'amount_huf', 'description', 'category'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_costs',
      description: 'Projekt költségeinek lekérdezése.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
        },
        required: ['project_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_context',
      description: 'Rögzíti az aktuális munkakontextust (melyik dokumentumban / melyik helyiségben dolgozik a felhasználó). Hívd meg minden felmérés/projekt/helyiség művelet után, hogy a következő üzenetekben ne kelljen újra megkérdezni.',
      parameters: {
        type: 'object',
        properties: {
          document_id:   { type: 'string', description: 'Felmérés vagy projekt ID' },
          document_type: { type: 'string', enum: ['survey', 'project'], description: 'Dokumentum típusa' },
          document_name: { type: 'string', description: 'Dokumentum neve (megjelenítéshez)' },
          area:          { type: 'string', description: 'Helyiség / terület neve (opcionális)' },
          area_id:       { type: 'string', description: 'Helyiség / survey_entry ID (opcionális)' },
        },
        required: ['document_id', 'document_type', 'document_name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_active_survey',
      description: 'Aktív felmérés beállítása a munkamenetben. Hívd meg mindig új felmérés létrehozása után, vagy ha a felhasználó felmérést vált.',
      parameters: {
        type: 'object',
        properties: {
          survey_id: { type: 'string' },
        },
        required: ['survey_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_media',
      description: 'Visszaküldi a felmérés egy helyiségéhez (vagy az egész felméréshez) csatolt fotókat / alaprajzokat a felhasználónak WhatsAppon keresztül.',
      parameters: {
        type: 'object',
        properties: {
          survey_id: { type: 'string' },
          room_name: { type: 'string', description: 'Helyiség neve (opcionális — ha nincs megadva, az összes felmérés-szintű médiát küldi)' },
        },
        required: ['survey_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_active_project',
      description: 'Aktív projekt beállítása a munkamenetben.',
      parameters: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
        },
        required: ['project_id'],
        additionalProperties: false,
      },
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────────

export function buildToolExecutors({ account, conversation, phoneNumber, mediaUrl, mediaKey, contentType, appUrl, secret }) {
  const admin = createAdminClient();

  async function sendMedia(url, caption, mimeType) {
    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
    const isDocument = mimeType === 'application/pdf';
    await fetch(`${appUrl}/api/wa/send`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isDocument
          ? { chatId: jid, document: { url }, caption: caption || null }
          : { chatId: jid, image: { url }, caption: caption || null }
      ),
    });
  }

  return {
    create_survey: async ({ title, location }) => {
      const { data: survey, error } = await admin.from('surveys').insert({
        owner_id:      account.userId,
        collective_id: account.collectiveId || null,
        title:         title.trim(),
        location:      location?.trim() || null,
        created_by:    account.userId,
      }).select('id').single();

      if (error) return { success: false, error: error.message };

      await saveConversation(phoneNumber, { active_survey_id: survey.id });
      conversation.active_survey_id = survey.id;
      await saveLastAction(phoneNumber, 'survey', 'surveys', survey.id);
      await logAudit({
        userId: account.userId, userName: account.displayName,
        action: 'Felmérés létrehozva (WhatsApp)', targetType: 'survey',
        targetId: survey.id, targetName: title, details: { channel: 'whatsapp' },
      }).catch(() => {});

      return { success: true, survey_id: survey.id };
    },

    add_room: async ({ survey_id, name, width_m, length_m, height_m, window_count, door_count, description }) => {
      const size_m2 = Math.round(width_m * length_m * 100) / 100;
      const { data: entry, error } = await admin.from('survey_entries').insert({
        survey_id,
        name:         name.trim(),
        width_m,
        length_m,
        size_m2,
        height_m:     height_m     ?? null,
        window_count: window_count ?? 0,
        door_count:   door_count   ?? 0,
        description:  description  ?? null,
        created_by:      account.userId || null,
        created_by_name: account.displayName || null,
      }).select('id').single();

      if (error) {
        // Fallback: retry without created_by columns if they don't exist
        if (error.message?.includes('created_by')) {
          const { data: e2, error: e2err } = await admin.from('survey_entries').insert({
            survey_id, name: name.trim(), width_m, length_m, size_m2,
            height_m: height_m ?? null, window_count: window_count ?? 0,
            door_count: door_count ?? 0, description: description ?? null,
          }).select('id').single();
          if (e2err) return { success: false, error: e2err.message };
          await saveLastAction(phoneNumber, 'survey_entry', 'survey_entries', e2.id);
          return { success: true, entry_id: e2.id, size_m2 };
        }
        return { success: false, error: error.message };
      }

      await saveLastAction(phoneNumber, 'survey_entry', 'survey_entries', entry.id);
      return { success: true, entry_id: entry.id, size_m2 };
    },

    update_room: async ({ survey_id, room_name, description, width_m, length_m, height_m, window_count, door_count }) => {
      const entry = await findEntry(admin, survey_id, room_name);
      if (!entry) return { success: false, error: `"${room_name}" helyiség nem található.` };
      const entries = [entry];

      const updates = {};
      if (width_m      != null) updates.width_m      = width_m;
      if (length_m     != null) updates.length_m     = length_m;
      if (height_m     != null) updates.height_m     = height_m;
      if (window_count != null) updates.window_count = window_count;
      if (door_count   != null) updates.door_count   = door_count;
      if (width_m != null && length_m != null) updates.size_m2 = Math.round(width_m * length_m * 100) / 100;

      // description in update_room = full replace (for corrections); use append_room_note for appending
      if (description != null) updates.description = description;

      const { error } = await admin.from('survey_entries').update(updates).eq('id', entries[0].id);
      if (error) return { success: false, error: error.message };
      return { success: true, updated_entry_id: entries[0].id };
    },

    update_survey: async ({ survey_id, title, location }) => {
      const updates = {};
      if (title?.trim())    updates.title    = title.trim();
      if (location?.trim()) updates.location = location.trim();
      if (!Object.keys(updates).length) return { success: false, error: 'Nincs mit frissíteni.' };
      const { error } = await admin.from('surveys').update(updates).eq('id', survey_id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },

    append_survey_note: async ({ survey_id, note }) => {
      const { data: survey } = await admin.from('surveys').select('notes').eq('id', survey_id).single();
      const ts = new Date().toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
      const existing = survey?.notes ? survey.notes + '\n' : '';
      const updated  = `${existing}[${ts}] ${note.trim()}`;
      const { error } = await admin.from('surveys').update({ notes: updated }).eq('id', survey_id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },

    append_room_note: async ({ survey_id, room_name, note }) => {
      const entry = await findEntry(admin, survey_id, room_name);
      if (!entry) return { success: false, error: `"${room_name}" helyiség nem található.` };

      const ts = new Date().toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
      const existing = entry.description ? entry.description + '\n' : '';
      const updated  = `${existing}[${ts}] ${note.trim()}`;

      const { error } = await admin.from('survey_entries').update({ description: updated }).eq('id', entry.id);
      if (error) return { success: false, error: error.message };
      return { success: true, updated_entry_id: entry.id };
    },

    set_survey_client: async ({ survey_id, client_name }) => {
      const { data: clients } = await admin.from('clients')
        .select('id, name')
        .eq('owner_id', account.userId)
        .ilike('name', `%${client_name.trim()}%`)
        .limit(5);

      if (!clients?.length) return { success: false, error: `Nem található ügyfél ezzel a névvel: "${client_name}". Ellenőrizd az alkalmazásban.` };
      if (clients.length > 1) {
        const names = clients.map((c, i) => `${i + 1}. ${c.name}`).join(', ');
        return { success: false, needs_clarification: true, options: clients.map(c => ({ id: c.id, name: c.name })), message: `Több ügyfél is egyezik: ${names}` };
      }

      const { error } = await admin.from('surveys').update({ client_id: clients[0].id }).eq('id', survey_id);
      if (error) return { success: false, error: error.message };
      return { success: true, client_id: clients[0].id, client_name: clients[0].name };
    },

    attach_media: async ({ target, target_id, room_name, media_subtype }) => {
      if (!mediaUrl) return { success: false, error: 'Ebben az üzenetben nincs média.' };

      // Resolve room_name → entry_id (accent-insensitive) so media links to the specific entry
      let entryId = null;
      if (target === 'survey' && room_name) {
        const entry = await findEntry(admin, target_id, room_name);
        entryId = entry?.id || null;
      }

      const fakeConv = {
        ...conversation,
        active_survey_id:  target === 'survey'  ? target_id : null,
        active_project_id: target === 'project' ? target_id : null,
      };

      const mimeType = contentType === 'image'    ? 'image/jpeg'
                     : contentType === 'video'    ? 'video/mp4'
                     : contentType === 'document' ? 'application/pdf'
                     : 'application/octet-stream';

      // layout (floor plan) overrides the default 'photo' media type
      const forcedMediaType = media_subtype === 'layout' ? 'layout' : null;

      const result = await attachMediaAction({
        waAccount: account, conversation: fakeConv,
        mediaUrl, mediaKey, mimeType, caption: room_name || null, phoneNumber, entryId, forcedMediaType,
      });

      if (result.handoffToInvoice) {
        return { success: false, handoff: 'invoice', message: 'A kép számlaként lett azonosítva — kérlek add meg az összeget.' };
      }

      return { success: true, message: result.reply };
    },

    log_labour: async ({ project_id, hours, labour_type, hourly_rate, work_date }) => {
      const { data: project } = await admin.from('projects').select('name').eq('id', project_id).single();
      if (!project) return { success: false, error: 'Projekt nem található.' };

      const entryData = {
        project_id,
        owner_id:      account.userId,
        collective_id: account.collectiveId || null,
        labour_type:   labour_type.trim(),
        hours,
        hourly_rate:   hourly_rate ?? null,
        work_date:     work_date   ?? new Date().toISOString().slice(0, 10),
        note:          `WhatsApp via ${account.displayName}`,
      };

      const { data: entry, error } = await admin.from('labour_entries').insert(entryData).select('id').single();
      if (error) return { success: false, error: error.message };

      await saveLastAction(phoneNumber, 'labour_entry', 'labour_entries', entry.id);
      await logAudit({
        userId: account.userId, userName: account.displayName,
        action: 'Munkaidő rögzítve (WhatsApp)', targetType: 'labour_entry',
        targetId: entry.id, targetName: labour_type,
        details: { channel: 'whatsapp', project_id, hours },
      }).catch(() => {});

      const rate = hourly_rate ? ` × ${hourly_rate.toLocaleString('hu-HU')} Ft/óra` : '';
      return { success: true, entry_id: entry.id, summary: `${hours} óra ${labour_type}${rate} — ${project.name}` };
    },

    log_expense: async ({ project_id, amount_huf, description, category }) => {
      const { data: project } = await admin.from('projects').select('name').eq('id', project_id).single();
      if (!project) return { success: false, error: 'Projekt nem található.' };

      const { data: inv, error } = await admin.from('invoices').insert({
        project_id,
        owner_id:      account.userId,
        collective_id: account.collectiveId || null,
        amount_huf,
        description:   description.trim(),
        category,
        invoice_date:  new Date().toISOString().slice(0, 10),
        source:        'whatsapp',
      }).select('id').single();

      if (error) return { success: false, error: error.message };

      await saveLastAction(phoneNumber, 'invoice', 'invoices', inv.id);
      await logAudit({
        userId: account.userId, userName: account.displayName,
        action: 'Kiadás rögzítve (WhatsApp)', targetType: 'invoice',
        targetId: inv.id, targetName: description,
        details: { channel: 'whatsapp', project_id, amount_huf, category },
      }).catch(() => {});

      return { success: true, invoice_id: inv.id, summary: `${amount_huf.toLocaleString('hu-HU')} Ft — ${description} (${category}) — ${project.name}` };
    },

    query_costs: async ({ project_id }) => {
      const [
        { data: project },
        { data: invoices },
        { data: labour },
      ] = await Promise.all([
        admin.from('projects').select('name').eq('id', project_id).single(),
        admin.from('invoices').select('amount_huf, category').eq('project_id', project_id),
        admin.from('labour_entries').select('hours, hourly_rate').eq('project_id', project_id),
      ]);

      if (!project) return { success: false, error: 'Projekt nem található.' };

      const totalExpenses = (invoices || []).reduce((s, i) => s + (i.amount_huf || 0), 0);
      const totalLabour   = (labour   || []).reduce((s, l) => s + (l.hours || 0) * (l.hourly_rate || 0), 0);
      const totalHours    = (labour   || []).reduce((s, l) => s + (l.hours || 0), 0);

      return {
        success: true,
        project_name:     project.name,
        total_expenses_huf: totalExpenses,
        total_labour_huf:   totalLabour,
        total_hours:        totalHours,
        grand_total_huf:    totalExpenses + totalLabour,
      };
    },

    show_media: async ({ survey_id, room_name }) => {
      let entryId = null;
      if (room_name) {
        const entry = await findEntry(admin, survey_id, room_name);
        if (!entry) return { success: false, error: `"${room_name}" helyiség nem található.` };
        entryId = entry.id;
      }

      const query = admin.from('survey_media')
        .select('drive_view_url, thumbnail_url, mime_type, media_type, file_name')
        .eq('survey_id', survey_id)
        .order('created_at', { ascending: true });

      const { data: media } = entryId
        ? await query.eq('entry_id', entryId)
        : await query.is('entry_id', null);

      if (!media?.length) {
        return { success: true, sent: 0, message: 'Nincs csatolt fotó ehhez a helyiséghez.' };
      }

      let sent = 0;
      for (const item of media) {
        const url = item.drive_view_url;
        if (!url) continue;
        const label = item.media_type === 'layout' ? 'Alaprajz' : item.file_name || 'Fotó';
        try {
          await sendMedia(url, label, item.mime_type);
          sent++;
        } catch (err) {
          console.error('[show_media] send error:', err.message);
        }
      }

      return { success: true, sent, total: media.length };
    },

    set_context: async ({ document_id, document_type, document_name, area, area_id }) => {
      const updates = {
        current_document_id:    document_id,
        current_document_type:  document_type,
        current_document_name:  document_name,
        current_area:           area    || null,
        current_area_id:        area_id || null,
        current_context_set_at: new Date().toISOString(),
      };
      await saveConversation(phoneNumber, updates);
      Object.assign(conversation, updates);
      // Also keep active_survey / active_project in sync
      if (document_type === 'survey')  { await saveConversation(phoneNumber, { active_survey_id:  document_id }); conversation.active_survey_id  = document_id; }
      if (document_type === 'project') { await saveConversation(phoneNumber, { active_project_id: document_id }); conversation.active_project_id = document_id; }
      return { success: true };
    },

    set_active_survey: async ({ survey_id }) => {
      await saveConversation(phoneNumber, { active_survey_id: survey_id });
      conversation.active_survey_id = survey_id;
      return { success: true };
    },

    set_active_project: async ({ project_id }) => {
      await saveConversation(phoneNumber, { active_project_id: project_id });
      conversation.active_project_id = project_id;
      return { success: true };
    },
  };
}
