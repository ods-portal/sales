import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import { generateUniqueSlug } from '@/lib/utils';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import Visit from '@/models/Visit';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';
import { format } from 'date-fns';

const SKIPPED_KEYS = new Set(['_id', '__v', 'slug', 'previousSlugs']);

function copyFields(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !SKIPPED_KEYS.has(key))
  );
}

function asId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value ?? '');
}

async function findSalesPerson(id: string) {
  if (!id) return null;
  return User.findOne({ _id: id, role: 'salesPerson' }).select('name status');
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const from = new URL(request.url).searchParams.get('from') || '';
    const source = await findSalesPerson(from);
    if (!source) return Response.json({ error: 'Source sales person not found' }, { status: 404 });

    const [doctorCount, visitCount] = await Promise.all([
      Doctor.countDocuments({ assignedRep: source._id }),
      Visit.countDocuments({ salesPerson: source._id }),
    ]);

    return Response.json({ data: { doctorCount, visitCount, sourceName: source.name } });
  } catch (error) {
    console.error('GET /api/users/transfer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function copyDoctors(fromId: unknown, toId: unknown) {
  const doctors = await Doctor.find({ assignedRep: fromId }).lean();
  const doctorMap = new Map<string, string>();
  const slugs: string[] = [];

  for (const doctor of doctors) {
    const base = [doctor.name, doctor.speciality, doctor.city].filter(Boolean).join('-');
    const slug = await generateUniqueSlug(base || 'doctor', async (candidate) => {
      return !!(await Doctor.findOne({ slug: candidate }).select('_id'));
    });
    const created = new Doctor({
      ...copyFields(doctor as unknown as Record<string, unknown>),
      slug,
      previousSlugs: [],
      assignedRep: toId,
    });
    await created.save({ validateBeforeSave: false, timestamps: false });
    doctorMap.set(String(doctor._id), String(created._id));
    slugs.push(slug);
  }

  return { doctorMap, slugs };
}

async function copyVisits(
  fromId: unknown,
  toId: unknown,
  doctorMap: Map<string, string>
) {
  const visits = await Visit.find({ salesPerson: fromId }).lean();
  const slugs: string[] = [];

  for (const visit of visits) {
    const sourceDoctorId = asId(visit.doctor);
    const doctorId = doctorMap.get(sourceDoctorId) || sourceDoctorId;
    const doctor = await Doctor.findById(doctorId).select('name').lean();
    const visitDay = format(new Date(visit.visitDate), 'yyyy-MM-dd');
    const base = `${visitDay}-${doctor?.name || 'visit'}-${visit.visitType || 'visit'}`;
    const slug = await generateUniqueSlug(base, async (candidate) => {
      return !!(await Visit.findOne({ slug: candidate }).select('_id'));
    });
    const created = new Visit({
      ...copyFields(visit as unknown as Record<string, unknown>),
      slug,
      doctor: doctorId,
      salesPerson: toId,
    });
    await created.save({ validateBeforeSave: false, timestamps: false });
    slugs.push(slug);
  }

  return slugs;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const copyDoctorsSelected = Boolean(body.doctors);
    const copyVisitsSelected = Boolean(body.visits);
    if (!copyDoctorsSelected && !copyVisitsSelected) {
      return Response.json({ error: 'Select doctors, visits, or both' }, { status: 400 });
    }

    const [source, destination] = await Promise.all([
      findSalesPerson(String(body.fromUserId || '')),
      findSalesPerson(String(body.toUserId || '')),
    ]);
    if (!source) return Response.json({ error: 'Source sales person not found' }, { status: 404 });
    if (!destination) return Response.json({ error: 'Destination sales person not found' }, { status: 404 });
    if (String(source._id) === String(destination._id)) {
      return Response.json({ error: 'Choose two different sales persons' }, { status: 400 });
    }
    if (destination.status !== 'active') {
      return Response.json({ error: 'Destination sales person must be active' }, { status: 400 });
    }

    const doctorResult = copyDoctorsSelected
      ? await copyDoctors(source._id, destination._id)
      : { doctorMap: new Map<string, string>(), slugs: [] as string[] };
    const visitSlugs = copyVisitsSelected
      ? await copyVisits(source._id, destination._id, doctorResult.doctorMap)
      : [];

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE',
      entity: 'SalesTransfer',
      entityId: String(destination._id),
      entityLabel: `${source.name} → ${destination.name}`,
      after: {
        fromUserId: String(source._id),
        toUserId: String(destination._id),
        doctorsCopied: doctorResult.slugs.length,
        visitsCopied: visitSlugs.length,
      },
    });

    return Response.json({
      data: {
        doctorsCopied: doctorResult.slugs.length,
        visitsCopied: visitSlugs.length,
        destinationName: destination.name,
      },
    });
  } catch (error) {
    console.error('POST /api/users/transfer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
