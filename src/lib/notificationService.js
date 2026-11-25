/**
 * Centralised notification service.
 *
 * All in-app notification creation goes through this module so that:
 *  - locale-aware titles are generated consistently
 *  - the DB insert shape is never duplicated across routes
 */

// ── Locale-aware string tables ─────────────────────────────────────────────

const QUOTE_NOTIF_TITLES = {
  quote_accepted: {
    hu: t => `Elfogadott ajánlat: ${t}`,
    de: t => `Angebot angenommen: ${t}`,
    en: t => `Quote accepted: ${t}`,
  },
  quote_rejected: {
    hu: t => `Elutasított ajánlat: ${t}`,
    de: t => `Angebot abgelehnt: ${t}`,
    en: t => `Quote rejected: ${t}`,
  },
  client_question: {
    hu: t => `Kérdés érkezett: ${t}`,
    de: t => `Frage eingegangen: ${t}`,
    en: t => `Question received: ${t}`,
  },
};

const QUOTE_EMAIL_SUBJECTS = {
  accepted: {
    hu: t => `✅ Elfogadott ajánlat: ${t}`,
    de: t => `✅ Angebot angenommen: ${t}`,
    en: t => `✅ Quote accepted: ${t}`,
  },
  rejected: {
    hu: t => `❌ Elutasított ajánlat: ${t}`,
    de: t => `❌ Elutasított ajánlat: ${t}`,
    en: t => `❌ Quote rejected: ${t}`,
  },
  question: {
    hu: t => `💬 Kérdés az ajánlathoz: ${t}`,
    de: t => `💬 Frage zum Angebot: ${t}`,
    en: t => `💬 Question about the quote: ${t}`,
  },
};

const QUOTE_EMAIL_INTRO = {
  accepted: {
    hu: '<p style="color:#15803d;font-weight:700;font-size:1rem;">Az ügyfél elfogadta az ajánlatot.</p>',
    de: '<p style="color:#15803d;font-weight:700;font-size:1rem;">Der Kunde hat das Angebot angenommen.</p>',
    en: '<p style="color:#15803d;font-weight:700;font-size:1rem;">The client has accepted the quote.</p>',
  },
  rejected: {
    hu: '<p style="color:#b91c1c;font-weight:700;font-size:1rem;">Az ügyfél elutasította az ajánlatot.</p>',
    de: '<p style="color:#b91c1c;font-weight:700;font-size:1rem;">Der Kunde hat das Angebot abgelehnt.</p>',
    en: '<p style="color:#b91c1c;font-weight:700;font-size:1rem;">The client has rejected the quote.</p>',
  },
  question: {
    hu: '<p style="color:#1e40af;font-weight:700;font-size:1rem;">Az ügyfél kérdést / módosítási kérelmet küldött.</p>',
    de: '<p style="color:#1e40af;font-weight:700;font-size:1rem;">Der Kunde hat eine Frage oder Änderungsanfrage gesendet.</p>',
    en: '<p style="color:#1e40af;font-weight:700;font-size:1rem;">The client sent a question or change request.</p>',
  },
};

const QUOTE_EMAIL_LABELS = {
  hu: { greeting: n => `Kedves ${n}!`, quoteRow: 'Ajánlat', clientRow: 'Ügyfél', msgLabel: 'Üzenet', reasonLabel: 'Indoklás', footer: 'Az ügyfél a portálon keresztül válaszolt.' },
  de: { greeting: n => `Hallo ${n}!`,  quoteRow: 'Angebot', clientRow: 'Kunde',  msgLabel: 'Nachricht', reasonLabel: 'Begründung', footer: 'Der Kunde hat über das Portal geantwortet.' },
  en: { greeting: n => `Hello ${n}!`,  quoteRow: 'Quote',   clientRow: 'Client', msgLabel: 'Message', reasonLabel: 'Reason', footer: 'The client responded via the portal.' },
};

// ── Public helpers ─────────────────────────────────────────────────────────

/**
 * Returns the in-app notification title for a quote response event.
 * @param {'quote_accepted'|'quote_rejected'|'client_question'} type
 * @param {string} locale  'hu' | 'de' | 'en'
 * @param {string} quoteTitle
 */
export function quoteNotifTitle(type, locale, quoteTitle) {
  const map = QUOTE_NOTIF_TITLES[type];
  if (!map) return quoteTitle;
  return (map[locale] || map.hu)(quoteTitle);
}

/**
 * Returns the email subject for a quote response action.
 * @param {'accepted'|'rejected'|'question'} action
 * @param {string} locale
 * @param {string} quoteTitle
 */
export function quoteEmailSubject(action, locale, quoteTitle) {
  const map = QUOTE_EMAIL_SUBJECTS[action];
  if (!map) return quoteTitle;
  return (map[locale] || map.hu)(quoteTitle);
}

/**
 * Returns the HTML intro paragraph for a quote response email.
 */
export function quoteEmailIntro(action, locale) {
  const map = QUOTE_EMAIL_INTRO[action];
  if (!map) return '';
  return map[locale] || map.hu;
}

/**
 * Returns locale-specific UI labels for the quote response email body.
 */
export function quoteEmailLabels(locale) {
  return QUOTE_EMAIL_LABELS[locale] || QUOTE_EMAIL_LABELS.hu;
}

// ── DB insert helpers ──────────────────────────────────────────────────────

/**
 * Insert a single in-app notification.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ userId: string, type: string, title: string, body?: string, link?: string, sourceType?: string, sourceId?: string }} opts
 */
export async function createNotification(admin, { userId, type, title, body, link, sourceType, sourceId }) {
  const { error } = await admin.from('notifications').insert({
    user_id:     userId,
    type,
    title,
    body:        body        ?? null,
    link:        link        ?? null,
    source_type: sourceType  ?? null,
    source_id:   sourceId    ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Insert multiple in-app notifications in one batch.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {Array<{ userId: string, type: string, title: string, body?: string, link?: string, sourceType?: string, sourceId?: string }>} notifications
 */
export async function createNotifications(admin, notifications) {
  if (!notifications.length) return;
  const { error } = await admin.from('notifications').insert(
    notifications.map(n => ({
      user_id:     n.userId,
      type:        n.type,
      title:       n.title,
      body:        n.body        ?? null,
      link:        n.link        ?? null,
      source_type: n.sourceType  ?? null,
      source_id:   n.sourceId    ?? null,
    }))
  );
  if (error) throw new Error(error.message);
}
