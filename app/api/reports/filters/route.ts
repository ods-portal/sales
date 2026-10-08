import { getAuthUser, canAccessReports } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import User from '@/models/User';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessReports(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const [doctors, salesPersons] = await Promise.all([
      Doctor.find({})
        .select('name city area speciality slug')
        .sort({ name: 1 })
        .lean(),
      User.find({ role: 'salesPerson', status: 'active' })
        .select('name slug email')
        .sort({ name: 1 })
        .lean(),
    ]);

    return Response.json({
      doctors: doctors.map((d) => ({
        id: String(d._id),
        name: d.name,
        city: d.city || '',
        area: d.area || '',
        speciality: d.speciality || '',
        slug: d.slug,
      })),
      salesPersons: salesPersons.map((u) => ({
        id: String(u._id),
        name: u.name,
        slug: u.slug,
      })),
    });
  } catch (error) {
    console.error('GET /api/reports/filters error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
