import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const {
    name, address, phone, email, notes,
    discountPercent = 0, companyName, taxNumber,
    gdprConsent,
    collectiveShares = [], sharesGdprConfirmed = false,
  } = await request.json();

  if (!gdprConsent) return Response.json({ error: 'GDPR hozzájárulás kötelező!' }, { status: 400 });
  if (!name?.trim())  return Response.json({ error: 'A név megadása kötelező!' }, { status: 400 });
  if (!email?.trim()) return Response.json({ error: 'Az e-mail megadása kötelező!' }, { status: 400 });
  if (collectiveShares.length > 0 && !sharesGdprConfirmed) {
    return Response.json({ error: 'Kollektíva megosztáshoz GDPR megerősítés szükséges!' }, { status: 400 });
  }

  const { data, error: insertErr } = await admin
    .from('clients')
    .insert([{
      owner_id:         user.id,
      name:             name.trim(),
      address,
      phone,
      email,
      notes,
      discount_percent: Number(discountPercent),
      company_name:      companyName?.trim() || null,
      tax_number:        taxNumber?.trim()   || null,
      gdpr_consented_at: new Date().toISOString(),
      gdpr_consented_by: user.id,
    }])
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });

  if (collectiveShares.length > 0) {
    await admin.from('client_collective_shares').insert(
      collectiveShares.map(cid => ({
        client_id:         data.id,
        collective_id:     cid,
        shared_by:         user.id,
        gdpr_confirmed_at: new Date().toISOString(),
      }))
    );
  }

  const { data: clientWithShares } = await admin
    .from('clients')
    .select('*, client_collective_shares(collective_id)')
    .eq('id', data.id)
    .single();

  logAudit({
    entityId: user.id,
    userId:   user.id,
    userName: profile.display_name || user.email,
    action:   'Ügyfél létrehozva',
    targetType: 'client',
    targetId:   data.id,
    targetName: data.name,
  });

  return Response.json({ client: clientWithShares });
}
