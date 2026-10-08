import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import { resolveAssignedRep } from '@/lib/resolveRep';
import Doctor from '@/models/Doctor';
import Dropdown from '@/models/Dropdown';
import { isValidAreaForCity } from '@/lib/utils';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';

async function validateDoctorLocation(
  body: Record<string, unknown>,
  existingCity?: string,
  existingState?: string
) {
  const city = String(body.city || '').trim();
  const area = String(body.area || '').trim();
  const state = String(body.state || '').trim();
  if (!city) return 'Please select a city';

  const options = await Dropdown.find({ group: 'city', isActive: true }).select('label').lean();
  const labels = options.map((option) => option.label);
  if (!labels.includes(city) && city !== existingCity) {
    return 'Please select a city from the list';
  }
  if (!isValidAreaForCity(city, area)) {
    return 'Please select an area for this city';
  }

  if (state) {
    const stateOptions = await Dropdown.find({ group: 'state', isActive: true }).select('label').lean();
    const stateLabels = stateOptions.map((option) => option.label);
    if (!stateLabels.includes(state) && state !== existingState) {
      return 'Please select a state from the list';
    }
  }

  body.city = city;
  body.area = area;
  body.state = state;
  return null;
}

function validateSwitchingReason(body: Record<string, unknown>) {
  const reason = String(body.reasonForNotSwitching || '').trim();
  const details = String(body.reasonForNotSwitchingDetails || '').trim();
  if (reason && !details) {
    return 'Please explain the reason for not switching';
  }
  body.reasonForNotSwitching = reason;
  body.reasonForNotSwitchingDetails = reason ? details : '';
  return null;
}

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

    const reasonError = validateSwitchingReason(body);
    if (reasonError) return Response.json({ error: reasonError }, { status: 400 });
    const clearSwitchingReason = !String(body.reasonForNotSwitching || '').trim();
    const clearState = !String(body.state || '').trim();

    // Clean up empty strings — don't store them as "" in the DB
    Object.keys(body).forEach(key => {
      if (body[key] === '') delete body[key];
    });

    const doctor = await Doctor.findOne({ slug });
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    const locationError = await validateDoctorLocation(body, doctor.city, doctor.state);
    if (locationError) return Response.json({ error: locationError }, { status: 400 });

    const before = doctor.toObject() as unknown as Record<string, unknown>;
    if (clearSwitchingReason) {
      doctor.set('reasonForNotSwitching', undefined);
      doctor.set('reasonForNotSwitchingDetails', undefined);
    }
    if (clearState) doctor.set('state', undefined);
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
