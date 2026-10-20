import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId, successUrl } = await request.json();
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('email').eq('id', user.id).single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const base = successUrl ? `${baseUrl}${successUrl}` : `${baseUrl}/profil`;
  const returnUrl = `${base}${base.includes('?') ? '&' : '?'}upgraded=1`;

  const body = {
    product_id: productId,
    success_url: returnUrl,
    customer: { email: profile?.email || user.email },
    metadata: { userId: user.id },
  };

  const res = await fetch('https://test-api.creem.io/v1/checkouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Checkout creation failed');
    console.error('[checkout] Creem error', res.status, msg, body);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json({ checkoutUrl: data.checkout_url || data.checkoutUrl });
}
