import { createAdminClient } from '@/lib/supabase/admin';
import { saveClarification } from './clarification';
import { saveConversation } from './conversation';

function normalizeHu(s) {
  return (s || '').toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i').replace(/[óòöő]/g, 'o')
    .replace(/[úùüű]/g, 'u');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// Full title appears as a complete phrase in the message (not mid-word)
function isExactTitleMatch(title, msg) {
  const nt      = normalizeHu(title);
  const nm      = normalizeHu(msg);
  const escaped = nt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|[\\s.,?!])`, 'i').test(nm);
}

// At least one word in the title fuzzy-matches a word in the message.
// Also handles Hungarian compound words via prefix match ("furdo" matches "furdoszoba").
function hasWordMatch(title, msg) {
  const titleWords = normalizeHu(title).split(/\s+/).filter(w => w.length >= 3);
  const msgWords   = normalizeHu(msg).split(/\s+/).filter(w => w.length >= 3);
  if (!titleWords.length || !msgWords.length) return false;
  return titleWords.some(tw => {
    const maxDist = tw.length <= 3 ? 0 : tw.length <= 6 ? 1 : 2;
    return msgWords.some(mw => {
      if (levenshtein(tw, mw) <= maxDist) return true;
      // prefix: "furdo" matches "furdoszoba", or "szoba" matches "szobafürdő" (rare but safe)
      if (mw.length >= 4 && tw.startsWith(mw)) return true;
      if (tw.length >= 4 && mw.startsWith(tw)) return true;
      return false;
    });
  });
}

// How many title words fuzzy-match message words (for ranking, 0.0–1.0)
function wordMatchScore(title, msg) {
  const titleWords = normalizeHu(title).split(/\s+/).filter(w => w.length >= 3);
  const msgWords   = normalizeHu(msg).split(/\s+/).filter(w => w.length >= 3);
  if (!titleWords.length) return 0;
  const matched = titleWords.filter(tw => {
    const maxDist = tw.length <= 3 ? 0 : tw.length <= 6 ? 1 : 2;
    return msgWords.some(mw => {
      if (levenshtein(tw, mw) <= maxDist) return true;
      if (mw.length >= 4 && tw.startsWith(mw)) return true;
      if (tw.length >= 4 && mw.startsWith(tw)) return true;
      return false;
    });
  }).length;
  return matched / titleWords.length;
}

// Returns { collectiveId, needsClarification, clarificationType?, options?, clarificationOptions? }
export async function resolveWorkspace(waAccount, conversation, phoneNumber, messageText = '') {
  if (conversation.workspace_chosen) {
    return { collectiveId: conversation.active_collective_id, needsClarification: false };
  }

  if (waAccount.collectiveId) {
    return { collectiveId: waAccount.collectiveId, needsClarification: false };
  }

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, collective:collectives(id, name)')
    .eq('user_id', waAccount.userId)
    .eq('status', 'active');

  const collectives = (memberships || []).map(m => m.collective).filter(Boolean);

  if (!collectives.length) {
    await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: null });
    return { collectiveId: null, needsClarification: false };
  }

  const msg = normalizeHu(messageText);

  // 1. Exact workspace name in message → auto-resolve
  if (msg.includes('personal') || msg.includes('személyes') || msg.includes('saját') || msg.includes('sajat')) {
    await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: null });
    return { collectiveId: null, needsClarification: false };
  }
  for (const c of collectives) {
    if (c.name && msg.includes(normalizeHu(c.name))) {
      await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: c.id });
      return { collectiveId: c.id, needsClarification: false };
    }
  }

  // 2. Document name search across all workspaces
  if (messageText.trim().length > 2) {
    const collectiveIds = collectives.map(c => c.id);

    const [
      { data: pSurveys }, { data: cSurveys },
      { data: pProjects }, { data: cProjects },
      { data: pQuotes },  { data: cQuotes },
    ] = await Promise.all([
      admin.from('surveys').select('title, collective_id').eq('owner_id', waAccount.userId).is('collective_id', null).is('deleted_at', null).limit(30),
      collectiveIds.length ? admin.from('surveys').select('title, collective_id').in('collective_id', collectiveIds).is('deleted_at', null).limit(30) : Promise.resolve({ data: [] }),
      admin.from('projects').select('name, collective_id').eq('owner_id', waAccount.userId).is('collective_id', null).is('closed_at', null).limit(20),
      collectiveIds.length ? admin.from('projects').select('name, collective_id').in('collective_id', collectiveIds).is('closed_at', null).limit(20) : Promise.resolve({ data: [] }),
      admin.from('quotes').select('title, collective_id').eq('owner_id', waAccount.userId).is('collective_id', null).neq('status', 'deleted').limit(20),
      collectiveIds.length ? admin.from('quotes').select('title, collective_id').in('collective_id', collectiveIds).neq('status', 'deleted').limit(20) : Promise.resolve({ data: [] }),
    ]);

    const allDocs = [
      ...(pSurveys  || []).map(s => ({ title: s.title, collectiveId: null,            docType: 'survey'  })),
      ...(cSurveys  || []).map(s => ({ title: s.title, collectiveId: s.collective_id, docType: 'survey'  })),
      ...(pProjects || []).map(p => ({ title: p.name,  collectiveId: null,            docType: 'project' })),
      ...(cProjects || []).map(p => ({ title: p.name,  collectiveId: p.collective_id, docType: 'project' })),
      ...(pQuotes   || []).map(q => ({ title: q.title, collectiveId: null,            docType: 'quote'   })),
      ...(cQuotes   || []).map(q => ({ title: q.title, collectiveId: q.collective_id, docType: 'quote'   })),
    ];

    // Check for a unique exact-title match first → auto-resolve silently
    const exactMatches = allDocs.filter(d => d.title && isExactTitleMatch(d.title, messageText));
    if (exactMatches.length === 1) {
      const collectiveId = exactMatches[0].collectiveId ?? null;
      await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: collectiveId });
      return { collectiveId, needsClarification: false };
    }

    // Word-level fuzzy search → collect all matching docs, ranked by score
    const fuzzyMatches = allDocs
      .filter(d => d.title && hasWordMatch(d.title, messageText))
      .map(d => ({ ...d, score: wordMatchScore(d.title, messageText) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // If only exact matches (multiple) or fuzzy matches exist, show a numbered list
    const listCandidates = exactMatches.length > 1
      ? exactMatches.map(d => ({ ...d, score: 1 }))
      : fuzzyMatches;

    if (listCandidates.length > 0) {
      const typeLabel = { survey: 'Felmérés', project: 'Projekt', quote: 'Árajánlat' };
      const options = listCandidates.map(d => {
        const wsName = d.collectiveId
          ? (collectives.find(c => c.id === d.collectiveId)?.name || 'Kollektíva')
          : 'Személyes';
        return {
          id:   d.collectiveId ?? '__personal__',
          name: `${typeLabel[d.docType] || d.docType}: ${d.title} [${wsName}]`,
        };
      });

      await saveClarification(phoneNumber, 'document_list', options, null, { originalContent: messageText });
      return { needsClarification: true, clarificationType: 'document_list', options };
    }
  }

  // 3. No document match → ask which workspace
  const options = [
    { id: '__personal__', name: 'Személyes' },
    ...collectives.map(c => ({ id: c.id, name: c.name })),
  ];
  await saveClarification(phoneNumber, 'workspace_choice', options, null, { originalContent: messageText });
  return { needsClarification: true, clarificationType: 'workspace_choice', clarificationOptions: options };
}
