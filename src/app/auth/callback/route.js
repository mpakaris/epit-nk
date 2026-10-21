import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const destination = `${origin}/${next || (code ? 'dashboard' : '')}`;
  const response = NextResponse.redirect(destination);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session?.user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('display_name, active_collective_id')
        .eq('id', session.user.id)
        .maybeSingle();

      logAudit({
        entityId:   profile?.active_collective_id || session.user.id,
        userId:     session.user.id,
        userName:   profile?.display_name || session.user.email,
        action:     'Login success',
        targetType: 'auth',
        targetName: 'OAuth',
      });
    }
  }

  return response;
}
