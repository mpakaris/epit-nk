import { createAdminClient } from '@/lib/supabase/admin';
import { formatHUF } from '@/lib/constants';
import { calculateProjectFinancials } from '@/lib/calculations';
import { resolveProject } from '../resolveProject';

export async function queryProjectCosts({ waAccount, conversation, phoneNumber }) {
  // WA-063: Subbie sees only their own records
  if (waAccount.accountType === 'subbie') {
    if (!waAccount.permissions?.can_view_own_costs) {
      return { reply: 'Nincs jogosultságod az adatok megtekintéséhez.' };
    }
    return querySubbieCosts({ waAccount, conversation });
  }

  const projectResult = await resolveProject('', waAccount, conversation);

  if (projectResult.needsClarification) {
    return {
      reply: null,
      needsClarification: true,
      clarificationType:    'project_choice',
      clarificationOptions: projectResult.clarificationOptions,
      originalIntent:       'query_costs',
      originalPayload:      {},
    };
  }

  const { projectId, projectName } = projectResult;
  const admin = createAdminClient();

  const [
    { data: project },
    { data: invoices },
    { data: labourEntries },
    { data: quotes },
  ] = await Promise.all([
    admin.from('projects').select('*').eq('id', projectId).single(),
    admin.from('invoices').select('*').eq('project_id', projectId).is('deleted_at', null),
    admin.from('labour_entries').select('*').eq('project_id', projectId),
    admin.from('quotes').select('id, total_price').eq('project_id', projectId)
      .not('status', 'eq', 'draft').order('created_at', { ascending: false }).limit(1),
  ]);

  const financials = calculateProjectFinancials(
    project || {},
    invoices || [],
    labourEntries || [],
    [],
    waAccount.userId
  );

  const { totalCost, totalLabourValue } = financials;
  const totalActual = totalCost + totalLabourValue;
  const quoteTotal  = quotes?.[0]?.total_price || null;

  const lines = [`*${projectName} — költségek:*`];

  if (totalCost > 0) lines.push(`Anyagköltség: ${formatHUF(totalCost)}`);
  if (totalLabourValue > 0) lines.push(`Munkabér: ${formatHUF(totalLabourValue)}`);
  lines.push(`\n*Összesen: ${formatHUF(totalActual)}*`);

  if (quoteTotal) {
    const deviation = totalActual - quoteTotal;
    const pct = Math.round((deviation / quoteTotal) * 100);
    lines.push(`Ajánlat: ${formatHUF(quoteTotal)}`);
    lines.push(`Eltérés: ${deviation > 0 ? '+' : ''}${formatHUF(deviation)} (${pct > 0 ? '+' : ''}${pct}%)`);
  }

  if (totalActual === 0) lines.push('Még nincs rögzített költség.');

  return { reply: lines.join('\n') };
}

async function querySubbieCosts({ waAccount, conversation }) {
  const admin = createAdminClient();
  const projectResult = await resolveProject('', waAccount, conversation);
  if (projectResult.needsClarification) return { needsClarification: true, ...projectResult };

  const { projectId, projectName } = projectResult;
  const subbieId = waAccount.userId || waAccount.waAccount.id;

  const [{ data: myInvoices }, { data: myLabour }] = await Promise.all([
    admin.from('invoices').select('value_huf, category').eq('project_id', projectId).eq('uploaded_by', subbieId).is('deleted_at', null),
    admin.from('labour_entries').select('hours, value_huf, labour_type').eq('project_id', projectId).eq('uploaded_by', subbieId),
  ]);

  const totalInvoices = (myInvoices || []).reduce((s, i) => s + (i.value_huf || 0), 0);
  const totalLabour   = (myLabour   || []).reduce((s, l) => s + (l.value_huf || 0), 0);
  const totalHours    = (myLabour   || []).reduce((s, l) => s + (l.hours || 0), 0);

  const lines = [`*Saját feltöltéseim — ${projectName}:*`];
  if (myInvoices?.length) lines.push(`Számlák (${myInvoices.length} db): ${formatHUF(totalInvoices)}`);
  if (myLabour?.length)   lines.push(`Munkaidő: ${totalHours} óra — ${formatHUF(totalLabour)}`);
  lines.push(`\n*Összesen: ${formatHUF(totalInvoices + totalLabour)}*`);

  return { reply: lines.join('\n') };
}
