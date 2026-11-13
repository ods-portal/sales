import { memo } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import SupportStatusBadge from './SupportStatusBadge';

export interface TicketListItemData {
  _id: string;
  ticketNo: string;
  patientId: string;
  reason: string;
  status: string;
  createdAt: string;
  assignedToName?: string;
  doctor?: { name: string; slug: string } | null;
}

interface TicketListItemProps {
  ticket: TicketListItemData;
  /** Show the doctor name as the title; hide it when the list is already scoped to one doctor. */
  showDoctor?: boolean;
}

function TicketListItem({ ticket, showDoctor = true }: TicketListItemProps) {
  const title = showDoctor ? ticket.doctor?.name ?? 'Unknown doctor' : ticket.reason;
  const meta = [
    ticket.ticketNo,
    showDoctor ? ticket.reason : `Patient ${ticket.patientId}`,
    formatDate(ticket.createdAt),
  ];

  return (
    <Link
      href={`/support/tickets/${ticket.ticketNo}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-brand">
        {title.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="truncate text-xs text-slate-500">{meta.join(' · ')}</div>
      </div>
      <SupportStatusBadge status={ticket.status} />
    </Link>
  );
}

export default memo(TicketListItem);
