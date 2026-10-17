const APP_NAME = process.env.GOOGLE_APP_NAME || 'TecTon';

/**
 * Fill a template string, replacing {{placeholder}} tokens with vars.
 * @param {string} tpl
 * @param {Record<string, string>} vars
 */
export function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Wrap any content in the standard branded HTML shell.
 * @param {string} bodyHtml  — inner content (no <html>/<body> tags)
 * @param {string} [preheader] — short preview text
 */
export function wrapEmail(bodyHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader}</div>` : ''}
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#1e293b;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div>
        <p style="margin:0;color:#94a3b8;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Automatikus értesítő</p>
        <p style="margin:2px 0 0;color:#fff;font-size:18px;font-weight:800;">${APP_NAME}</p>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${bodyHtml}
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
        Ez az e-mail automatikusan lett generálva a <strong>${APP_NAME}</strong> rendszerből.<br>
        Kérjük, ne válaszoljon erre az üzenetre.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Templates ──────────────────────────────────────────────────────────────────
// Each template exposes: id, name, subject, bodyHtml — both may contain {{placeholders}}.
// Available placeholders are documented inline.

export const EMAIL_TEMPLATES = {

  /**
   * Collective invitation.
   * Vars: inviter_name, collective_name, accept_url, decline_url, is_new_user (truthy string)
   */
  collective_invitation: {
    id: 'collective_invitation',
    name: 'Collective invitation',
    subject: '{{inviter_name}} invited you to join {{collective_name}}',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{inviter_name}}</strong> meghívott a(z)
  <strong style="color:#1e293b;">{{collective_name}}</strong> kollektívába a <strong>${APP_NAME}</strong> platformon.
</p>

{{note_block}}

<p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
  A kollektíva egy megosztott munkaterület, ahol közösen kezelheted a projekteket, árajánlatokat és számlákat.
</p>

<table style="border-collapse:collapse;margin-bottom:28px;">
  <tr>
    <td style="padding-right:12px;">
      <a href="{{accept_url}}"
         style="display:inline-block;padding:13px 28px;background:#16a34a;color:#fff;font-size:14px;font-weight:800;border-radius:8px;text-decoration:none;">
        ✓ {{cta_label}}
      </a>
    </td>
    <td>
      <a href="{{decline_url}}"
         style="display:inline-block;padding:13px 28px;background:#dc2626;color:#fff;font-size:14px;font-weight:800;border-radius:8px;text-decoration:none;">
        ✕ Visszautasítás
      </a>
    </td>
  </tr>
</table>

<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
  Ha nem vártál ilyen meghívót, egyszerűen hagyd figyelmen kívül ezt az e-mailt.
</p>
`,
  },

  /**
   * Member left collective voluntarily — notifies the collective owner(s).
   * Vars: member_name, collective_name
   */
  member_left: {
    id: 'member_left',
    name: 'Member left collective',
    subject: '{{member_name}} elhagyta a(z) {{collective_name}} kollektívát',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{member_name}}</strong> elhagyta a(z)
  <strong style="color:#1e293b;">{{collective_name}}</strong> kollektívát.
</p>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
  A fiókja megmarad, de már nem fér hozzá a kollektíva munkaterületéhez.
</p>
`,
  },

  /**
   * Member deleted their account — notifies each collective owner.
   * Vars: member_name, collective_name
   */
  member_account_deleted: {
    id: 'member_account_deleted',
    name: 'Member deleted account',
    subject: '{{member_name}} törölte fiókját — {{collective_name}}',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{member_name}}</strong> törölte TecTon fiókját, és ezzel automatikusan kilépett a(z)
  <strong style="color:#1e293b;">{{collective_name}}</strong> kollektívából.
</p>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
  Semmilyen teendő nincs — a felhasználó adatai eltávolításra kerültek.
</p>
`,
  },

  /**
   * Member removed from collective — notifies the removed member.
   * Vars: owner_name, collective_name
   */
  member_removed: {
    id: 'member_removed',
    name: 'Removed from collective',
    subject: 'Eltávolítottak a(z) {{collective_name}} kollektívából',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{owner_name}}</strong> eltávolított téged a(z)
  <strong style="color:#1e293b;">{{collective_name}}</strong> kollektívából.
</p>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
  Többé nem férsz hozzá a kollektíva projektjeihez és dokumentumaihoz.<br>
  Ha úgy gondolod, hogy ez tévedés volt, vedd fel a kapcsolatot a kollektíva tulajdonosával.
</p>
`,
  },

  /**
   * Member blocked from collective — notifies the blocked member.
   * Vars: owner_name, collective_name
   */
  member_blocked: {
    id: 'member_blocked',
    name: 'Blocked from collective',
    subject: 'Kitiltottak a(z) {{collective_name}} kollektívából',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{owner_name}}</strong> letiltotta a hozzáférésedet a(z)
  <strong style="color:#1e293b;">{{collective_name}}</strong> kollektívához.
</p>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
  Ha úgy gondolod, hogy ez tévedés volt, vedd fel a kapcsolatot a kollektíva tulajdonosával.
</p>
`,
  },

  /**
   * Invitation accepted — notifies the collective owner.
   * Vars: invitee_email, collective_name
   */
  invitation_accepted: {
    id: 'invitation_accepted',
    name: 'Invitation accepted',
    subject: '{{invitee_email}} accepted your invitation to {{collective_name}}',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{invitee_email}}</strong> accepted your invitation and joined
  <strong style="color:#1e293b;">{{collective_name}}</strong>.
</p>
<p style="margin:0;font-size:13px;color:#64748b;">They can now collaborate on your collective projects.</p>
`,
  },

  /**
   * Invitation declined — notifies the collective owner.
   * Vars: invitee_email, collective_name
   */
  invitation_declined: {
    id: 'invitation_declined',
    name: 'Invitation declined',
    subject: '{{invitee_email}} declined your invitation to {{collective_name}}',
    bodyHtml: `
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
  <strong>{{invitee_email}}</strong> declined your invitation to join
  <strong style="color:#1e293b;">{{collective_name}}</strong>.
</p>
<p style="margin:0;font-size:13px;color:#64748b;">No action is needed on your part.</p>
`,
  },

  /**
   * Offer sent to client.
   * Vars: client_name, offer_title, offer_summary_html, offer_url, sender_name
   */
  offer_sent: {
    id: 'offer_sent',
    name: 'Ajánlat kiküldése',
    subject: 'Árajánlat: {{offer_title}}',
    bodyHtml: `
<p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
  Kedves <strong>{{client_name}}</strong>!
</p>

<p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.7;">
  Az alábbiakban megtalálja a(z) <strong style="color:#1e293b;">{{offer_title}}</strong> tárgyú árajánlatot.
</p>

{{offer_summary_html}}

<p style="margin:24px 0 8px;font-size:14px;color:#64748b;line-height:1.7;">
  Az ajánlatot PDF-ben csatolva is megtalálja ebben az e-mailben.
</p>

<p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
  Kérdés esetén kérjük, forduljon hozzánk bizalommal!
</p>

<p style="margin:0;font-size:14px;color:#334155;font-weight:700;">{{sender_name}}</p>
`,
  },

};

const TYPE_LABELS = {
  material:  'Anyag',
  labour:    'Munkadíj',
  equipment: 'Gép/Eszköz',
  transport: 'Szállítás',
  other:     'Egyéb',
};
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8' },
  labour:    { bg: '#f0fdf4', color: '#15803d' },
  equipment: { bg: '#fff7ed', color: '#c2410c' },
  transport: { bg: '#faf5ff', color: '#7c3aed' },
  other:     { bg: '#f8fafc', color: '#475569' },
};

/**
 * Build the full offer HTML — sections + line items + totals.
 * @param {{ sections: Array, allEntries: Array, netTotal, taxRate, taxAmount, grossTotal, validUntil }} opts
 */
export function buildOfferDetailHtml({ sections, allEntries, netTotal, taxRate, taxAmount, grossTotal, validUntil }) {
  const fmt = (n) => Number(n).toLocaleString('hu-HU') + ' Ft';

  const sectionsHtml = sections.map(section => {
    const entries = allEntries.filter(e => e.section_id === section.id);
    if (!entries.length) return '';
    const sectionTotal = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);

    const rowsHtml = entries.map((e, i) => {
      const t = TYPE_COLORS[e.entry_type] || TYPE_COLORS.other;
      const label = TYPE_LABELS[e.entry_type] || 'Egyéb';
      return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
        <td style="padding:7px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">
          ${e.work_description || ''}
          <span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:${t.bg};color:${t.color};margin-left:5px;">${label}</span>
          ${e.notes ? `<div style="font-size:11px;color:#94a3b8;margin-top:1px;">${e.notes}</div>` : ''}
        </td>
        <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
          ${e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}
        </td>
        <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
          ${e.unit_price != null ? fmt(e.unit_price) : '—'}
        </td>
        <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">
          ${fmt(e.amount_huf || 0)}
        </td>
      </tr>`;
    }).join('');

    return `
    <div style="margin-bottom:16px;">
      <div style="background:#1e293b;color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;font-size:12px;font-weight:800;display:flex;justify-content:space-between;align-items:center;">
        <span>${section.name || 'Általános'} <span style="opacity:0.4;margin:0 6px;">|</span> ${fmt(sectionTotal)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;">Megnevezés</th>
            <th style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap;">Menny.</th>
            <th style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap;">Egységár</th>
            <th style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap;">Összeg</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }).join('');

  // Unsectioned entries
  const unsectioned = allEntries.filter(e => !e.section_id);
  const unsectionedHtml = unsectioned.length ? `
    <div style="margin-bottom:16px;">
      <div style="background:#475569;color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;font-size:12px;font-weight:800;">Általános tételek</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tbody>${unsectioned.map((e, i) => {
          const t = TYPE_COLORS[e.entry_type] || TYPE_COLORS.other;
          const label = TYPE_LABELS[e.entry_type] || 'Egyéb';
          return `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
            <td style="padding:7px 10px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;">
              ${e.work_description || ''}
              <span style="display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:${t.bg};color:${t.color};margin-left:5px;">${label}</span>
            </td>
            <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</td>
            <td style="padding:7px 10px;font-size:12px;color:#64748b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${e.unit_price != null ? fmt(e.unit_price) : '—'}</td>
            <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#1e293b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${fmt(e.amount_huf || 0)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : '';

  return `
${sectionsHtml}
${unsectionedHtml}
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-top:8px;">
  <tr>
    <td style="padding:8px 10px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">Nettó összeg</td>
    <td style="padding:8px 10px;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${fmt(netTotal)}</td>
  </tr>
  ${taxRate > 0 ? `<tr>
    <td style="padding:8px 10px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">ÁFA (${taxRate}%)</td>
    <td style="padding:8px 10px;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${fmt(taxAmount)}</td>
  </tr>` : ''}
  <tr style="background:#1e293b;">
    <td style="padding:10px 10px;font-size:14px;font-weight:800;color:#fff;">Bruttó összesen</td>
    <td style="padding:10px 10px;font-size:16px;font-weight:800;color:#fff;text-align:right;white-space:nowrap;">${fmt(grossTotal)}</td>
  </tr>
</table>
${validUntil ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;text-align:right;">Érvényes: <strong style="color:#475569;">${new Date(validUntil).toLocaleDateString('hu-HU')}</strong></p>` : ''}`;
}

/**
 * Build a compact totals-only summary block (kept for other uses).
 */
export function buildOfferSummaryHtml({ netTotal, taxRate, taxAmount, grossTotal, validUntil }) {
  return buildOfferDetailHtml({ sections: [], allEntries: [], netTotal, taxRate, taxAmount, grossTotal, validUntil });
}
