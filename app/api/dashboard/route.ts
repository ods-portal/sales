import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { buildSalesPersonVisitFilter, buildSalesPersonDoctorFilter, resolveSalesPersonsForVisits, prepareMongoMatchFilter } from '@/lib/resolveRep';
import Doctor from '@/models/Doctor';
import Visit from '@/models/Visit';
import { subDays, startOfMonth, eachDayOfInterval, format } from 'date-fns';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = subDays(now, 30);

    const baseQuery =
      user.role === 'salesPerson'
        ? await buildSalesPersonVisitFilter(user.userId, user.name)
        : {};
    const doctorBaseQuery =
      user.role === 'salesPerson'
        ? await buildSalesPersonDoctorFilter(user.userId, user.name)
        : {};

    const visitMatch = prepareMongoMatchFilter(baseQuery);
    const doctorMatch = prepareMongoMatchFilter(doctorBaseQuery);

    const [
      totalDoctors,
      visitsThisMonth,
      pendingFollowUps,
      overdueFollowUps,
      recentVisits,
      categoryDistribution,
      visitTrend,
    ] = await Promise.all([
      Doctor.countDocuments(doctorBaseQuery),
      Visit.countDocuments({
        ...baseQuery,
        visitDate: { $gte: monthStart },
      }),
      Visit.countDocuments({
        ...baseQuery,
        followUpDate: { $gte: now },
        status: { $in: ['Pending'] },
      }),
      Visit.countDocuments({
        ...baseQuery,
        followUpDate: { $lt: now },
        status: 'Overdue',
      }),
      Visit.find(baseQuery)
        .populate('doctor', 'name slug city area speciality')
        .populate('salesPerson', 'name slug')
        .sort({ visitDate: -1 })
        .limit(10)
        .lean(),
      Doctor.aggregate([
        { $match: doctorMatch },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Visit.aggregate([
        {
          $match: {
            ...visitMatch,
            visitDate: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$visitDate' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Fill in missing days in trend
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
    const trendMap = new Map(visitTrend.map((v: { _id: string; count: number }) => [v._id, v.count]));
    const trend = days.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      count: trendMap.get(format(d, 'yyyy-MM-dd')) || 0,
    }));

    // Conversion rate: doctors with at least 1 completed visit / total doctors
    const doctorsWithVisits = await Visit.distinct('doctor', {
      ...baseQuery,
      status: 'Completed',
    });
    const conversionRate =
      totalDoctors > 0
        ? Math.round((doctorsWithVisits.length / totalDoctors) * 100)
        : 0;

    // Overdue follow-ups list
    const overdueListRaw = await Visit.find({
      ...baseQuery,
      followUpDate: { $lt: now },
      status: { $in: ['Pending', 'Overdue'] },
    })
      .populate('doctor', 'name slug city area')
      .populate('salesPerson', 'name slug')
      .sort({ followUpDate: 1 })
      .limit(20)
      .lean();

    const [recentVisitsResolved, overdueList] = await Promise.all([
      resolveSalesPersonsForVisits(recentVisits),
      resolveSalesPersonsForVisits(overdueListRaw),
    ]);

    return Response.json({
      kpis: {
        totalDoctors,
        visitsThisMonth,
        pendingFollowUps,
        overdueFollowUps,
        conversionRate,
      },
      visitTrend: trend,
      categoryDistribution,
      recentVisits: recentVisitsResolved,
      overdueList,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
