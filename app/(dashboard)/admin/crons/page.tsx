'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarClock, Clock, Mail, Play } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

type CronJobId = 'today-visit-reminder' | 'missing-yesterday-visit';

interface CronJobResult {
  success: boolean;
  job: string;
  source: string;
  istDate: string;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  results: Array<{
    email: string;
    name: string;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
    visitCount?: number;
  }>;
  error?: string;
}

const CRON_JOBS: {
  id: CronJobId;
  title: string;
  description: string;
  schedule: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'today-visit-reminder',
    title: "Today's Visit Reminder",
    description:
      'Emails active sales reps who have pending/overdue visits due today (follow-up or visit date is today IST).',
    schedule: 'Daily at 8:00 PM IST',
    icon: <CalendarClock className="h-5 w-5" />,
  },
  {
    id: 'missing-yesterday-visit',
    title: "Missing Yesterday's Visit Entry",
    description:
      'Emails active sales reps who did not log at least one visit with yesterday\'s visit date.',
    schedule: 'Daily at 8:00 PM IST',
    icon: <Clock className="h-5 w-5" />,
  },
];

export default function AdminCronsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<CronJobId | null>(null);
  const [lastResult, setLastResult] = useState<CronJobResult | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const user = data.user;
        const canAccess =
          user?.role === 'superAdmin' || (user?.role === 'admin' && user?.hasWriteAccess);
        if (!canAccess) {
          router.replace('/dashboard');
          return;
        }
        setLoading(false);
      });
  }, [router]);

  const runCron = async (jobId: CronJobId) => {
    setRunning(jobId);
    setLastResult(null);
    try {
      const res = await fetch(`/api/cron/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Cron job failed', 'error');
        setLastResult({ success: false, ...data });
        return;
      }
      setLastResult(data);
      addToast(
        `Cron completed — ${data.emailsSent} sent, ${data.emailsSkipped} skipped, ${data.emailsFailed} failed`,
        data.emailsFailed > 0 ? 'error' : 'success'
      );
    } finally {
      setRunning(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <PageHeader
        title="Cron Jobs"
        subtitle="Automated email reminders for sales reps — scheduled daily at 8:00 PM IST on Vercel"
        icon={<Bell className="h-5 w-5" />}
      />

      <Card className="mb-4 border-indigo-100 bg-indigo-50/50">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Email configuration required</p>
            <p className="mt-1">
              Set <code className="rounded bg-white px-1.5 py-0.5 text-xs">EMAIL_FROM</code>,{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">SMTP_HOST</code>,{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">SMTP_USER</code>, and{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">SMTP_PASS</code>.
              For Vercel crons, also set <code className="rounded bg-white px-1.5 py-0.5 text-xs">CRON_SECRET</code>.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {CRON_JOBS.map((job) => (
          <Card key={job.id} hover>
            <div className="mb-3 flex items-center gap-2 text-brand">
              {job.icon}
              <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
            </div>
            <p className="mb-2 text-sm leading-relaxed text-slate-500">{job.description}</p>
            <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Schedule: {job.schedule}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm w-full"
              disabled={!!running}
              onClick={() => runCron(job.id)}
            >
              <Play className="h-4 w-4" />
              {running === job.id ? 'Running…' : 'Run Now'}
            </button>
          </Card>
        ))}
      </div>

      {lastResult && (
        <Card className="mt-4">
          <h3 className="mb-4 text-base font-bold text-slate-900">Last Run Result</h3>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Job', value: lastResult.job },
              { label: 'IST Date', value: lastResult.istDate },
              { label: 'Sent', value: lastResult.emailsSent },
              { label: 'Skipped', value: lastResult.emailsSkipped },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          {lastResult.results?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="responsive-table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3">Sales Rep</th>
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {lastResult.results.map((row) => (
                    <tr key={row.email} className="border-b border-slate-100 last:border-0">
                      <td className="cell-primary py-2.5 pr-3 font-medium">{row.name}</td>
                      <td data-label="Email" className="cell-wide py-2.5 pr-3 text-slate-600 max-md:break-all">{row.email}</td>
                      <td data-label="Status" className="py-2.5 pr-3 capitalize">{row.status}</td>
                      <td data-label="Details" className="cell-wide py-2.5 text-slate-500">
                        {row.reason ||
                          (row.visitCount !== undefined ? `${row.visitCount} visit(s)` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}
