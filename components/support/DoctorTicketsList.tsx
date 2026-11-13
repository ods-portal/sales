'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TicketListItem, { type TicketListItemData } from './TicketListItem';

const DOCTOR_TICKET_LIMIT = 50;

interface DoctorTicketsListProps {
  doctorId: string;
  doctorSlug: string;
}

export default function DoctorTicketsList({ doctorId, doctorSlug }: DoctorTicketsListProps) {
  const [tickets, setTickets] = useState<TicketListItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/support/tickets?doctor=${doctorId}&limit=${DOCTOR_TICKET_LIMIT}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
        setTickets(Array.isArray(data.data) ? data.data : []);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError('Could not load support tickets for this doctor.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-danger-light bg-rose-50 px-4 py-3 text-sm text-danger">{error}</p>;
  }

  if (tickets.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🎫</div>
        <p className="font-semibold text-slate-900">No support tickets yet</p>
        <p className="mt-1 text-[13px] text-slate-500">Tickets raised for this doctor will appear here.</p>
        <Link href={`/support/tickets/new?doctor=${doctorSlug}`} className="btn btn-primary btn-sm mt-4">
          + New Ticket
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tickets.map((t) => <TicketListItem key={t._id} ticket={t} showDoctor={false} />)}
    </div>
  );
}
