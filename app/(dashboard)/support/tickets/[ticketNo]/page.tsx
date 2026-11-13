'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Ticket, CheckCircle2 } from 'lucide-react';
import { canManageSupportTickets, formatDateTime, type PermissionUser } from '@/lib/utils';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import SupportStatusBadge from '@/components/support/SupportStatusBadge';
import TicketAttachments from '@/components/support/TicketAttachments';
import StatusTimeline from '@/components/support/StatusTimeline';
import TicketUpdatePanel from '@/components/support/TicketUpdatePanel';
import { useSupportOptions } from '@/components/support/useSupportOptions';
import type { SupportTicket } from '@/components/support/types';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function TextBlock({ title, text, empty }: { title: string; text?: string; empty: string }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {text ? (
        <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">{text}</p>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[13px] text-slate-500">{empty}</p>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <PageShell>
      <div className="skeleton h-12 w-2/3 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </PageShell>
  );
}

export default function SupportTicketDetailPage() {
  const { ticketNo } = useParams<{ ticketNo: string }>();
  const { statuses, employees } = useSupportOptions();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<PermissionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/support/tickets/${encodeURIComponent(ticketNo)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load ticket');
        setTicket(data.data);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load ticket');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [ticketNo]);

  if (loading) return <DetailSkeleton />;

  if (error || !ticket) {
    return (
      <PageShell>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🎫</div>
          <p className="font-semibold text-slate-900">{error ?? 'Ticket not found'}</p>
          <p className="mt-1 text-[13px] text-slate-500">The ticket may have been removed or the link is incorrect.</p>
          <Link href="/support/tickets" className="btn btn-primary mt-5">Back to tickets</Link>
        </Card>
      </PageShell>
    );
  }

  const canManage = canManageSupportTickets(currentUser);

  return (
    <PageShell>
      <PageHeader
        title={ticket.ticketNo}
        subtitle={`${ticket.reason} · raised ${formatDateTime(ticket.createdAt)}`}
        icon={<Ticket className="h-5 w-5" />}
        actions={
          <>
            <SupportStatusBadge status={ticket.status} className="!px-3 !py-1.5 !text-[13px]" />
            <Link href="/support/tickets" className="btn btn-secondary">
              <ChevronLeft className="h-4 w-4" /> All Tickets
            </Link>
          </>
        }
      />

      {ticket.closedAt && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 shadow-sm" role="status">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-emerald-900">
            <span className="font-semibold">Closed</span> on {formatDateTime(ticket.closedAt)}
            {ticket.closedByName && <> by <span className="font-semibold">{ticket.closedByName}</span></>}. Kept for reference.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardTitle>Ticket Details</CardTitle>
            <CardDescription className="mb-5">Doctor, patient and issue information</CardDescription>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
              <DetailRow label="Doctor">
                {ticket.doctor ? (
                  <Link href={`/doctors/${ticket.doctor.slug}`} className="font-semibold text-brand hover:text-brand-hover hover:underline">
                    {ticket.doctor.name}
                  </Link>
                ) : 'Doctor removed'}
              </DetailRow>
              <DetailRow label="Patient ID">{ticket.patientId}</DetailRow>
              <DetailRow label="Reason">{ticket.reason}</DetailRow>
              <DetailRow label="Assigned To">{ticket.assignedToName || <span className="text-slate-400">Unassigned</span>}</DetailRow>
              <DetailRow label="Support Date & Time">{formatDateTime(ticket.createdAt)}</DetailRow>
              <DetailRow label="Created By">{ticket.createdByName}</DetailRow>
              {ticket.doctor?.phone && <DetailRow label="Doctor Phone">{ticket.doctor.phone}</DetailRow>}
              {(ticket.doctor?.area || ticket.doctor?.city) && (
                <DetailRow label="Location">{[ticket.doctor?.area, ticket.doctor?.city].filter(Boolean).join(', ')}</DetailRow>
              )}
              <DetailRow label="Closing Date & Time">
                {ticket.closedAt ? formatDateTime(ticket.closedAt) : <span className="text-slate-400">Not closed yet</span>}
              </DetailRow>
            </dl>
            <div className="mt-6 space-y-5">
              <TextBlock title="Doctor Concern / Issue" text={ticket.concern} empty="No description provided" />
              <TextBlock title="Support Provided / Action Taken" text={ticket.actionTaken} empty="No action recorded yet" />
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-4">Attachments</CardTitle>
            <TicketAttachments images={ticket.images ?? []} videos={ticket.videos ?? []} />
          </Card>
        </div>

        <div className="space-y-4">
          {canManage && (
            <TicketUpdatePanel key={ticket.updatedAt} ticket={ticket} statuses={statuses} employees={employees} onUpdated={setTicket} />
          )}
          <Card>
            <CardTitle>Status History</CardTitle>
            <CardDescription className="mb-5">Every update with date, time and employee</CardDescription>
            <StatusTimeline history={ticket.statusHistory ?? []} />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
