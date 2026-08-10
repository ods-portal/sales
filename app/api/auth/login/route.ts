import { connectDB } from '@/lib/db';
import { signToken } from '@/lib/auth';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.status === 'suspended') {
      return Response.json(
        { error: 'Invalid credentials or account suspended' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hasWriteAccess: user.hasWriteAccess,
      name: user.name,
      slug: user.slug,
    });

    // Audit log
    await AuditLog.create({
      actor: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      entityLabel: user.name,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const response = Response.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasWriteAccess: user.hasWriteAccess,
        slug: user.slug,
      },
    });

    // Set HttpOnly cookie
    const headers = new Headers(response.headers);
    headers.set(
      'Set-Cookie',
      `dsr_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
