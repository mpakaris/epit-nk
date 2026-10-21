import { logAudit } from '@/lib/audit';

// Whitelist of actions that can be logged without an authenticated session
const PUBLIC_ACTIONS = new Set([
  'Login failed',
  'Login success',
  'Password reset requested',
  'Password reset completed',
  'Password reset failed',
  'Registration failed',
]);

// POST — unauthenticated audit events (auth failures, password resets, etc.)
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  const { action, userName, entityId, targetName, details } = body;

  if (!action || !PUBLIC_ACTIONS.has(action)) {
    return Response.json({ error: 'Action not allowed' }, { status: 400 });
  }

  await logAudit({
    entityId:   entityId   || null,
    userId:     null,
    userName:   userName   || '',
    action,
    targetType: null,
    targetId:   null,
    targetName: targetName || null,
    details:    details    || null,
  });

  return Response.json({ ok: true });
}
