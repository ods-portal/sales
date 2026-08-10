import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import { resolveAssignedRep } from '@/lib/resolveRep';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';

// Force model registration for populate() refs — prevents tree-shaking
void User;

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { slug } = await ctx.params;

    const doctor = await Doctor.findOne({
      $or: [{ slug }, { previousSlugs: slug }],
    }).lean();

    if (!doctor) {
      return Response.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const rawRepId = doctor.assignedRep?.toString();
    const assignedRep = await resolveAssignedRep(rawRepId, doctor._id.toString());
    const doctorWithRep = { ...doctor, assignedRep };

    // Sales person can only view their assigned doctors
    if (user.role === 'salesPerson') {
      const ownsById = rawRepId === user.userId;
      const ownsByName = assignedRep?.name === user.name;
      if (rawRepId && !ownsById && !ownsByName) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 301 redirect if accessed via old slug
    if (doctorWithRep.slug !== slug) {
      return Response.json(
        { data: doctorWithRep, redirect: `/doctors/${doctorWithRep.slug}` },
        { status: 301 }
      );
    }

    return Response.json({ data: doctorWithRep });
  } catch (error) {
    console.error('GET /api/doctors/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = await ctx.params;
    const body = await request.json();

    if (user.role === 'salesPerson') {
      body.assignedRep = user.userId;
    } else if (!body.assignedRep) {
      return Response.json({ error: 'Assigned Sales Rep is required' }, { status: 400 });
    }

    // Clean up empty strings — don't store them as "" in the DB
    Object.keys(body).forEach(key => {
      if (body[key] === '') delete body[key];
    });

    const doctor = await Doctor.findOne({ slug });
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    const before = doctor.toObject() as unknown as Record<string, unknown>;
    Object.assign(doctor, body);
    await doctor.save();

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE',
      entity: 'Doctor',
      entityId: doctor._id.toString(),
      entityLabel: doctor.name,
      before,
      after: body,
    });

    return Response.json({ data: doctor });
  } catch (error) {
    console.error('PUT /api/doctors/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = await ctx.params;
    const doctor = await Doctor.findOneAndDelete({ slug });
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'DELETE',
      entity: 'Doctor',
      entityId: doctor._id.toString(),
      entityLabel: doctor.name,
      before: doctor.toObject() as unknown as Record<string, unknown>,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/doctors/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
