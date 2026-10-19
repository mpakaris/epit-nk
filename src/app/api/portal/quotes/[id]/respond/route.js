import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';

export async function POST(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action, comment = '' } = body;
  // action: 'accepted' | 'rejected' | 'question'
  if (!['accepted', 'rejected', 'question'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: quote } = await admin
    .from('quotes')
    .select('id, client_id, owner_id, status, title')
    .eq('id', id)
    .single();

  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });
  if (quote.status !== 'sent') return Response.json({ error: 'Ez az ajánlat nem módosítható' }, { status: 400 });

  // Verify the quote belongs to a client with this portal user's email
  const { data: client } = await admin
    .from('clients')
    .select('id, name')
    .eq('id', quote.client_id)
    .ilike('email', user.email.toLowerCase())
    .single();

  if (!client) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch contractor email for notifications
  const { data: contractor } = await admin
    .from('profiles')
    .select('display_name, company_name, email')
    .eq('id', quote.owner_id)
    .single();

  const contractorEmail = contractor?.email;
  const contractorName  = contractor?.company_name || contractor?.display_name || 'Vállalkozó';

  // Update quote status (not for 'question' — that keeps it as 'sent')
  if (action !== 'question') {
    const { error: updateErr } = await admin
      .from('quotes')
      .update({ status: action })
      .eq('id', id);
    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });
  }

  // Persist comment to history
  await admin.from('quote_client_comments').insert({
    quote_id:     id,
    action,
    comment:      comment.trim() || null,
    client_email: user.email,
    client_name:  client.name,
  }).catch(() => {});

  // Send email notification to contractor
  if (contractorEmail) {
    try {
      const subjectMap = {
        accepted: `✅ Elfogadott ajánlat: ${quote.title}`,
        rejected: `❌ Elutasított ajánlat: ${quote.title}`,
        question: `💬 Kérdés az ajánlathoz: ${quote.title}`,
      };
      const introMap = {
        accepted: `<p style="color:#15803d;font-weight:700;font-size:1rem;">Az ügyfél elfogadta az ajánlatot.</p>`,
        rejected: `<p style="color:#b91c1c;font-weight:700;font-size:1rem;">Az ügyfél elutasította az ajánlatot.</p>`,
        question: `<p style="color:#1e40af;font-weight:700;font-size:1rem;">Az ügyfél kérdést / módosítási kérelmet küldött.</p>`,
      };
      const bodyHtml = `
        <p>Kedves ${contractorName}!</p>
        ${introMap[action]}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;width:120px;">Ajánlat</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.title}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;">Ügyfél</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${client.name} (${user.email})</td></tr>
        </table>
        ${comment.trim() ? `
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0369a1;">
              ${action === 'question' ? 'Üzenet' : 'Indoklás'}
            </p>
            <p style="margin:0;color:#0c4a6e;white-space:pre-wrap;">${comment.trim()}</p>
          </div>` : ''}
        <p style="color:#64748b;font-size:14px;">Az ügyfél a portálon keresztül válaszolt.</p>
      `;
      await sendEmail({
        to: contractorEmail,
        replyTo: user.email,
        subject: subjectMap[action],
        html: wrapEmail(bodyHtml, subjectMap[action]),
      });
    } catch { /* email failure is non-fatal */ }
  }

  return Response.json({ ok: true, status: action !== 'question' ? action : 'sent' });
}
