import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateUniqueSlug, paginationMeta } from '@/lib/utils';
import { buildSalesPersonVisitFilter, resolveSalesPersonsForVisits } from '@/lib/resolveRep';
import Visit from '@/models/Visit';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';
import { format, startOfDay, endOfDay } from 'date-fns';

// Force model registration for populate() refs
void User;
void Doctor;

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || '-visitDate';
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (user.role === 'salesPerson') {
      Object.assign(query, await buildSalesPersonVisitFilter(user.userId, user.name));
    }

    if (status) query.status = status;

    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [visits, total] = await Promise.all([
      Visit.find(query)
        .populate('doctor', 'name slug speciality city category')
        .populate('salesPerson', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Visit.countDocuments(query),
    ]);

    let filtered = await resolveSalesPersonsForVisits(visits);

    if (search) {
      filtered = filtered.filter((v) => {
        const doc = v.doctor as { name?: string; city?: string } | null;
        return (
          doc?.name?.toLowerCase().includes(search.toLowerCase()) ||
          doc?.city?.toLowerCase().includes(search.toLowerCase()) ||
          v.visitType.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    return Response.json({
      data: filtered,
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('GET /api/visits error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // All roles can log visits (Sales Person for their doctors, others for any)
    const body = await request.json();

    if (!body.meetingSummary || body.meetingSummary.length < 500) {
      return Response.json(
        { error: 'Meeting summary must be at least 500 characters' },
        { status: 400 }
      );
    }

    // Clean up empty fields
    Object.keys(body).forEach(key => {
      if (body[key] === '') delete body[key];
    });

    if (!body.doctor) {
      return Response.json({ error: 'Doctor is required' }, { status: 400 });
    }

    const newDoctor = await Doctor.findById(body.doctor).select('city name').lean();
    if (!newDoctor) {
      return Response.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const visitDate = new Date(body.visitDate || Date.now());
    const dayStart = startOfDay(visitDate);
    const dayEnd = endOfDay(visitDate);
    const newCity = newDoctor.city?.trim().toLowerCase() || '';

    const salesPersonQuery = await buildSalesPersonVisitFilter(user.userId, user.name);
    const sameDayVisits = await Visit.find({
      ...salesPersonQuery,
      visitDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'Cancelled' },
    })
      .populate('doctor', 'name city slug')
      .lean();

    const cityConflict = sameDayVisits.find((existing) => {
      const doc = existing.doctor as { city?: string } | null;
      const existingCity = doc?.city?.trim().toLowerCase() || '';
      return existingCity && newCity && existingCity !== newCity;
    });

    if (cityConflict) {
      const conflictDoc = cityConflict.doctor as { name?: string; city?: string; slug?: string };
      return Response.json(
        {
          error: 'CITY_CONFLICT',
          message: `You already have a visit on ${format(visitDate, 'dd MMM yyyy')} in ${conflictDoc.city}. A rep cannot log visits in two different cities on the same day.`,
          details: {
            existingCity: conflictDoc.city,
            existingDoctor: conflictDoc.name,
            existingVisitSlug: cityConflict.slug,
            newCity: newDoctor.city,
            newDoctor: newDoctor.name,
            visitDate: format(visitDate, 'yyyy-MM-dd'),
          },
        },
        { status: 409 }
      );
    }

    const slugBase = `${format(visitDate, 'yyyy-MM-dd')}-${body.doctorName || 'visit'}-${body.visitType || 'visit'}`;
    const slug = await generateUniqueSlug(slugBase, async (s) => !!(await Visit.findOne({ slug: s })));

    const visit = await Visit.create({
      ...body,
      slug,
      salesPerson: user.userId,
      status: 'Pending',
      statusUpdatedAt: new Date(),
    });

    // Rollup total cases submitted to Doctor's lifetimeCasesSubmitted
    if (body.totalCasesSubmittedThisVisit) {
      const cases = Number(body.totalCasesSubmittedThisVisit);
      if (!isNaN(cases) && cases > 0) {
        await Doctor.findByIdAndUpdate(body.doctor, { $inc: { lifetimeCasesSubmitted: cases } });
      }
    }

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE',
      entity: 'Visit',
      entityId: visit._id.toString(),
      entityLabel: slug,
      after: body,
    });

    return Response.json({ data: visit }, { status: 201 });
  } catch (error) {
    console.error('POST /api/visits error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
