import { createAdminClient } from '@/lib/supabase/admin';
import { formatHUF } from '@/lib/constants';
import { calculateProjectFinancials } from '@/lib/calculations';
import { resolveProject } from '../resolveProject';

export async function queryProjectCosts({ waAccount, conversation, phoneNumber }) {
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
