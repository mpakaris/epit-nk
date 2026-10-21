import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// Creates a confirmed user account for an invitation without requiring email confirmation.
// Safe because the invitee arrived via a link sent to their own email address.
export async function POST(req, { params }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv, error: invErr } = await admin
    .from('collective_invitations')
    .select('id, email, status')
    .eq('token', token)
    .single();

  if (invErr || !inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
  if (inv.status === 'retracted') return Response.json({ error: 'RETRACTED' }, { status: 410 });
  if (inv.status !== 'pending')   return Response.json({ error: `Invitation already ${inv.status}` }, { status: 409 });

  const { name, password } = await req.json();
  if (!name?.trim())    return Response.json({ error: 'Name is required' }, { status: 400 });
  if (!password || password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  // Check if account already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', inv.email)
    .single();

  if (existing) return Response.json({ error: 'ALREADY_EXISTS' }, { status: 409 });

  // Create confirmed user — no email confirmation needed since they clicked the link from their own inbox
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name.trim(),
      must_change_password: false,
      gdpr_consented_at: new Date().toISOString(),
    },
  });

  if (createErr) return Response.json({ error: createErr.message }, { status: 500 });

  logAudit({
    entityId: null,
    userId: created.user.id,
    userName: name.trim(),
    action: 'Account registered via invitation',
    targetType: 'user',
    targetId: created.user.id,
    targetName: inv.email,
    details: { invitation_id: inv.id },
  });

  return Response.json({ ok: true, userId: created.user.id });
}
