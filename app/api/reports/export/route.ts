import { getAuthUser, canAccessReports } from '@/lib/auth';
import {
  fetchReportData,
  generateReportCsv,
  generateReportHtml,
  resolveReportPeriod,
  type ReportRange,
} from '@/lib/reports';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessReports(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const range = (searchParams.get('range') || 'monthly') as ReportRange;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const doctorId = searchParams.get('doctorId') || undefined;
    const salesPersonId = searchParams.get('salesPersonId') || undefined;

    const filters = { doctorId, salesPersonId };

    if (!['csv', 'html'].includes(format)) {
      return Response.json({ error: 'Invalid format. Use csv or html.' }, { status: 400 });
    }
    if (!['daily', 'weekly', 'monthly', 'custom'].includes(range)) {
      return Response.json({ error: 'Invalid range.' }, { status: 400 });
    }

    const period = resolveReportPeriod(range, from, to);
    const data = await fetchReportData(range, user.name, from, to, filters);

    let filenameBase = `dsr-report-${period.filenameSuffix}`;
    if (doctorId) filenameBase += '-doctor';
    if (salesPersonId) filenameBase += '-rep';

    if (format === 'csv') {
      const csv = generateReportCsv(data);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
        },
      });
    }

    const html = generateReportHtml(data);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.html"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('date') || message.includes('range')) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error('GET /api/reports/export error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
