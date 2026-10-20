import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';

// No auth required — token is the proof of identity for declining
export async function POST(req, { params }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv, error: invErr } = await admin
    .from('collective_invitations')
    .select('id, email, status, invited_by, collective_id, collectives(name)')
    .eq('token', token)
    .single();

  if (invErr || !inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
  if (inv.status !== 'pending') return Response.json({ error: `Invitation already ${inv.status}` }, { status: 409 });

  await admin.from('collective_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', inv.id);

  // Notify owner — direct query avoids ambiguous FK join
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', inv.invited_by)
    .single();
  const ownerEmail = ownerProfile?.email;
  if (ownerEmail) {
    const tpl = EMAIL_TEMPLATES.invitation_declined;
    const vars = { invitee_email: inv.email, collective_name: inv.collectives?.name ?? '' };
    try {
      await sendEmail({
        to: ownerEmail,
        subject: fillTemplate(tpl.subject, vars),
        html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)),
      });
    } catch { /* non-critical */ }
  }

  logAudit({
    entityId:   inv.collective_id,
    userId:     null,
    userName:   inv.email,
    action:     'Meghívó elutasítva',
    targetType: 'collective',
    targetId:   inv.collective_id,
    targetName: inv.collectives?.name,
  });

  return Response.json({ ok: true });
}
