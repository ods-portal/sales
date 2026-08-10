import { connectDB } from '@/lib/db';
import { getAuthUser, signToken } from '@/lib/auth';
import { generateUniqueSlug } from '@/lib/utils';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

function unauthorizedResponse() {
  const response = Response.json({ error: 'Not authenticated' }, { status: 401 });
  const headers = new Headers(response.headers);
  headers.set(
    'Set-Cookie',
    'dsr_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return new Response(response.body, { status: 401, headers });
}

function setAuthCookie(response: Response, token: string) {
  const headers = new Headers(response.headers);
  headers.set(
    'Set-Cookie',
    `dsr_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
  );
  return new Response(response.body, { status: response.status, headers });
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return unauthorizedResponse();
  }
  return Response.json({ user });
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser();
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    const dbUser = await User.findById(authUser.userId);
    if (!dbUser || dbUser.status === 'suspended') {
      return unauthorizedResponse();
    }

    const isPasswordChange = Boolean(newPassword);
    const isProfileChange = typeof name === 'string' && name.trim() !== dbUser.name;

    if (!isPasswordChange && !isProfileChange) {
      return Response.json({ error: 'No changes to save' }, { status: 400 });
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (isProfileChange) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return Response.json({ error: 'Name is required' }, { status: 400 });
      }

      before.name = dbUser.name;
      before.slug = dbUser.slug;
      dbUser.name = trimmedName;

      const newSlug = await generateUniqueSlug(trimmedName, async (slug) => {
        const existing = await User.findOne({ slug });
        if (!existing) return false;
        return existing._id.toString() !== authUser.userId;
      });
      dbUser.slug = newSlug;
      after.name = dbUser.name;
      after.slug = dbUser.slug;
    }

    if (isPasswordChange) {
      if (!currentPassword) {
        return Response.json({ error: 'Current password is required' }, { status: 400 });
      }
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
      }

      before.passwordChanged = true;
      dbUser.passwordHash = await bcrypt.hash(newPassword, 12);
      after.passwordChanged = true;
    }

    await dbUser.save();

    await AuditLog.create({
      actor: authUser.userId,
      actorName: dbUser.name,
      actorRole: dbUser.role,
      action: 'UPDATE',
      entity: 'User',
      entityId: dbUser._id.toString(),
      entityLabel: dbUser.name,
      before,
      after,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const token = await signToken({
      userId: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      hasWriteAccess: dbUser.hasWriteAccess,
      name: dbUser.name,
      slug: dbUser.slug,
    });

    const response = Response.json({
      user: {
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        hasWriteAccess: dbUser.hasWriteAccess,
        slug: dbUser.slug,
      },
    });

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('PATCH /api/auth/me error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
