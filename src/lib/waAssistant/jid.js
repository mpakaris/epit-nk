// JID formats:
//   individual (legacy): "4367686428743@s.whatsapp.net"
//   individual (LID):    "67284991230013@lid"  ← opaque, not a phone number
//   device suffix:       "36308548589:27@s.whatsapp.net"
//   group:               "xxx@g.us"  ← ignored

export function toJid(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

// "4367686428743@s.whatsapp.net" | "36308548589:27@s.whatsapp.net" → "+4367686428743"
export function jidToE164(jid) {
  if (!jid) return null;
  // strip @domain, then :device suffix, then non-digits
  const local  = String(jid).split('@')[0].split(':')[0];
  const digits = local.replace(/\D/g, '');
  if (!digits) return null;
  return '+' + digits;
}

// Returns true if this JID is an individual (not a group or broadcast)
export function isIndividualJid(jid) {
  const s = String(jid);
  return s.endsWith('@s.whatsapp.net') || s.endsWith('@lid');
}
