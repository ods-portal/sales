import { connectDB } from '@/lib/db';
import { getAuthUser, canManageUsers, type JWTPayload } from '@/lib/auth';
import { generateUniqueSlug, paginationMeta } from '@/lib/utils';
import User, { type IUser } from '@/models/User';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

function assertCanModifyTarget(actor: JWTPayload, target: IUser): string | null {
  if (target._id.toString() === actor.userId) {
    return 'You cannot modify your own account';
  }
  if (target.role === 'superAdmin' && actor.role !== 'superAdmin') {
    return 'Only super admin can manage super admin accounts';
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageUsers(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return Response.json({ data: users, ...paginationMeta(total, page, limit) });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageUsers(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, email, role: newRole, password, hasWriteAccess } = body;

    if (!name || !email || !password) {
      return Response.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (newRole === 'superAdmin' && user.role !== 'superAdmin') {
      return Response.json({ error: 'Only super admin can create super admin accounts' }, { status: 403 });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = await generateUniqueSlug(name, async (s) => !!(await User.findOne({ slug: s })));

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: newRole || 'salesPerson',
      hasWriteAccess: hasWriteAccess || false,
      slug,
    });

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser._id.toString(),
      entityLabel: newUser.name,
      after: { name, email, role: newRole },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userObj } = newUser.toObject();
    return Response.json({ data: userObj }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageUsers(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, hasWriteAccess, status, email } = body;

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const guardError = assertCanModifyTarget(user, targetUser);
    if (guardError) {
      return Response.json({ error: guardError }, { status: 403 });
    }

    const before = {
      hasWriteAccess: targetUser.hasWriteAccess,
      status: targetUser.status,
      email: targetUser.email,
    };

    const updates: Partial<Pick<IUser, 'hasWriteAccess' | 'status' | 'email'>> = {};

    if (typeof hasWriteAccess !== 'undefined') {
      updates.hasWriteAccess = Boolean(hasWriteAccess);
    }
    if (status) {
      updates.status = status;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return Response.json({ error: 'Invalid email address' }, { status: 400 });
      }

      const duplicate = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: targetUser._id },
      });
      if (duplicate) {
        return Response.json({ error: 'Email already in use' }, { status: 409 });
      }

      updates.email = normalizedEmail;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'PERMISSION_CHANGE',
      entity: 'User',
      entityId: updatedUser._id.toString(),
      entityLabel: updatedUser.name,
      before,
      after: {
        hasWriteAccess: updatedUser.hasWriteAccess,
        status: updatedUser.status,
        email: updatedUser.email,
      },
    });

    return Response.json({
      success: true,
      data: {
        _id: updatedUser._id,
        email: updatedUser.email,
        status: updatedUser.status,
        hasWriteAccess: updatedUser.hasWriteAccess,
      },
    });
  } catch (error) {
    console.error('PATCH /api/users error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageUsers(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const guardError = assertCanModifyTarget(user, targetUser);
    if (guardError) {
      return Response.json({ error: guardError }, { status: 403 });
    }

    const before = targetUser.toObject() as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeBefore } = before;

    await User.findByIdAndDelete(userId);

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'DELETE',
      entity: 'User',
      entityId: userId,
      entityLabel: targetUser.name,
      before: safeBefore as Record<string, unknown>,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
