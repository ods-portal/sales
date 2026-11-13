import Link from 'next/link';
import { Eye } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import SupportStatusBadge from './SupportStatusBadge';
import type { SupportTicket } from './types';

const COLUMNS = ['Ticket No.', 'Doctor', 'Patient ID', 'Reason', 'Assigned To', 'Status', 'Created', 'Actions'];
const SKELETON_ROWS = 8;

interface TicketsTableProps {
  tickets: SupportTicket[];
  loading: boolean;
  hasFilters: boolean;
}

export default function TicketsTable({ tickets, loading, hasFilters }: TicketsTableProps) {
  return (
    <table className="responsive-table w-full min-w-[960px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/80">
          {COLUMNS.map((c) => (
            <th key={c} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <tr key={i}>
              {COLUMNS.map((c) => (
                <td key={c} className="px-5 py-4"><div className="h-4 animate-pulse rounded-md bg-slate-100" /></td>
              ))}
            </tr>
          ))
        ) : tickets.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length} className="px-5 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">🎫</div>
              <p className="text-base font-semibold text-slate-900">No tickets found</p>
              <p className="mt-1 text-sm text-slate-500">
                {hasFilters ? 'Try a different filter or clear your search' : 'Raise the first support ticket to get started'}
              </p>
            </td>
          </tr>
        ) : tickets.map((t) => (
          <tr key={t._id} className="group transition-colors hover:bg-indigo-50/30">
            <td data-label="Ticket No." className="whitespace-nowrap px-5 py-4 font-mono text-[13px] font-semibold text-slate-900">{t.ticketNo}</td>
            <td className="cell-primary px-5 py-4">
              {t.doctor ? (
                <Link href={`/doctors/${t.doctor.slug}`} className="font-semibold text-brand hover:text-brand-hover hover:underline">
                  {t.doctor.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-500">Doctor removed</span>
              )}
              <p className="mt-0.5 text-xs text-slate-500">{[t.doctor?.area || t.doctor?.city, t.doctor?.speciality].filter(Boolean).join(' · ')}</p>
            </td>
            <td data-label="Patient ID" className="px-5 py-4 text-slate-600">{t.patientId}</td>
            <td data-label="Reason" className="px-5 py-4 text-slate-600">{t.reason}</td>
            <td data-label="Assigned To" className="px-5 py-4 text-slate-600">{t.assignedToName || <span className="text-slate-400">Unassigned</span>}</td>
            <td data-label="Status" className="px-5 py-4"><SupportStatusBadge status={t.status} /></td>
            <td data-label="Created" className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDateTime(t.createdAt)}</td>
            <td className="cell-actions px-5 py-4">
              <div className="flex items-center justify-end gap-2 md:justify-start">
                <Link
                  href={`/support/tickets/${t.ticketNo}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <Eye className="h-4 w-4" /> View
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
