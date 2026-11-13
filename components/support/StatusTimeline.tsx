import { memo } from 'react';
import { formatDateTime, cn } from '@/lib/utils';
import { supportStatusBarClass } from '@/lib/supportConstants';
import SupportStatusBadge from './SupportStatusBadge';
import type { TicketHistoryEntry } from './types';

const ROLE_LABELS: Record<string, string> = {
  support: 'Support',
  admin: 'Admin',
  superAdmin: 'Super Admin',
};

function StatusTimeline({ history }: { history: TicketHistoryEntry[] }) {
  const entries = [...history].reverse();

  if (entries.length === 0) {
    return <p className="text-[13px] text-slate-500">No history recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5" aria-label="Status history, newest first">
      {entries.map((h, i) => (
        <li key={`${h.changedAt}-${i}`} className="relative">
          <span
            className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white', supportStatusBarClass(h.status))}
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            {h.previousStatus && (
              <>
                <SupportStatusBadge status={h.previousStatus} className="opacity-70" />
                <span className="text-xs text-slate-400" aria-label="changed to">→</span>
              </>
            )}
            <SupportStatusBadge status={h.status} />
          </div>
          <p className="mt-1.5 text-[13px] text-slate-700">
            <span className="font-semibold text-slate-900">{h.changedByName}</span>
            <span className="text-slate-400"> · {ROLE_LABELS[h.changedByRole] ?? h.changedByRole}</span>
          </p>
          <p className="text-xs text-slate-500">{formatDateTime(h.changedAt)}</p>
          {h.assignedToName && <p className="mt-1 text-xs text-slate-500">Assignee: {h.assignedToName}</p>}
          {h.note && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700 ring-1 ring-slate-100">{h.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export default memo(StatusTimeline);
