import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateUniqueSlug, paginationMeta } from '@/lib/utils';
import { resolveAssignedRepsForDoctors, buildSalesPersonDoctorFilter } from '@/lib/resolveRep';
import Doctor from '@/models/Doctor';
import Dropdown from '@/models/Dropdown';
import { isValidAreaForCity } from '@/lib/utils';
import User from '@/models/User';
import Visit from '@/models/Visit';
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

// Force model registration for populate() refs
void User;

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';
    const area = searchParams.get('area') || '';
    const sort = searchParams.get('sort') || '-createdAt';
    const assignedRep = searchParams.get('assignedRep');
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Sales person can only see their own assigned doctors
    // Alternatively, if 'assignedRep' is explicitly passed (e.g. 'me'), filter for it
    if (user.role === 'salesPerson') {
      Object.assign(query, await buildSalesPersonDoctorFilter(user.userId, user.name));
    } else if (assignedRep === 'me') {
      query.assignedRep = user.userId;
    } else if (assignedRep) {
      query.assignedRep = assignedRep;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { speciality: { $regex: search, $options: 'i' } },
        { clinicName: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (city) query.city = city;
    if (area) query.area = area;

    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Doctor.countDocuments(query),
    ]);

    const doctorsWithRep = await resolveAssignedRepsForDoctors(doctors);

    const doctorIds = doctorsWithRep.map(d => d._id);
    const lastVisits = await Visit.aggregate([
      { $match: { doctor: { $in: doctorIds } } },
      { $sort: { visitDate: -1 } },
      { $group: { _id: '$doctor', lastVisitDate: { $first: '$visitDate' } } }
    ]);

    const lastVisitMap = new Map(lastVisits.map(v => [v._id.toString(), v.lastVisitDate]));

    const doctorsWithLastVisit = doctorsWithRep.map(d => ({
      ...d,
      lastVisitDate: lastVisitMap.get(d._id.toString()) || null
    }));

    return Response.json({
      data: doctorsWithLastVisit,
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('GET /api/doctors error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (user.role === 'salesPerson') {
      body.assignedRep = user.userId;
    } else if (!body.assignedRep) {
      return Response.json({ error: 'Assigned Sales Rep is required' }, { status: 400 });
    }

    const locationError = await validateDoctorLocation(body);
    if (locationError) return Response.json({ error: locationError }, { status: 400 });

    const reasonError = validateSwitchingReason(body);
    if (reasonError) return Response.json({ error: reasonError }, { status: 400 });

    // Clean up empty strings — don't store them as "" in the DB
    Object.keys(body).forEach(key => {
      if (body[key] === '') delete body[key];
    });

    // Generate unique slug
    const slug = await generateUniqueSlug(
      [body.name, body.speciality, body.city].filter(Boolean).join('-'),
      async (s) => !!(await Doctor.findOne({ slug: s }))
    );

    const doctor = await Doctor.create({
      ...body,
      slug,
      previousSlugs: [],
    });

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE',
      entity: 'Doctor',
      entityId: doctor._id.toString(),
      entityLabel: doctor.name,
      after: body,
    });

    return Response.json({ data: doctor }, { status: 201 });
  } catch (error) {
    console.error('POST /api/doctors error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
