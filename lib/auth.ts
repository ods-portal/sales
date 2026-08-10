import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_change_in_production'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'salesPerson' | 'admin' | 'superAdmin';
  hasWriteAccess: boolean;
  name: string;
  slug: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('dsr_token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  try {
    await connectDB();
    const dbUser = await User.findById(payload.userId)
      .select('name email role hasWriteAccess slug status')
      .lean();
    if (!dbUser || dbUser.status === 'suspended') return null;

    return {
      userId: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      hasWriteAccess: dbUser.hasWriteAccess,
      name: dbUser.name,
      slug: dbUser.slug,
    };
  } catch {
    return null;
  }
}

export function canWrite(user: JWTPayload): boolean {
  if (user.role === 'superAdmin') return true;
  if (user.role === 'admin' && user.hasWriteAccess) return true;
  return false;
}

export function isSuperAdmin(user: JWTPayload): boolean {
  return user.role === 'superAdmin';
}

export function isAdmin(user: JWTPayload): boolean {
  return user.role === 'admin' || user.role === 'superAdmin';
}

export function canManageUsers(user: JWTPayload): boolean {
  if (user.role === 'superAdmin') return true;
  if (user.role === 'admin' && user.hasWriteAccess) return true;
  return false;
}

export function canAccessReports(user: JWTPayload): boolean {
  if (user.role === 'superAdmin') return true;
  if (user.role === 'admin' && user.hasWriteAccess) return true;
  return false;
}
