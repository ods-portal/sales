'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  LifeBuoy, Inbox, CalendarPlus, CheckCircle2, UserCheck, UserX, Plus, ArrowRight,
} from 'lucide-react';
import { canManageSupportTickets, type PermissionUser } from '@/lib/utils';
import { supportStatusBarClass } from '@/lib/supportConstants';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import BreakdownBars from '@/components/support/BreakdownBars';
import TicketListItem, { type TicketListItemData } from '@/components/support/TicketListItem';

interface SupportDashboardData {
  kpis: {
    totalTickets: number;
    openTickets: number;
    createdToday: number;
    closedThisMonth: number;
    myOpenTickets: number;
    unassigned: number;
  };
  statusDistribution: Array<{ _id: string; count: number }>;
  reasonDistribution: Array<{ _id: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
  recentTickets: TicketListItemData[];
  myQueue: TicketListItemData[];
}

const CHART_HEIGHT = 220;
const SKELETON_ROWS = 5;

const ticketsHref = (key: 'status' | 'reason') => (value: string) => `/support/tickets?${key}=${encodeURIComponent(value)}`;

function ListSkeleton() {
  return <>{Array.from({ length: SKELETON_ROWS }).map((_, i) => <div key={i} className="skeleton mb-2 h-14 rounded-xl" />)}</>;
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">{icon}</div>
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-[13px] text-slate-500">{hint}</div>
    </div>
  );
}

function SectionLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover">
      View all <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function SupportDashboardPage() {
  const [data, setData] = useState<SupportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<PermissionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));

    const load = async () => {
      try {
        const res = await fetch('/api/support/dashboard');
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load dashboard');
        setData(d);
      } catch (err) {
        console.error(err);
        setError('Could not load the support dashboard. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isSupport = currentUser?.role === 'support';
  const kpis = data?.kpis;

  return (
    <PageShell>
      <PageHeader
        title="Support Overview"
        subtitle="Doctor support tickets at a glance"
        icon={<LifeBuoy className="h-5 w-5" />}
        actions={
          canManageSupportTickets(currentUser) ? (
            <Link href="/support/tickets/new" className="btn btn-primary">
              <Plus className="h-4 w-4" /> New Ticket
            </Link>
          ) : undefined
        }
      />

      {error && (
        <p className="rounded-xl border border-danger-light bg-rose-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-4">
        <KpiCard label="Open Tickets" value={kpis?.openTickets ?? 0} hint="Not yet closed" accent="indigo" icon={<Inbox className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Created Today" value={kpis?.createdToday ?? 0} hint="New requests today" accent="sky" icon={<CalendarPlus className="h-5 w-5" />} loading={loading} />
        {isSupport ? (
          <KpiCard label="Assigned To Me" value={kpis?.myOpenTickets ?? 0} hint="Open in my queue" accent="violet" icon={<UserCheck className="h-5 w-5" />} loading={loading} />
        ) : (
          <KpiCard label="Total Tickets" value={kpis?.totalTickets ?? 0} hint="All time" accent="violet" icon={<LifeBuoy className="h-5 w-5" />} loading={loading} />
        )}
        <KpiCard label="Unassigned" value={kpis?.unassigned ?? 0} hint="Needs an owner" accent="amber" icon={<UserX className="h-5 w-5" />} loading={loading} />
        <KpiCard label="Closed This Month" value={kpis?.closedThisMonth ?? 0} hint="Current month" accent="emerald" icon={<CheckCircle2 className="h-5 w-5" />} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardTitle>Ticket Trend</CardTitle>
          <CardDescription className="mb-5">Tickets raised in the last 14 days</CardDescription>
          {loading ? (
            <div className="skeleton rounded-xl" style={{ height: CHART_HEIGHT }} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={data?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} labelFormatter={(v) => new Date(v as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'long' })} />
                <Line type="monotone" dataKey="count" name="Tickets" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>By Status</CardTitle>
          <CardDescription className="mb-5">Tap a status to see its tickets</CardDescription>
          {loading ? (
            <div className="skeleton rounded-xl" style={{ height: CHART_HEIGHT }} />
          ) : !data?.statusDistribution?.length ? (
            <EmptyState icon="📊" title="No tickets yet" hint="Status breakdown appears once tickets are raised" />
          ) : (
            <BreakdownBars rows={data.statusDistribution} hrefFor={ticketsHref('status')} colorFor={supportStatusBarClass} ariaLabel="Tickets by status" />
          )}
        </Card>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isSupport ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Recent Tickets</CardTitle>
            <SectionLink href="/support/tickets" />
          </div>
          {loading ? <ListSkeleton /> : !data?.recentTickets?.length ? (
            <EmptyState icon="🎫" title="No tickets yet" hint="New tickets will show up here" />
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.recentTickets.map((t) => <TicketListItem key={t._id} ticket={t} />)}
            </div>
          )}
        </Card>

        {isSupport && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>My Queue</CardTitle>
              <SectionLink href="/support/tickets?assignedTo=me" />
            </div>
            {loading ? <ListSkeleton /> : !data?.myQueue?.length ? (
              <EmptyState icon="🎉" title="All caught up!" hint="No open tickets assigned to you" />
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.myQueue.map((t) => <TicketListItem key={t._id} ticket={t} />)}
              </div>
            )}
          </Card>
        )}

        <Card>
          <CardTitle>By Reason</CardTitle>
          <CardDescription className="mb-5">Most common support requests</CardDescription>
          {loading ? <ListSkeleton /> : !data?.reasonDistribution?.length ? (
            <EmptyState icon="🧾" title="No data yet" hint="Reasons appear once tickets are raised" />
          ) : (
            <BreakdownBars rows={data.reasonDistribution} hrefFor={ticketsHref('reason')} ariaLabel="Tickets by reason" />
          )}
        </Card>
      </div>
    </PageShell>
  );
}
