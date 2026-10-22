import { createAdminClient } from '@/lib/supabase/admin';

export async function buildUserContext(account, conversation) {
  const admin       = createAdminClient();
  const userId      = account.userId;
  const collectiveId = conversation.workspace_chosen
    ? conversation.active_collective_id
    : account.collectiveId;

  const scopeFilter = collectiveId
    ? (q) => q.eq('collective_id', collectiveId)
    : (q) => q.eq('owner_id', userId).is('collective_id', null);

  // Fetch in parallel
  const [
    { data: collectives },
    { data: projects },
    { data: surveys },
    { data: quotes },
  ] = await Promise.all([
    // User's workspaces
    admin.from('collective_members')
      .select('collective:collectives(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active'),

    // Open projects in current workspace
    scopeFilter(admin.from('projects').select('id, name'))
      .is('closed_at', null)
      .order('created_at', { ascending: false })
      .limit(8),

    // Recent surveys in current workspace
    scopeFilter(admin.from('surveys').select('id, title'))
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent non-draft quotes in current workspace
    scopeFilter(admin.from('quotes').select('id, title'))
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const workspaceNames = [
    'Személyes munkaterület',
    ...((collectives || []).map(m => m.collective?.name).filter(Boolean)),
  ];

  const activeWorkspace = collectiveId
    ? (collectives || []).find(m => m.collective?.id === collectiveId)?.collective?.name || 'ismeretlen kollektíva'
    : 'Személyes munkaterület';

  const activeSurvey = conversation.active_survey_id
    ? (surveys || []).find(s => s.id === conversation.active_survey_id)?.title || null
    : null;

  const activeProject = conversation.active_project_id
    ? (projects || []).find(p => p.id === conversation.active_project_id)?.name || null
    : null;

  // Build compact context string for the system prompt
  const lines = [
    `Felhasználó: ${account.displayName}`,
    `Aktív munkaterület: ${activeWorkspace}`,
    `Elérhető munkaterületek: ${workspaceNames.join(', ')}`,
  ];

  if (activeProject) lines.push(`Aktív projekt: ${activeProject}`);
  if (activeSurvey)  lines.push(`Aktív felmérés: ${activeSurvey}`);

  if (projects?.length) {
    lines.push(`Nyitott projektek: ${projects.map(p => p.name).join(', ')}`);
  }
  if (surveys?.length) {
    lines.push(`Legutóbbi felmérések: ${surveys.map(s => s.title).join(', ')}`);
  }
  if (quotes?.length) {
    lines.push(`Legutóbbi árajánlatok: ${quotes.map(q => q.title).join(', ')}`);
  }

  return {
    contextString: lines.join('\n'),
    activeProject,
    activeSurvey,
    workspaceNames,
    activeWorkspace,
    collectiveId,
  };
}
