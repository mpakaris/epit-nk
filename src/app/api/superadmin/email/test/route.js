import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES, buildOfferDetailHtml } from '@/lib/emailTemplates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return null;
  return user;
}

export async function POST(req) {
  const user = await requireSuperadmin();
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { type, to } = await req.json().catch(() => ({}));
  if (!type || !to) return Response.json({ error: 'type and to are required' }, { status: 400 });

  try {
    const result = await sendTestEmail(type, to);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function sendTestEmail(type, to) {
  switch (type) {

    case 'password_reset': {
      const resetLink = `${APP_URL}/change-password?token=TEST_TOKEN_PREVIEW_ONLY`;
      const html = wrapEmail(`
        <h2 style="font-size:1.2rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem;">Jelszó visszaállítása</h2>
        <p style="color:#475569;font-size:0.875rem;line-height:1.65;margin:0 0 1.5rem;">
          Jelszó visszaállítási kérést kaptunk a <strong>${to}</strong> e-mail címhez tartozó fiókhoz.<br>
          Kattints az alábbi gombra az új jelszó beállításához.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;background:#0f172a;color:#fff;font-weight:700;font-size:0.875rem;padding:0.75rem 1.75rem;border-radius:8px;text-decoration:none;margin-bottom:1.5rem;">
          Jelszó visszaállítása
        </a>
        <p style="color:#94a3b8;font-size:0.78rem;line-height:1.55;margin:0;">
          Ha nem te kérted a visszaállítást, ezt az e-mailt figyelmen kívül hagyhatod.<br>
          A link <strong>1 óráig</strong> érvényes.
        </p>
        <p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL — nem valós visszaállítási link]</p>
      `, 'Jelszó visszaállítása – OkosSzaki');
      await sendEmail({ to, subject: '[TESZT] Jelszó visszaállítása – OkosSzaki', html });
      return { ok: true };
    }

    case 'collective_invitation': {
      const tpl = EMAIL_TEMPLATES.collective_invitation;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { inviter_name: 'Nagy Péter', collective_name: 'Demo Kollektíva' });
      const noteBlock = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#166534;line-height:1.6;">
        OkosSzaki fiókod van — egyszerűen jelentkezz be a meghívó elfogadásához.
       </div>`;
      const bodyHtml = fillTemplate(tpl.bodyHtml, {
        inviter_name:    'Nagy Péter',
        collective_name: 'Demo Kollektíva',
        note_block:      noteBlock,
        cta_label:       'Bejelentkezés és csatlakozás',
        accept_url:      `${APP_URL}/invitations/TEST_TOKEN?accept=1`,
        decline_url:     `${APP_URL}/invitations/TEST_TOKEN?decline=1`,
      });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'member_left': {
      const tpl = EMAIL_TEMPLATES.member_left;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { member_name: 'Kovács Ádám', collective_name: 'Demo Kollektíva' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, { member_name: 'Kovács Ádám', collective_name: 'Demo Kollektíva' });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'member_removed': {
      const tpl = EMAIL_TEMPLATES.member_removed;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { collective_name: 'Demo Kollektíva' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, { owner_name: 'Nagy Péter', collective_name: 'Demo Kollektíva' });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'member_blocked': {
      const tpl = EMAIL_TEMPLATES.member_blocked;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { collective_name: 'Demo Kollektíva' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, { owner_name: 'Nagy Péter', collective_name: 'Demo Kollektíva' });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'invitation_accepted': {
      const tpl = EMAIL_TEMPLATES.invitation_accepted;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { invitee_email: to, collective_name: 'Demo Kollektíva' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, { invitee_email: to, collective_name: 'Demo Kollektíva' });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'invitation_declined': {
      const tpl = EMAIL_TEMPLATES.invitation_declined;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { invitee_email: to, collective_name: 'Demo Kollektíva' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, { invitee_email: to, collective_name: 'Demo Kollektíva' });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'offer_sent': {
      const dummySections = [{ id: 's1', name: 'Festési munkák' }];
      const dummyEntries = [
        { id: 'e1', section_id: 's1', entry_type: 'labour',   work_description: 'Festés – nappali',   quantity: 40, unit: 'm²', unit_price: 1800, amount_huf: 72000 },
        { id: 'e2', section_id: 's1', entry_type: 'material', work_description: 'Latex falfesték',     quantity: 12, unit: 'l',  unit_price: 2500, amount_huf: 30000 },
        { id: 'e3', section_id: 's1', entry_type: 'material', work_description: 'Alapozó',              quantity: 5,  unit: 'l',  unit_price: 1800, amount_huf: 9000  },
      ];
      const netTotal   = 111000;
      const taxRate    = 27;
      const taxAmount  = Math.round(netTotal * taxRate / 100);
      const grossTotal = netTotal + taxAmount;
      const summaryHtml = buildOfferDetailHtml({ sections: dummySections, allEntries: dummyEntries, netTotal, taxRate, taxAmount, grossTotal, validUntil: new Date(Date.now() + 30 * 86400000).toISOString() });
      const tpl = EMAIL_TEMPLATES.offer_sent;
      const subject = '[TESZT] ' + fillTemplate(tpl.subject, { offer_title: 'Festési munkák – Minta utca 12.' });
      const bodyHtml = fillTemplate(tpl.bodyHtml, {
        client_name:       'Minta Ügyfél',
        offer_title:       'Festési munkák – Minta utca 12.',
        offer_summary_html: summaryHtml,
        offer_url:         `${APP_URL}/portal`,
        sender_name:       'Nagy Péter',
      });
      await sendEmail({ to, subject, html: wrapEmail(bodyHtml + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TESZT EMAIL — nincs PDF csatolva]</p>', subject) });
      return { ok: true };
    }

    case 'collective_created': {
      const tpl  = EMAIL_TEMPLATES.collective_created;
      const vars = { owner_name: 'Nagy Péter', collective_name: 'Demo Kollektíva', manage_url: `${APP_URL}/kollektivak` };
      const subject = '[TEST] ' + fillTemplate(tpl.subject, vars);
      await sendEmail({ to, subject, html: wrapEmail(fillTemplate(tpl.bodyHtml, vars) + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TEST EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'collective_renamed': {
      const tpl  = EMAIL_TEMPLATES.collective_renamed;
      const vars = { old_name: 'Régi Csapat Neve', new_name: 'Demo Kollektíva', manager_name: 'Nagy Péter' };
      const subject = '[TEST] ' + fillTemplate(tpl.subject, vars);
      await sendEmail({ to, subject, html: wrapEmail(fillTemplate(tpl.bodyHtml, vars) + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TEST EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'collective_deleted': {
      const tpl  = EMAIL_TEMPLATES.collective_deleted;
      const vars = { collective_name: 'Demo Kollektíva', owner_name: 'Nagy Péter' };
      const subject = '[TEST] ' + fillTemplate(tpl.subject, vars);
      await sendEmail({ to, subject, html: wrapEmail(fillTemplate(tpl.bodyHtml, vars) + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TEST EMAIL]</p>', subject) });
      return { ok: true };
    }

    case 'member_unblocked': {
      const tpl  = EMAIL_TEMPLATES.member_unblocked;
      const vars = { owner_name: 'Nagy Péter', collective_name: 'Demo Kollektíva', app_url: APP_URL };
      const subject = '[TEST] ' + fillTemplate(tpl.subject, vars);
      await sendEmail({ to, subject, html: wrapEmail(fillTemplate(tpl.bodyHtml, vars) + '<p style="color:#dc2626;font-size:0.72rem;margin-top:1rem;">[TEST EMAIL]</p>', subject) });
      return { ok: true };
    }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}
