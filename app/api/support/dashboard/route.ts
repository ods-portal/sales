import { connectDB } from '@/lib/db';
import { getAuthUser, canAccessSupport } from '@/lib/auth';
import { SUPPORT_CLOSED_STATUS, SUPPORT_OPEN_STATUS } from '@/lib/supportConstants';
import { supportTicketScope } from '@/lib/support';
import SupportTicket from '@/models/SupportTicket';
import Doctor from '@/models/Doctor';
import { Types } from 'mongoose';
import { subDays, startOfDay, startOfMonth, eachDayOfInterval } from 'date-fns';

void Doctor;

const TREND_DAYS = 14;
const REPORT_TIMEZONE = 'Asia/Kolkata';

const toDateKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: REPORT_TIMEZONE });
const RECENT_LIMIT = 6;

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessSupport(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const trendStart = startOfDay(subDays(now, TREND_DAYS - 1));
    const notClosed = { status: { $ne: SUPPORT_CLOSED_STATUS } };
    const scope = supportTicketScope(user);
    const scoped = (filter: Record<string, unknown> = {}) => ({ ...scope, ...filter });

    const [
      totalTickets,
      openTickets,
      createdToday,
      closedThisMonth,
      myOpenTickets,
      unassigned,
      statusDistribution,
      reasonDistribution,
      trendRaw,
      recentTickets,
      myQueue,
    ] = await Promise.all([
      SupportTicket.countDocuments(scoped()),
      SupportTicket.countDocuments(scoped(notClosed)),
      SupportTicket.countDocuments(scoped({ createdAt: { $gte: todayStart } })),
      SupportTicket.countDocuments(scoped({ status: SUPPORT_CLOSED_STATUS, closedAt: { $gte: monthStart } })),
      SupportTicket.countDocuments({ ...notClosed, assignedTo: new Types.ObjectId(user.userId) }),
      SupportTicket.countDocuments(scoped({ ...notClosed, assignedTo: { $exists: false } })),
      SupportTicket.aggregate([{ $match: scoped() }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      SupportTicket.aggregate([{ $match: scoped() }, { $group: { _id: '$reason', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      SupportTicket.aggregate([
        { $match: scoped({ createdAt: { $gte: trendStart } }) },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TIMEZONE } }, count: { $sum: 1 } } },
      ]),
      SupportTicket.find(scoped())
        .select('ticketNo patientId reason status assignedToName createdAt doctor')
        .populate('doctor', 'name slug')
        .sort({ createdAt: -1 })
        .limit(RECENT_LIMIT)
        .lean(),
      SupportTicket.find({ ...notClosed, assignedTo: new Types.ObjectId(user.userId) })
        .select('ticketNo patientId reason status createdAt doctor')
        .populate('doctor', 'name slug')
        .sort({ createdAt: 1 })
        .limit(RECENT_LIMIT)
        .lean(),
    ]);

    const trendMap = new Map(trendRaw.map((t: { _id: string; count: number }) => [t._id, t.count]));
    const trend = eachDayOfInterval({ start: trendStart, end: now }).map((d) => {
      const date = toDateKey(d);
      return { date, count: trendMap.get(date) ?? 0 };
    });

    return Response.json({
      kpis: {
        totalTickets,
        openTickets,
        createdToday,
        closedThisMonth,
        myOpenTickets,
        unassigned,
        newTickets: statusDistribution.find((s: { _id: string }) => s._id === SUPPORT_OPEN_STATUS)?.count ?? 0,
      },
      statusDistribution,
      reasonDistribution,
      trend,
      recentTickets,
      myQueue,
    });
  } catch (error) {
    console.error('GET /api/support/dashboard error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
