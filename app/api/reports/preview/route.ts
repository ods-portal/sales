import { getAuthUser, canAccessReports } from '@/lib/auth';
import { fetchReportData, type ReportRange } from '@/lib/reports';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessReports(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || 'monthly') as ReportRange;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const doctorId = searchParams.get('doctorId') || undefined;
    const salesPersonId = searchParams.get('salesPersonId') || undefined;
    const city = searchParams.get('city') || undefined;
    const area = searchParams.get('area') || undefined;

    if (!['daily', 'weekly', 'monthly', 'custom'].includes(range)) {
      return Response.json({ error: 'Invalid range.' }, { status: 400 });
    }

    const filters = { doctorId, salesPersonId, city, area };
    const data = await fetchReportData(range, user.name, from, to, filters);

    return Response.json({
      periodLabel: data.periodLabel,
      filtersLabel: data.filtersLabel,
      kpis: data.kpis,
      repPerformance: data.repPerformance,
      statusBreakdown: data.statusBreakdown,
      visitTypeBreakdown: data.visitTypeBreakdown,
      visits: data.visits,
      doctorCount: data.doctors.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('date') || message.includes('range')) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error('GET /api/reports/preview error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
