import Link from 'next/link';
import { Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import SupportStatusBadge from './SupportStatusBadge';
import type { SupportTicket } from './types';

/** Desktop columns; patient ID and creator sit as sub-lines here but stay separate fields on mobile cards. */
const COLUMNS = ['Ticket / Patient', 'Doctor', 'Reason', 'Assigned To', 'Status', 'Created', ''];
const SKELETON_ROWS = 8;
const TH_CLASS = 'whitespace-nowrap px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-500';
const TD_CLASS = 'px-3 py-2.5 align-middle';

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

interface TicketsTableProps {
  tickets: SupportTicket[];
  loading: boolean;
  hasFilters: boolean;
  /** Admins review everyone's tickets, so they also see who raised each one. */
  showCreatedBy?: boolean;
}

export default function TicketsTable({ tickets, loading, hasFilters, showCreatedBy = false }: TicketsTableProps) {
  return (
    <table className="responsive-table w-full border-collapse text-[13px] leading-snug">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/80">
          {COLUMNS.map((c, i) => (
            <th key={c || i} className={TH_CLASS}>{c || <span className="sr-only">Actions</span>}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <tr key={i}>
              {COLUMNS.map((c, j) => (
                <td key={c || j} className={TD_CLASS}><div className="h-3.5 animate-pulse rounded-md bg-slate-100" /></td>
              ))}
            </tr>
          ))
        ) : tickets.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length} className="px-5 py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🎫</div>
              <p className="text-sm font-semibold text-slate-900">No tickets found</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {hasFilters ? 'Try a different filter or clear your search' : 'Raise the first support ticket to get started'}
              </p>
            </td>
          </tr>
        ) : tickets.map((t) => (
          <tr key={t._id} className="group transition-colors hover:bg-indigo-50/30">
            <td data-label="Ticket No." className={`${TD_CLASS} whitespace-nowrap`}>
              <span className="font-mono text-xs font-semibold text-slate-900">{t.ticketNo}</span>
              <span className="mt-0.5 hidden text-[11px] text-slate-500 md:block">{t.patientId}</span>
            </td>
            <td className={`cell-primary ${TD_CLASS} md:min-w-[120px]`}>
              {t.doctor ? (
                <Link href={`/doctors/${t.doctor.slug}`} className="font-semibold text-brand hover:text-brand-hover hover:underline">
                  {t.doctor.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-500">Doctor removed</span>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">{[t.doctor?.area || t.doctor?.city, t.doctor?.speciality].filter(Boolean).join(' · ')}</p>
            </td>
            <td data-label="Patient ID" className={`${TD_CLASS} text-slate-600 md:hidden`}>{t.patientId}</td>
            <td data-label="Reason" className={`${TD_CLASS} text-slate-600`}>{t.reason}</td>
            <td data-label="Assigned To" className={`${TD_CLASS} text-slate-600`}>
              {t.assignedToName || <span className="text-slate-400">Unassigned</span>}
              {showCreatedBy && <span className="mt-0.5 hidden text-[11px] text-slate-400 md:block">by {t.createdByName}</span>}
            </td>
            {showCreatedBy && <td data-label="Created By" className={`${TD_CLASS} text-slate-600 md:hidden`}>{t.createdByName}</td>}
            <td data-label="Status" className={TD_CLASS}><SupportStatusBadge status={t.status} className="!px-2 !py-0.5 !text-[11px]" /></td>
            <td data-label="Created" className={`${TD_CLASS} whitespace-nowrap text-slate-600`}>
              {formatDate(t.createdAt)}
              <span className="block text-[11px] text-slate-400">{formatTime(t.createdAt)}</span>
            </td>
            <td className={`cell-actions ${TD_CLASS}`}>
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/support/tickets/${t.ticketNo}`}
                  aria-label={`View ticket ${t.ticketNo}`}
                  title="View ticket"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 md:w-8 md:justify-center md:px-0"
                >
                  <Eye className="h-4 w-4" /> <span className="md:sr-only">View</span>
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
