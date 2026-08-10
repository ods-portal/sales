import { NextRequest } from 'next/server';
import { authorizeCronOrAdmin } from '@/lib/cron/auth';
import { runTodayVisitReminderCron } from '@/lib/cron/visitReminders';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const auth = await authorizeCronOrAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const result = await runTodayVisitReminderCron();
    return Response.json({
      success: true,
      source: auth.source,
      ...result,
    });
  } catch (error) {
    console.error('GET/POST /api/cron/today-visit-reminder error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
