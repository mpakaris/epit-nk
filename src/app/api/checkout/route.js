import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId, successUrl, collectiveId } = await request.json();
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('email').eq('id', user.id).single();

  // Derive base URL from the actual request host so the success_url is always
  // same-origin with the browsing context (works with ngrok, localhost, and production).
  const fwdProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host     = request.headers.get('host') || '';
  const proto    = fwdProto || (host.startsWith('localhost') ? 'http' : 'https');
  const baseUrl  = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const base = successUrl ? `${baseUrl}${successUrl}` : `${baseUrl}/profil`;
  const returnUrl = `${base}${base.includes('?') ? '&' : '?'}upgraded=1`;

  const body = {
    product_id: productId,
    success_url: returnUrl,
    customer: { email: profile?.email || user.email },
    metadata: { userId: user.id, ...(collectiveId ? { collectiveId } : {}) },
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
    logAudit({ userId: user.id, userName: profile?.email || '', action: 'Checkout failed', targetType: 'billing', details: { error: msg, product_id: productId } });
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  logAudit({ userId: user.id, userName: profile?.email || '', action: 'Checkout initiated', targetType: 'billing', details: { product_id: productId } });
  return NextResponse.json({ checkoutUrl: data.checkout_url || data.checkoutUrl });
}
