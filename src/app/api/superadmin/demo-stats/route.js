import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Run all aggregation queries in parallel
  const [summaryRes, dailyRes, landingRes, navRes, pathsRes, recentRes] = await Promise.all([

    // Overall summary (last 30 days)
    admin.from('demo_events').select('session_id, created_at, event').gte('created_at', daysAgo(30)),

    // Events per day (last 14 days) — grouped client-side from raw data
    admin.from('demo_events')
      .select('created_at, session_id, event')
      .gte('created_at', daysAgo(14))
      .order('created_at', { ascending: true }),

    // Landing page clicks — all time
    admin.from('demo_events')
      .select('label, props, created_at')
      .eq('event', 'landing_click')
      .order('created_at', { ascending: false }),

    // Nav clicks inside demo — all time
    admin.from('demo_events')
      .select('label, target')
      .eq('event', 'nav_click'),

    // Page views inside demo — all time
    admin.from('demo_events')
      .select('path, session_id')
      .eq('event', 'page_view'),

    // Recent 60 events
    admin.from('demo_events')
      .select('id, created_at, session_id, ip_hash, country, event, path, label, target, props')
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  const summary30  = summaryRes.data  || [];
  const daily14    = dailyRes.data    || [];
  const landing    = landingRes.data  || [];
  const navClicks  = navRes.data      || [];
  const pageViews  = pathsRes.data    || [];
  const recent     = recentRes.data   || [];

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totalSessions = new Set(summary30.map(e => e.session_id)).size;
  const totalEvents   = summary30.length;
  const todayStr      = new Date().toISOString().slice(0, 10);
  const todayEvents   = summary30.filter(e => e.created_at?.startsWith(todayStr));
  const todaySessions = new Set(todayEvents.map(e => e.session_id)).size;
  const todayClicks   = todayEvents.length;

  // ── Daily breakdown ──────────────────────────────────────────────────────────
  const byDay = {};
  for (const e of daily14) {
    const day = e.created_at?.slice(0, 10);
    if (!day) continue;
    if (!byDay[day]) byDay[day] = { sessions: new Set(), events: 0 };
    byDay[day].sessions.add(e.session_id);
    byDay[day].events++;
  }
  const dailyChart = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, sessions: v.sessions.size, events: v.events }));

  // ── Landing page clicks ──────────────────────────────────────────────────────
  const landingCount = {};
  for (const e of landing) {
    const key = e.label || '(ismeretlen)';
    if (!landingCount[key]) landingCount[key] = { label: key, clicks: 0, locations: {} };
    landingCount[key].clicks++;
    const loc = e.props?.location || 'unknown';
    landingCount[key].locations[loc] = (landingCount[key].locations[loc] || 0) + 1;
  }
  const landingStats = Object.values(landingCount).sort((a, b) => b.clicks - a.clicks);

  // ── Demo nav clicks ──────────────────────────────────────────────────────────
  const navCount = {};
  for (const e of navClicks) {
    const key = e.label || e.target || '?';
    navCount[key] = (navCount[key] || 0) + 1;
  }
  const navStats = Object.entries(navCount)
    .map(([label, clicks]) => ({ label, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  // ── Demo page views ──────────────────────────────────────────────────────────
  const pathCount = {};
  for (const e of pageViews) {
    const key = e.path || '/demo';
    if (!pathCount[key]) pathCount[key] = { path: key, views: 0, sessions: new Set() };
    pathCount[key].views++;
    if (e.session_id) pathCount[key].sessions.add(e.session_id);
  }
  const pathStats = Object.values(pathCount)
    .map(({ path, views, sessions }) => ({ path, views, uniq: sessions.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  return Response.json({
    summary: { totalSessions, totalEvents, todaySessions, todayClicks },
    dailyChart,
    landingStats,
    navStats,
    pathStats,
    recent,
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
