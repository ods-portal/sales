import { getAuthUser } from '@/lib/auth';

export async function POST() {
  const response = Response.json({ success: true });
  const headers = new Headers(response.headers);
  headers.set(
    'Set-Cookie',
    'dsr_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return new Response(response.body, { status: 200, headers });
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return Response.json({ user });
}
