import { connectDB } from '@/lib/db';
import { getAuthUser, canAccessSupport } from '@/lib/auth';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessSupport(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const employees = await User.find({ role: 'support', status: 'active' })
      .select('name email')
      .sort({ name: 1 })
      .lean();

    return Response.json({ data: employees });
  } catch (error) {
    console.error('GET /api/support/employees error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
