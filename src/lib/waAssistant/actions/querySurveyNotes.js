import { createAdminClient } from '@/lib/supabase/admin';

const fmtN = n => (n != null ? String(n).replace('.', ',') : null);

export async function querySurveyNotes({ waAccount, conversation }) {
  if (!conversation.active_survey_id) {
    return { reply: 'Nincs aktív felmérés. Válassz egyet: "felmérések listája"' };
  }

  const admin = createAdminClient();

  const [{ data: survey }, { data: entries }] = await Promise.all([
    admin.from('surveys').select('title').eq('id', conversation.active_survey_id).single(),
    admin.from('survey_entries')
      .select('name, width_m, length_m, size_m2, height_m, door_count, window_count')
      .eq('survey_id', conversation.active_survey_id)
      .order('created_at', { ascending: true }),
  ]);

  if (!entries?.length) {
    return { reply: 'Ez a felmérés még üres. Mondj helyiségeket és méreteket.' };
  }

  const lines = entries.map(e => {
    let line = `🏠 *${e.name}*`;
    const area = e.size_m2 || (e.width_m && e.length_m ? Math.round(e.width_m * e.length_m * 100) / 100 : null);
    if (e.width_m && e.length_m) line += `: ${fmtN(e.width_m)} × ${fmtN(e.length_m)} m`;
    if (area) line += ` (${fmtN(area)} m²)`;
    if (e.height_m) line += `, ${fmtN(e.height_m)} m mennyezet`;
    if (e.door_count > 0) line += `, ${e.door_count} ajtó`;
    if (e.window_count > 0) line += `, ${e.window_count} ablak`;
    return line;
  });

  const totalArea = entries
    .filter(e => e.width_m && e.length_m)
    .reduce((sum, e) => sum + e.width_m * e.length_m, 0);

  const footer = totalArea > 0
    ? `\n\nÖsszes alapterület: ${fmtN(Math.round(totalArea * 100) / 100)} m²`
    : '';

  return { reply: `*${survey?.title || 'Felmérés'}* — helyiségek:\n\n${lines.join('\n')}${footer}` };
}
