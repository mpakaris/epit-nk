import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { formatHUF } from '@/lib/constants';
import { saveClarification } from '../clarification';
import { saveLastAction } from '../conversation';
import { resolveProject } from '../resolveProject';

export async function createLabourEntry({ waAccount, conversation, extracted, phoneNumber }) {
  // WA-061: Subbie permission check
  if (waAccount.accountType === 'subbie' && !waAccount.permissions?.can_log_labour) {
    return { reply: 'Nincs munkaidő rögzítési jogosultságod. Kérd meg a mestert a hozzáférés megadásához.' };
  }

  const projectResult = await resolveProject(extracted?.project_hint || '', waAccount, conversation);

  if (projectResult.needsClarification) {
    return {
      reply: null,
      needsClarification: true,
      clarificationType:    'project_choice',
      clarificationOptions: projectResult.clarificationOptions,
      originalIntent:       'create_labour_entry',
      originalPayload:      extracted,
    };
  }

  const { projectId, projectName } = projectResult;
  const { hours, labourType, hourlyRate, workDate } = extracted || {};

  if (!hours) return { reply: 'Hány óra munkát rögzítsek?' };
  if (!labourType) return { reply: 'Milyen munkát végzett? (pl. burkolás, festés, villanyszerelés)' };

  // If hourly rate unknown, ask once via pending_clarification
  if (hourlyRate == null) {
    await saveClarification(phoneNumber, 'labour_rate_needed', [], 'create_labour_entry', {
      ...extracted, projectId,
    });
    return { reply: 'Mi az órabér? (pl. 5000 Ft/óra — vagy írd: "kihagyom")' };
  }

  return doInsert({ waAccount, phoneNumber, projectId, projectName, hours, labourType, hourlyRate, workDate });
}

export async function createLabourEntryWithRate({ waAccount, conversation, phoneNumber, rateText, pendingPayload }) {
  const { hours, labourType, workDate, projectId } = pendingPayload;

  let hourlyRate = null;
  const norm = (rateText || '').trim().toLowerCase();
  if (!['kihagyom', 'skip', 'nem', '-'].includes(norm)) {
    const parsed = parseInt(norm.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) hourlyRate = parsed;
  }

  const { data: project } = await createAdminClient().from('projects').select('name').eq('id', projectId).single();

  return doInsert({ waAccount, phoneNumber, projectId, projectName: project?.name || '', hours, labourType, hourlyRate, workDate });
}

async function doInsert({ waAccount, phoneNumber, projectId, projectName, hours, labourType, hourlyRate, workDate }) {
  const admin = createAdminClient();
  const valueHuf = hourlyRate ? Math.round(hours * hourlyRate) : null;
  const date = workDate || new Date().toISOString().slice(0, 10);

  const { data: entry, error } = await admin.from('labour_entries').insert({
    project_id:    projectId,
    uploaded_by:   waAccount.userId || null,
    uploader_name: waAccount.displayName || null,
    date,
    labour_type:   labourType,
    hours,
    hourly_rate:   hourlyRate || null,
    value_huf:     valueHuf || null,
  }).select('id').single();

  if (error) {
    console.error('[wa createLabourEntry] insert error:', error.message);
    return { reply: 'Sajnos nem sikerült rögzíteni a munkabejegyzést. Kérlek próbáld újra.' };
  }

  await logAudit({
    userId:     waAccount.userId,
    userName:   waAccount.displayName,
    action:     'Munkabejegyzés rögzítve (WhatsApp)',
    targetType: 'labour_entry',
    targetId:   entry?.id,
    targetName: projectName,
    details:    { channel: 'whatsapp', hours, labour_type: labourType, value_huf: valueHuf },
  });

  await saveLastAction(phoneNumber || '', 'labour_entry', 'labour_entries', entry?.id);

  const reply = hourlyRate
    ? `✓ Munkaidő rögzítve: ${hours} óra ${labourType} — ${formatHUF(valueHuf)} (${projectName})\n\n_Visszavonáshoz: vissza_`
    : `✓ Munkaidő rögzítve: ${hours} óra ${labourType} — órabér nélkül (${projectName})\n\n_Visszavonáshoz: vissza_`;

  return { reply };
}
