import { connectDB } from '@/lib/db';
import { getAuthUser, isSuperAdmin } from '@/lib/auth';
import { paginationMeta } from '@/lib/utils';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const entity = searchParams.get('entity') || '';
    const action = searchParams.get('action') || '';
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (entity) query.entity = entity;
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return Response.json({ data: logs, ...paginationMeta(total, page, limit) });
  } catch (error) {
    console.error('GET /api/audit error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
