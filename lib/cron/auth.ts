import { NextRequest } from 'next/server';
import { getAuthUser, canWrite, type JWTPayload } from '@/lib/auth';

export function isValidCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function authorizeCronOrAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; source: 'cron' }
  | { authorized: true; source: 'manual'; user: JWTPayload }
  | { authorized: false; error: string; status: number }
> {
  if (isValidCronSecret(request)) {
    return { authorized: true, source: 'cron' };
  }

  const user = await getAuthUser();
  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  if (!canWrite(user)) {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, source: 'manual', user };
}
