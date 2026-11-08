import { getPortalSession } from '@/lib/portalSession';

export async function GET() {
  const session = await getPortalSession();
  if (!session) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  return Response.json({ email: session.email });
}
