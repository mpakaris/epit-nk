import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { customerId } = await request.json();
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });

  const res = await fetch(`https://test-api.creem.io/v1/customers/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify({ customerId }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ portalUrl: data.portalUrl || data.url });
}
