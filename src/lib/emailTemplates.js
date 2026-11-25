const APP_NAME = process.env.GOOGLE_APP_NAME || 'OkosSzaki';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://okosszaki.hu';

const VALID_LOCALES = ['hu', 'de', 'en'];
function lang(locale) { return VALID_LOCALES.includes(locale) ? locale : 'hu'; }

export function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── Design tokens (email-safe) ────────────────────────────────────────────────
const C = {
  sand:        '#EDEBE5',   // canvas / body bg
  sandDark:    '#E0DDD5',   // border / divider
  ink:         '#0E1116',   // primary text
  inkMid:      '#3A3F4A',   // secondary text
  inkMute:     '#6B7080',   // muted text
  white:       '#ffffff',
  navy:        '#1F2A3C',   // header bg (dk-mod-projects dark)
  navyLight:   '#263248',   // accent
  green:       '#0A6B5E',   // accept / positive
  greenLight:  '#D4EDE9',   // accept bg tint
  red:         '#B71C1C',   // decline / danger
  redLight:    '#FDECEC',   // decline bg tint
  amber:       '#B45309',   // warning
  amberLight:  '#FFF7E6',   // warning bg tint
  blue:        '#1D4ED8',   // info
  blueLight:   '#EFF6FF',   // info bg tint
};

const BTN = (bg, color, href, text) =>
  `<a href="${href}" style="display:inline-block;padding:14px 28px;background:${bg};color:${color};font-size:14px;font-weight:800;border-radius:22px;text-decoration:none;letter-spacing:0.01em;">${text}</a>`;

const WRAP_I18N = {
  hu: { badge: 'Automatikus értesítő',      footer: `Ezt az e-mailt automatikusan küldte a <strong>${APP_NAME}</strong>.<br>Kérjük, ne válaszoljon erre az üzenetre.` },
  de: { badge: 'Automatische Benachrichtigung', footer: `Diese E-Mail wurde automatisch von <strong>${APP_NAME}</strong> gesendet.<br>Bitte antworten Sie nicht auf diese Nachricht.` },
  en: { badge: 'Automated notification',    footer: `This email was sent automatically by <strong>${APP_NAME}</strong>.<br>Please do not reply to this message.` },
};

export function wrapEmail(bodyHtml, preheader = '', locale = 'hu') {
  const l = lang(locale);
  const w = WRAP_I18N[l];
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${C.sand};font-family:'Plus Jakarta Sans',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader}</div>` : ''}
  <div style="max-width:600px;margin:40px auto;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(14,17,22,0.12);">

    <!-- Header -->
    <div style="background:${C.navy};padding:24px 32px;display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
      </div>
      <div>
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">${w.badge}</p>
        <p style="margin:2px 0 0;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">${APP_NAME}</p>
      </div>
    </div>

    <!-- Body -->
    <div style="background:${C.white};padding:32px;">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="background:${C.sand};padding:16px 32px;border-top:1px solid ${C.sandDark};">
      <p style="margin:0;color:${C.inkMute};font-size:11px;line-height:1.6;">${w.footer}</p>
    </div>

  </div>
</body>
</html>`;
}

// ── Shared snippets ───────────────────────────────────────────────────────────

function divider() {
  return `<hr style="border:none;border-top:1px solid ${C.sandDark};margin:24px 0;">`;
}

function infoBox(color, bg, iconHtml, content) {
  return `<div style="background:${bg};border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
  <div style="flex-shrink:0;width:32px;height:32px;border-radius:10px;background:${color};display:flex;align-items:center;justify-content:center;">${iconHtml}</div>
  <div style="flex:1;font-size:14px;color:${C.inkMid};line-height:1.6;">${content}</div>
</div>`;
}

// ── EMAIL_TEMPLATES (kept for backward compat — legacy callers) ───────────────

export const EMAIL_TEMPLATES = {
  collective_invitation: {
    id: 'collective_invitation',
    name: 'Collective invitation',
    subject: '{{inviter_name}} invited you to join {{collective_name}}',
    bodyHtml: `<p style="margin:0 0 16px;font-size:15px;color:${C.ink};line-height:1.6;"><strong>{{inviter_name}}</strong> meghívott a(z) <strong>{{collective_name}}</strong> kollektívába.</p>{{note_block}}<table style="border-collapse:collapse;margin-bottom:20px;"><tr><td style="padding-right:12px;">${BTN(C.green, '#fff', '{{accept_url}}', '✓ {{cta_label}}')}</td><td>${BTN(C.red, '#fff', '{{decline_url}}', '✕ Visszautasítás')}</td></tr></table>`,
  },
};

// ── Localized templates ───────────────────────────────────────────────────────

const TEMPLATES_I18N = {

  collective_invitation: {
    subject: {
      hu: '{{inviter_name}} meghívott a(z) {{collective_name}} kollektívába',
      de: '{{inviter_name}} hat Sie zum Kollektiv {{collective_name}} eingeladen',
      en: '{{inviter_name}} invited you to join {{collective_name}}',
    },
    bodyHtml: {
      hu: (APP) => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Meghívó érkezett</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">
  <strong style="color:${C.ink};">{{inviter_name}}</strong> meghívott a(z)
  <strong style="color:${C.ink};">{{collective_name}}</strong> kollektívába a <strong>${APP}</strong> platformon.
</p>

{{note_block}}

<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">
  A kollektíva egy megosztott munkaterület, ahol közösen kezelheted a projekteket, árajánlatokat és számlákat.
</p>

<table style="border-collapse:collapse;margin-bottom:28px;">
  <tr>
    <td style="padding-right:12px;">${BTN(C.green, '#fff', '{{accept_url}}', '✓ {{cta_label}}')}</td>
    <td>${BTN(C.red, '#fff', '{{decline_url}}', '✕ Visszautasítás')}</td>
  </tr>
</table>

${divider()}
<p style="margin:0;font-size:12px;color:${C.inkMute};line-height:1.6;">Ha nem vártál ilyen meghívót, egyszerűen hagyd figyelmen kívül ezt az e-mailt.</p>`,

      de: (APP) => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Einladung erhalten</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">
  <strong style="color:${C.ink};">{{inviter_name}}</strong> hat Sie zum Kollektiv
  <strong style="color:${C.ink};">{{collective_name}}</strong> auf <strong>${APP}</strong> eingeladen.
</p>
{{note_block}}
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">
  Ein Kollektiv ist ein gemeinsamer Arbeitsbereich, in dem Sie Projekte, Angebote und Rechnungen gemeinsam verwalten können.
</p>
<table style="border-collapse:collapse;margin-bottom:28px;">
  <tr>
    <td style="padding-right:12px;">${BTN(C.green, '#fff', '{{accept_url}}', '✓ {{cta_label}}')}</td>
    <td>${BTN(C.red, '#fff', '{{decline_url}}', '✕ Ablehnen')}</td>
  </tr>
</table>
${divider()}
<p style="margin:0;font-size:12px;color:${C.inkMute};line-height:1.6;">Wenn Sie diese Einladung nicht erwartet haben, ignorieren Sie diese E-Mail.</p>`,

      en: (APP) => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">You've been invited</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">
  <strong style="color:${C.ink};">{{inviter_name}}</strong> has invited you to join
  <strong style="color:${C.ink};">{{collective_name}}</strong> on <strong>${APP}</strong>.
</p>
{{note_block}}
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">
  A collective is a shared workspace where you can jointly manage projects, quotes and invoices.
</p>
<table style="border-collapse:collapse;margin-bottom:28px;">
  <tr>
    <td style="padding-right:12px;">${BTN(C.green, '#fff', '{{accept_url}}', '✓ {{cta_label}}')}</td>
    <td>${BTN(C.red, '#fff', '{{decline_url}}', '✕ Decline')}</td>
  </tr>
</table>
${divider()}
<p style="margin:0;font-size:12px;color:${C.inkMute};line-height:1.6;">If you weren't expecting this invitation, simply ignore this email.</p>`,
    },
  },

  portal_link_sent: {
    subject: {
      hu: 'Hozzáférés az ügyfélportálhoz',
      de: 'Zugang zu Ihrem Kundenportal',
      en: 'Access your client portal',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Ügyfélportál</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">Kedves <strong style="color:${C.ink};">{{client_name}}</strong>!</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Az alábbi linken elérheti saját ügyfélportálját, ahol megtekintheti az Önnek küldött árajánlatokat és projekteket.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  ${['Kattintson az alábbi gombra a portál megnyitásához.', `Adja meg email-címét: <strong style="color:${C.ink};font-family:monospace;">{{client_email}}</strong>`, 'Kap egy <strong>6 jegyű egyszer használatos kódot</strong> emailben.', 'Írja be a kódot — máris megtekintheti az árajánlatokat.'].map((step, i) => `
  <tr>
    <td style="padding:10px 14px;vertical-align:top;width:36px;">
      <div style="width:28px;height:28px;border-radius:14px;background:${i === 3 ? C.navyLight : C.navy};color:#fff;font-size:13px;font-weight:800;text-align:center;line-height:28px;">${i + 1}</div>
    </td>
    <td style="padding:10px 0;font-size:14px;color:${C.inkMid};line-height:1.6;border-bottom:1px solid ${C.sandDark};">${step}</td>
  </tr>`).join('')}
</table>
<div style="text-align:center;margin-bottom:28px;">${BTN(C.navyLight, '#fff', '{{portal_url}}', 'Portál megnyitása →')}</div>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,

      de: () => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Kundenportal</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">Sehr geehrte/r <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Über den folgenden Link können Sie Ihr persönliches Kundenportal aufrufen.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  ${['Klicken Sie auf die Schaltfläche unten.', `Geben Sie Ihre E-Mail-Adresse ein: <strong style="color:${C.ink};font-family:monospace;">{{client_email}}</strong>`, 'Sie erhalten einen <strong>6-stelligen Einmal-Code</strong> per E-Mail.', 'Geben Sie den Code ein — und Sie können Ihre Angebote einsehen.'].map((step, i) => `
  <tr>
    <td style="padding:10px 14px;vertical-align:top;width:36px;">
      <div style="width:28px;height:28px;border-radius:14px;background:${i === 3 ? C.navyLight : C.navy};color:#fff;font-size:13px;font-weight:800;text-align:center;line-height:28px;">${i + 1}</div>
    </td>
    <td style="padding:10px 0;font-size:14px;color:${C.inkMid};line-height:1.6;border-bottom:1px solid ${C.sandDark};">${step}</td>
  </tr>`).join('')}
</table>
<div style="text-align:center;margin-bottom:28px;">${BTN(C.navyLight, '#fff', '{{portal_url}}', 'Kundenportal öffnen →')}</div>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,

      en: () => `
<h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Client portal</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">Dear <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">You can access your personal client portal at the link below.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  ${['Click the button below to open the portal.', `Enter your email: <strong style="color:${C.ink};font-family:monospace;">{{client_email}}</strong>`, "You'll receive a <strong>6-digit one-time code</strong> by email.", "Enter the code — and you're in."].map((step, i) => `
  <tr>
    <td style="padding:10px 14px;vertical-align:top;width:36px;">
      <div style="width:28px;height:28px;border-radius:14px;background:${i === 3 ? C.navyLight : C.navy};color:#fff;font-size:13px;font-weight:800;text-align:center;line-height:28px;">${i + 1}</div>
    </td>
    <td style="padding:10px 0;font-size:14px;color:${C.inkMid};line-height:1.6;border-bottom:1px solid ${C.sandDark};">${step}</td>
  </tr>`).join('')}
</table>
<div style="text-align:center;margin-bottom:28px;">${BTN(C.navyLight, '#fff', '{{portal_url}}', 'Open client portal →')}</div>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
    },
  },

  invoice_sent: {
    subject: {
      hu: 'Számla: {{invoice_label}} – {{project_name}}',
      de: 'Rechnung: {{invoice_label}} – {{project_name}}',
      en: 'Invoice: {{invoice_label}} – {{project_name}}',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Számla</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Kedves <strong style="color:${C.ink};">{{client_name}}</strong>!</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">Csatolva megtalálja a(z) <strong style="color:${C.ink};">{{project_name}}</strong> projekthez kiállított <strong style="color:${C.ink};">{{invoice_label}}</strong> tárgyú számlát (<strong>{{invoice_amount}}</strong>).</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">Kérdés esetén kérjük, forduljon hozzánk bizalommal!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
      de: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Rechnung</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Sehr geehrte/r <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">anbei erhalten Sie die Rechnung <strong style="color:${C.ink};">{{invoice_label}}</strong> (<strong>{{invoice_amount}}</strong>) für das Projekt <strong style="color:${C.ink};">{{project_name}}</strong>.</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
      en: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Invoice</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Dear <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">Please find attached invoice <strong style="color:${C.ink};">{{invoice_label}}</strong> (<strong>{{invoice_amount}}</strong>) for project <strong style="color:${C.ink};">{{project_name}}</strong>.</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">If you have any questions, please don't hesitate to get in touch!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
    },
  },

  offer_sent: {
    subject: {
      hu: 'Árajánlat: {{offer_title}}',
      de: 'Angebot: {{offer_title}}',
      en: 'Quote: {{offer_title}}',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Árajánlat</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Kedves <strong style="color:${C.ink};">{{client_name}}</strong>!</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">Az alábbiakban megtalálja a(z) <strong style="color:${C.ink};">{{offer_title}}</strong> tárgyú árajánlatot.</p>
{{offer_summary_html}}
<p style="margin:24px 0 8px;font-size:14px;color:${C.inkMute};line-height:1.7;">Az ajánlatot PDF-ben csatolva is megtalálja ebben az e-mailben.</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">Kérdés esetén kérjük, forduljon hozzánk bizalommal!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
      de: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Angebot</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Sehr geehrte/r <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">im Folgenden finden Sie das Angebot <strong style="color:${C.ink};">{{offer_title}}</strong>.</p>
{{offer_summary_html}}
<p style="margin:24px 0 8px;font-size:14px;color:${C.inkMute};line-height:1.7;">Das Angebot finden Sie auch als PDF-Anhang in dieser E-Mail.</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
      en: () => `
<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Quote</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Dear <strong style="color:${C.ink};">{{client_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:14px;color:${C.inkMute};line-height:1.7;">Please find below the quote for <strong style="color:${C.ink};">{{offer_title}}</strong>.</p>
{{offer_summary_html}}
<p style="margin:24px 0 8px;font-size:14px;color:${C.inkMute};line-height:1.7;">You will also find the quote attached as a PDF to this email.</p>
<p style="margin:0 0 28px;font-size:14px;color:${C.inkMute};line-height:1.7;">If you have any questions, please don't hesitate to get in touch!</p>
<p style="margin:0;font-size:14px;color:${C.ink};font-weight:700;">{{sender_name}}</p>`,
    },
  },

  member_removed: {
    subject: {
      hu: 'Eltávolítottak a(z) {{collective_name}} kollektívából',
      de: 'Sie wurden aus dem Kollektiv {{collective_name}} entfernt',
      en: 'You have been removed from {{collective_name}}',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Eltávolítás a kollektívából</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> eltávolított a(z) <strong style="color:${C.ink};">{{collective_name}}</strong> kollektívából.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">Többé nem férsz hozzá a kollektíva projektjeihez és dokumentumaihoz. Ha ez tévedés volt, vedd fel a kapcsolatot a tulajdonossal.</p>`,
      de: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Aus Kollektiv entfernt</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> hat Sie aus dem Kollektiv <strong style="color:${C.ink};">{{collective_name}}</strong> entfernt.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">Sie haben keinen Zugriff mehr auf die Projekte. Wenden Sie sich bei Fragen an den Eigentümer.</p>`,
      en: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Removed from collective</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> has removed you from <strong style="color:${C.ink};">{{collective_name}}</strong>.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">You no longer have access to the collective's projects. Contact the owner if this was a mistake.</p>`,
    },
  },

  member_blocked: {
    subject: {
      hu: 'Kitiltottak a(z) {{collective_name}} kollektívából',
      de: 'Sie wurden aus dem Kollektiv {{collective_name}} gesperrt',
      en: 'You have been blocked from {{collective_name}}',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Hozzáférés letiltva</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> letiltotta a hozzáférésedet a(z) <strong style="color:${C.ink};">{{collective_name}}</strong> kollektívához.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">Ha úgy gondolod, hogy ez tévedés volt, vedd fel a kapcsolatot a kollektíva tulajdonosával.</p>`,
      de: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Zugriff gesperrt</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> hat Ihren Zugriff auf das Kollektiv <strong style="color:${C.ink};">{{collective_name}}</strong> gesperrt.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">Wenden Sie sich bei Fragen an den Eigentümer des Kollektivs.</p>`,
      en: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Access blocked</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> has blocked your access to <strong style="color:${C.ink};">{{collective_name}}</strong>.</p>
<p style="margin:0;font-size:14px;color:${C.inkMute};line-height:1.6;">If you believe this was a mistake, please contact the collective owner.</p>`,
    },
  },

  member_unblocked: {
    subject: {
      hu: 'Újra hozzáférésed van: {{collective_name}}',
      de: 'Ihr Zugriff wurde wiederhergestellt: {{collective_name}}',
      en: 'Your access has been restored: {{collective_name}}',
    },
    bodyHtml: {
      hu: (APP) => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Hozzáférés visszaállítva</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> feloldotta a hozzáférésedet a(z) <strong style="color:${C.ink};">{{collective_name}}</strong> kollektívához.</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Újra hozzáférhetsz a kollektíva projektjeihez és dokumentumaihoz.</p>
${BTN(C.green, '#fff', '{{app_url}}', 'Belépés az alkalmazásba →')}`,
      de: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Zugriff wiederhergestellt</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> hat Ihren Zugriff auf <strong style="color:${C.ink};">{{collective_name}}</strong> wiederhergestellt.</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Sie haben wieder Zugriff auf die Projekte und Dokumente.</p>
${BTN(C.green, '#fff', '{{app_url}}', 'Zur App →')}`,
      en: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Access restored</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;"><strong style="color:${C.ink};">{{owner_name}}</strong> has restored your access to <strong style="color:${C.ink};">{{collective_name}}</strong>.</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">You can once again access the collective's projects and documents.</p>
${BTN(C.green, '#fff', '{{app_url}}', 'Open the app →')}`,
    },
  },

  collective_created: {
    subject: {
      hu: 'Kollektívád létrejött: {{collective_name}}',
      de: 'Ihr Kollektiv wurde erstellt: {{collective_name}}',
      en: 'Your collective has been created: {{collective_name}}',
    },
    bodyHtml: {
      hu: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Kollektíva létrehozva</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Szia <strong style="color:${C.ink};">{{owner_name}}</strong>!</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Sikeresen létrehoztad a(z) <strong style="color:${C.ink};">{{collective_name}}</strong> kollektívát. Már meghívhatod a csapattagjaidat, és közösen dolgozhattok a projektjeiteken.</p>
${BTN(C.navy, '#fff', '{{manage_url}}', 'Kollektíva kezelése →')}`,
      de: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Kollektiv erstellt</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Hallo <strong style="color:${C.ink};">{{owner_name}}</strong>!</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">Sie haben das Kollektiv <strong style="color:${C.ink};">{{collective_name}}</strong> erfolgreich erstellt.</p>
${BTN(C.navy, '#fff', '{{manage_url}}', 'Kollektiv verwalten →')}`,
      en: () => `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">Collective created</h2>
<p style="margin:0 0 16px;font-size:15px;color:${C.inkMid};line-height:1.6;">Hello <strong style="color:${C.ink};">{{owner_name}}</strong>!</p>
<p style="margin:0 0 24px;font-size:14px;color:${C.inkMute};line-height:1.7;">You have successfully created the collective <strong style="color:${C.ink};">{{collective_name}}</strong>.</p>
${BTN(C.navy, '#fff', '{{manage_url}}', 'Manage collective →')}`,
    },
  },

};

export function getEmailContent(templateId, locale = 'hu', vars = {}) {
  const l = lang(locale);
  const localized = TEMPLATES_I18N[templateId];
  const fallback  = EMAIL_TEMPLATES[templateId];
  if (!localized && !fallback) return null;

  const rawSubject = localized?.subject?.[l] || localized?.subject?.hu || fallback?.subject || '';
  const bodyFn     = localized?.bodyHtml?.[l] || localized?.bodyHtml?.hu;
  const rawBody    = bodyFn ? bodyFn(APP_NAME) : (fallback?.bodyHtml || '');

  return {
    subject:  fillTemplate(rawSubject, vars),
    bodyHtml: fillTemplate(rawBody, vars),
  };
}

// ── Offer detail HTML ─────────────────────────────────────────────────────────

const TYPE_LABELS = { material: 'Anyag', labour: 'Munkadíj', equipment: 'Gép/Eszköz', transport: 'Szállítás', other: 'Egyéb' };
const TYPE_COLORS = {
  material:  { bg: C.blueLight, color: C.blue },
  labour:    { bg: C.greenLight, color: C.green },
  equipment: { bg: '#FFF7ED', color: '#C2410C' },
  transport: { bg: '#F5F3FF', color: '#7C3AED' },
  other:     { bg: C.sand, color: C.inkMute },
};

export function buildOfferDetailHtml({ sections, allEntries, netTotal, taxRate, taxAmount, grossTotal, validUntil }) {
  const fmt = (n) => Number(n).toLocaleString('hu-HU') + ' Ft';

  const sectionsHtml = sections.map(section => {
    const entries = allEntries.filter(e => e.section_id === section.id);
    if (!entries.length) return '';
    const sectionTotal = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    const rowsHtml = entries.map((e, i) => {
      const t = TYPE_COLORS[e.entry_type] || TYPE_COLORS.other;
      return `<tr style="background:${i % 2 === 0 ? C.white : C.sand};">
        <td style="padding:8px 10px;font-size:12px;color:${C.ink};border-bottom:1px solid ${C.sandDark};">
          ${e.work_description || ''}
          <span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;background:${t.bg};color:${t.color};margin-left:5px;">${TYPE_LABELS[e.entry_type] || 'Egyéb'}</span>
          ${e.notes ? `<div style="font-size:11px;color:${C.inkMute};margin-top:1px;">${e.notes}</div>` : ''}
        </td>
        <td style="padding:8px 10px;font-size:12px;color:${C.inkMute};text-align:right;white-space:nowrap;border-bottom:1px solid ${C.sandDark};">${e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</td>
        <td style="padding:8px 10px;font-size:12px;color:${C.inkMute};text-align:right;white-space:nowrap;border-bottom:1px solid ${C.sandDark};">${e.unit_price != null ? fmt(e.unit_price) : '—'}</td>
        <td style="padding:8px 10px;font-size:12px;font-weight:700;color:${C.ink};text-align:right;white-space:nowrap;border-bottom:1px solid ${C.sandDark};">${fmt(e.amount_huf || 0)}</td>
      </tr>`;
    }).join('');

    return `<div style="margin-bottom:16px;">
      <div style="background:${C.navy};color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;font-size:12px;font-weight:800;display:flex;justify-content:space-between;align-items:center;">
        <span>${section.name || 'Általános'}</span><span style="opacity:0.7;">${fmt(sectionTotal)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid ${C.sandDark};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <thead><tr style="background:${C.sand};">
          <th style="padding:6px 10px;font-size:11px;font-weight:700;color:${C.inkMute};text-align:left;border-bottom:1px solid ${C.sandDark};">Megnevezés</th>
          <th style="padding:6px 10px;font-size:11px;font-weight:700;color:${C.inkMute};text-align:right;border-bottom:1px solid ${C.sandDark};white-space:nowrap;">Menny.</th>
          <th style="padding:6px 10px;font-size:11px;font-weight:700;color:${C.inkMute};text-align:right;border-bottom:1px solid ${C.sandDark};white-space:nowrap;">Egységár</th>
          <th style="padding:6px 10px;font-size:11px;font-weight:700;color:${C.inkMute};text-align:right;border-bottom:1px solid ${C.sandDark};white-space:nowrap;">Összeg</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }).join('');

  return `${sectionsHtml}
<table style="width:100%;border-collapse:collapse;border:1px solid ${C.sandDark};border-radius:12px;overflow:hidden;margin-top:8px;">
  <tr><td style="padding:9px 10px;font-size:13px;color:${C.inkMute};border-bottom:1px solid ${C.sandDark};">Nettó összeg</td><td style="padding:9px 10px;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid ${C.sandDark};white-space:nowrap;">${fmt(netTotal)}</td></tr>
  ${taxRate > 0 ? `<tr><td style="padding:9px 10px;font-size:13px;color:${C.inkMute};border-bottom:1px solid ${C.sandDark};">ÁFA (${taxRate}%)</td><td style="padding:9px 10px;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid ${C.sandDark};white-space:nowrap;">${fmt(taxAmount)}</td></tr>` : ''}
  <tr style="background:${C.navy};"><td style="padding:11px 10px;font-size:14px;font-weight:800;color:#fff;">Bruttó összesen</td><td style="padding:11px 10px;font-size:16px;font-weight:800;color:#fff;text-align:right;white-space:nowrap;">${fmt(grossTotal)}</td></tr>
</table>
${validUntil ? `<p style="margin:12px 0 0;font-size:12px;color:${C.inkMute};text-align:right;">Érvényes: <strong style="color:${C.inkMid};">${new Date(validUntil).toLocaleDateString('hu-HU')}</strong></p>` : ''}`;
}

export function buildOfferSummaryHtml(opts) {
  return buildOfferDetailHtml({ sections: [], allEntries: [], ...opts });
}

export function buildOtpEmailHtml(code, locale = 'hu') {
  const l = lang(locale);
  const copy = {
    hu: { heading: 'Belépési kód', body: 'Az alábbi kóddal léphet be az ügyfélkapuján:', expiry: 'A kód 15 percig érvényes.', note: 'Ha nem Ön kérte ezt a kódot, hagyja figyelmen kívül ezt az e-mailt.' },
    de: { heading: 'Anmeldecode',  body: 'Verwenden Sie den folgenden Code, um sich anzumelden:',   expiry: 'Der Code ist 15 Minuten lang gültig.',  note: 'Falls Sie diesen Code nicht angefordert haben, ignorieren Sie diese E-Mail.' },
    en: { heading: 'Login code',   body: 'Use the following code to log in to your client portal:', expiry: 'The code is valid for 15 minutes.',       note: "If you didn't request this code, please ignore this email." },
  };
  const c = copy[l] || copy.hu;
  return `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">${c.heading}</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">${c.body}</p>
<div style="margin:0 auto 24px;padding:20px 24px;background:${C.sand};border:2px solid ${C.sandDark};border-radius:16px;text-align:center;letter-spacing:0.25em;font-size:2rem;font-weight:900;font-family:monospace;color:${C.navy};">${code}</div>
<p style="margin:0 0 8px;font-size:13px;color:${C.inkMute};">${c.expiry}</p>
<p style="margin:0;font-size:12px;color:${C.inkMute};">${c.note}</p>`;
}

export function buildPortalCtaHtml(portalUrl, locale = 'hu') {
  const l = lang(locale);
  const copy = {
    hu: { title: 'Tekintse meg ajánlatait és projektjeit az ügyfélkapuján', btn: 'Ügyfélkapu megnyitása →', note: 'Belépéshez csak az e-mail cím szükséges – regisztráció nem szükséges.' },
    de: { title: 'Sehen Sie Ihre Angebote und Projekte im Kundenportal',    btn: 'Kundenportal öffnen →',  note: 'Für den Zugang benötigen Sie nur Ihre E-Mail-Adresse – keine Registrierung.' },
    en: { title: 'View all your quotes and projects in the client portal',  btn: 'Open client portal →',  note: 'Only your email address is needed to log in – no registration required.' },
  };
  const c = copy[l] || copy.hu;
  return `
<div style="margin-top:28px;padding:18px 20px;background:${C.sand};border:1px solid ${C.sandDark};border-radius:14px;text-align:center;">
  <p style="margin:0 0 12px;font-size:13px;color:${C.inkMid};font-weight:700;">${c.title}</p>
  <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:${C.navyLight};color:#fff;font-size:14px;font-weight:800;border-radius:22px;text-decoration:none;margin-bottom:10px;">${c.btn}</a>
  <p style="margin:0;font-size:11px;color:${C.inkMute};line-height:1.5;">${c.note}</p>
</div>`;
}

export function buildProjectStatusEmailHtml({ projectName, newStatusLabel, actorName, reason, projectUrl, locale = 'hu' }) {
  const STATUS_COLORS = {
    'Aktív': { bg: C.greenLight, text: C.green, border: '#A7D9D2' }, 'Active': { bg: C.greenLight, text: C.green, border: '#A7D9D2' }, 'Aktiv': { bg: C.greenLight, text: C.green, border: '#A7D9D2' },
    'Szüneteltetett': { bg: C.amberLight, text: C.amber, border: '#F5C97A' }, 'Paused': { bg: C.amberLight, text: C.amber, border: '#F5C97A' }, 'Pausiert': { bg: C.amberLight, text: C.amber, border: '#F5C97A' },
    'Lezárt': { bg: C.sand, text: C.inkMute, border: C.sandDark }, 'Closed': { bg: C.sand, text: C.inkMute, border: C.sandDark }, 'Geschlossen': { bg: C.sand, text: C.inkMute, border: C.sandDark },
  };
  const sc = STATUS_COLORS[newStatusLabel] || { bg: C.sand, text: C.inkMute, border: C.sandDark };
  const I18N = {
    hu: { headline: 'Projekt állapotváltozás', body: `<strong>${actorName}</strong> megváltoztatta a <strong>${projectName}</strong> projekt állapotát.`, reasonLabel: 'Indoklás', viewBtn: 'Projekt megtekintése →' },
    de: { headline: 'Projektstatus geändert',  body: `<strong>${actorName}</strong> hat den Status des Projekts <strong>${projectName}</strong> geändert.`, reasonLabel: 'Begründung', viewBtn: 'Projekt ansehen →' },
    en: { headline: 'Project status changed',  body: `<strong>${actorName}</strong> changed the status of project <strong>${projectName}</strong>.`, reasonLabel: 'Reason', viewBtn: 'View project →' },
  };
  const s = I18N[lang(locale)];
  return `
<h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">${s.headline}</h2>
<p style="margin:0 0 20px;font-size:15px;color:${C.inkMid};line-height:1.6;">${s.body}</p>
<div style="margin:0 0 20px;padding:12px 18px;background:${sc.bg};border:1px solid ${sc.border};border-radius:12px;display:inline-block;">
  <span style="font-size:15px;font-weight:800;color:${sc.text};">${newStatusLabel}</span>
</div>
${reason ? `<div style="margin:0 0 24px;padding:14px 18px;background:${C.sand};border-left:3px solid ${C.sandDark};border-radius:0 10px 10px 0;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${C.inkMute};">${s.reasonLabel}</p><p style="margin:0;font-size:14px;color:${C.inkMid};line-height:1.6;">${reason}</p></div>` : ''}
${BTN(C.navy, '#fff', projectUrl, s.viewBtn)}`;
}
