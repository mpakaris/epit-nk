import { createAdminClient } from '@/lib/supabase/admin';

export const UNREGISTERED_REPLY =
  'Szia! Ez a szám nincs regisztrálva az OkosSzakiban. Kérj hozzáférést a mesterembertől.';

function normalisePhone(raw) {
  const stripped = String(raw).replace(/@.*$/, '').replace(/\s/g, '');
  return stripped.startsWith('+') ? stripped : '+' + stripped.replace(/\D/g, '');
}

export async function resolveAccount(phoneNumber) {
  const phone = normalisePhone(phoneNumber);
  const admin = createAdminClient();

  const { data: row } = await admin
    .from('wa_accounts')
    .select('*, collective:collectives(id, name)')
    .eq('phone_number', phone)
    .eq('is_active', true)
    .maybeSingle();

  if (!row) return null;

  return {
    waAccount:    row,
    collectiveId: row.collective_id,
    userId:       row.user_id,
    permissions:  row.permissions,
    displayName:  row.display_name,
    accountType:  row.account_type,
  };
}
