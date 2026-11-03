'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Stethoscope, Calendar, Clock, AlertTriangle, TrendingUp, Plus, ArrowRight,
} from 'lucide-react';
import { formatDate, daysSince, canCreateRecords, type PermissionUser } from '@/lib/utils';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';

interface KPI {
  totalDoctors: number;
  visitsThisMonth: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  conversionRate: number;
}

interface DashboardData {
  kpis: KPI;
  visitTrend: Array<{ date: string; count: number }>;
  categoryDistribution: Array<{ _id: string; count: number }>;
  recentVisits: Array<{
    _id: string;
    slug: string;
    visitDate: string;
    visitType: string;
    doctor: { name: string; slug: string; city: string; speciality: string };
    salesPerson: { name: string; slug: string };
    status: string;
  }>;
  overdueList: Array<{
    _id: string;
    slug: string;
    followUpDate: string;
    doctor: { name: string; slug: string };
    salesPerson: { name: string };
  }>;
}

const CAT_COLORS: Record<string, string> = {
  A: '#4F46E5', B: '#0EA5A4', C: '#F59E0B', D: '#9CA3AF',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<'7' | '14' | '30'>('30');
  const [currentUser, setCurrentUser] = useState<PermissionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredTrend = data?.visitTrend?.slice(-parseInt(trendRange)) || [];

  return (
    <PageShell>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Your sales intelligence at a glance"
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          canCreateRecords(currentUser) ? (
            <Link href="/visits/new" className="btn btn-primary">
              <Plus className="h-4 w-4" /> Log New Visit
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <KpiCard label="Total Doctors" value={data?.kpis?.totalDoctors || 0} hint="Registered in system" accent="indigo" icon={<Stethoscope className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Visits This Month" value={data?.kpis?.visitsThisMonth || 0} hint="Current month" accent="emerald" icon={<Calendar className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Pending Follow-ups" value={data?.kpis?.pendingFollowUps || 0} hint="Scheduled ahead" accent="amber" icon={<Clock className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Overdue" value={data?.kpis?.overdueFollowUps || 0} hint="Needs attention" accent="rose" icon={<AlertTriangle className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Conversion Rate" value={`${data?.kpis?.conversionRate || 0}%`} hint="Doctors with visits" accent="sky" icon={<TrendingUp className="h-5 w-5" />} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <CardTitle>Visit Trend</CardTitle>
              <CardDescription>Daily visit frequency</CardDescription>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
              {(['7', '14', '30'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTrendRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${trendRange === r ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-[220px] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={filteredTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} labelFormatter={(v) => new Date(v as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'long' })} />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Doctor Categories</CardTitle>
          <CardDescription className="mb-4">Distribution by category</CardDescription>
          {loading ? (
            <div className="skeleton h-[220px] rounded-xl" />
          ) : !data?.categoryDistribution?.length ? (
            <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
              <div className="mb-2 text-3xl">📊</div>
              <p className="text-sm font-semibold text-slate-700">No doctor categories yet</p>
              <p className="mt-1 max-w-[200px] text-xs text-slate-500">
                Categories appear once doctors are assigned to you
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.categoryDistribution} dataKey="count" nameKey="_id" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {data.categoryDistribution.map((entry, i) => (
                    <Cell key={i} fill={CAT_COLORS[entry._id] || '#E5E7EB'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} doctors`, `Category ${n}`]} />
                <Legend formatter={(v) => `Category ${v}`} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Recent Visits</CardTitle>
            <Link href="/visits" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton mb-2 h-14 rounded-xl" />)
          ) : (
            <div className="flex flex-col gap-1.5">
              {data?.recentVisits?.slice(0, 6).map((v) => (
                <Link key={v._id} href={`/visits/${v.slug}`} className="no-underline">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-indigo-50/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-brand">
                      {v.doctor?.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{v.doctor?.name}</div>
                      <div className="text-xs text-slate-500">{v.visitType} · {formatDate(v.visitDate)}</div>
                    </div>
                    <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Overdue Follow-ups</CardTitle>
            <Link href="/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton mb-2 h-14 rounded-xl" />)
          ) : data?.overdueList?.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">🎉</div>
              <div className="font-semibold text-slate-900">All caught up!</div>
              <div className="mt-1 text-[13px] text-slate-500">No overdue follow-ups</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data?.overdueList?.slice(0, 6).map((v) => (
                <Link key={v._id} href={`/visits/${v.slug}`} className="no-underline">
                  <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-orange-50/50 px-3 py-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{v.doctor?.name}</div>
                      <div className="text-xs text-rose-600">{daysSince(v.followUpDate)} days overdue · {v.salesPerson?.name}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
