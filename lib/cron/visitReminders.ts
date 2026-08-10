import { connectDB } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { buildSalesPersonVisitFilter } from '@/lib/resolveRep';
import User from '@/models/User';
import Visit from '@/models/Visit';
import { format } from 'date-fns';
import { formatISTDate, getISTDateString, getISTDayBounds, getISTYesterdayString } from './ist';
import { buildMissingYesterdayEmail, buildTodayReminderEmail } from './emailTemplates';

export interface CronEmailResult {
  email: string;
  name: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  visitCount?: number;
}

export interface CronJobResult {
  job: string;
  ranAt: string;
  istDate: string;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  results: CronEmailResult[];
}

async function getActiveSalesPersons() {
  return User.find({ role: 'salesPerson', status: 'active' })
    .select('name email')
    .sort({ name: 1 })
    .lean();
}

export async function runTodayVisitReminderCron(): Promise<CronJobResult> {
  await connectDB();

  const todayIST = getISTDateString();
  const { start, end } = getISTDayBounds(todayIST);
  const salesPersons = await getActiveSalesPersons();
  const results: CronEmailResult[] = [];

  for (const rep of salesPersons) {
    const repId = rep._id.toString();
    const filter = await buildSalesPersonVisitFilter(repId, rep.name);

    const visits = await Visit.find({
      ...filter,
      status: { $in: ['Pending', 'Overdue'] },
      $or: [
        { followUpDate: { $gte: start, $lte: end } },
        { visitDate: { $gte: start, $lte: end } },
      ],
    })
      .populate('doctor', 'name city')
      .sort({ followUpDate: 1 })
      .lean();

    if (visits.length === 0) {
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'skipped',
        reason: 'No visits due today',
        visitCount: 0,
      });
      continue;
    }

    const todayLabel = formatISTDate(todayIST);
    const email = buildTodayReminderEmail(
      rep.name,
      todayLabel,
      visits.map((v) => {
        const doctor = v.doctor as { name?: string; city?: string } | undefined;
        return {
          doctorName: doctor?.name || 'Doctor',
          doctorCity: doctor?.city || '—',
          visitType: v.visitType,
          followUpDate: formatISTDate(v.followUpDate),
          status: v.status,
        };
      })
    );

    try {
      await sendEmail({
        to: rep.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'sent',
        visitCount: visits.length,
      });
    } catch (error) {
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Send failed',
        visitCount: visits.length,
      });
    }
  }

  return summarizeResults('today-visit-reminder', todayIST, results);
}

export async function runMissingYesterdayVisitCron(): Promise<CronJobResult> {
  await connectDB();

  const yesterdayIST = getISTYesterdayString();
  const { start, end } = getISTDayBounds(yesterdayIST);
  const salesPersons = await getActiveSalesPersons();
  const results: CronEmailResult[] = [];

  for (const rep of salesPersons) {
    const repId = rep._id.toString();
    const filter = await buildSalesPersonVisitFilter(repId, rep.name);

    const yesterdayVisits = await Visit.countDocuments({
      ...filter,
      visitDate: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' },
    });

    if (yesterdayVisits > 0) {
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'skipped',
        reason: `Already logged ${yesterdayVisits} visit(s) for ${yesterdayIST}`,
        visitCount: yesterdayVisits,
      });
      continue;
    }

    const yesterdayLabel = formatISTDate(yesterdayIST);
    const checkedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');
    const email = buildMissingYesterdayEmail(rep.name, yesterdayLabel, checkedAt);

    try {
      await sendEmail({
        to: rep.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'sent',
        visitCount: 0,
      });
    } catch (error) {
      results.push({
        email: rep.email,
        name: rep.name,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Send failed',
      });
    }
  }

  return summarizeResults('missing-yesterday-visit', yesterdayIST, results);
}

function summarizeResults(
  job: string,
  istDate: string,
  results: CronEmailResult[]
): CronJobResult {
  return {
    job,
    ranAt: new Date().toISOString(),
    istDate,
    emailsSent: results.filter((r) => r.status === 'sent').length,
    emailsSkipped: results.filter((r) => r.status === 'skipped').length,
    emailsFailed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}
