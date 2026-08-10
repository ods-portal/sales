'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatDate, daysSince } from '@/lib/utils';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface OverdueVisit {
  _id: string;
  slug: string;
  followUpDate: string;
  visitDate: string;
  doctor: { name: string; slug: string; city: string };
  salesPerson: { name: string; slug: string };
  visitType: string;
}

export default function AlertsPage() {
  const [overdueList, setOverdueList] = useState<OverdueVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((d) => {
      setOverdueList(d.overdueList || []);
      setLoading(false);
    });
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Alerts & Compliance"
        subtitle="Follow-ups that need your immediate attention"
        icon={<Bell className="h-5 w-5" />}
      />

      {loading ? (
        <Card>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton mb-2.5 h-[72px] rounded-xl" />
          ))}
        </Card>
      ) : overdueList.length === 0 ? (
        <Card className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">🎉</div>
          <div className="text-xl font-bold text-slate-900">You&apos;re all caught up!</div>
          <div className="mt-2 text-sm text-slate-500">No overdue follow-ups at this time.</div>
        </Card>
      ) : (
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <Badge variant="danger">{overdueList.length} overdue</Badge>
            <span className="text-[13px] text-slate-500">Sorted by most overdue first</span>
          </div>
          <div className="flex flex-col gap-3">
            {overdueList.map((v) => {
              const daysOver = daysSince(v.followUpDate);
              const critical = daysOver > 7;
              return (
                <div
                  key={v._id}
                  className={`rounded-2xl border p-4 transition-all hover:shadow-md ${
                    critical
                      ? 'border-rose-200/80 bg-gradient-to-r from-rose-50/90 to-orange-50/50'
                      : 'border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-yellow-50/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${critical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/doctors/${v.doctor?.slug}`} className="text-[15px] font-bold text-slate-900 no-underline hover:text-brand">
                          {v.doctor?.name}
                        </Link>
                        <Badge variant={critical ? 'danger' : 'warning'}>
                          {daysOver} day{daysOver !== 1 ? 's' : ''} overdue
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[13px] text-slate-600">
                        {v.doctor?.city} · {v.visitType} · Rep: {v.salesPerson?.name || 'Unknown'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Due: {formatDate(v.followUpDate)} · Visit: {formatDate(v.visitDate)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/visits/${v.slug}`} className="btn btn-secondary btn-sm">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link href={`/visits/new?doctor=${v.doctor?.slug}`} className="btn btn-primary btn-sm">
                        Log Follow-up
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
