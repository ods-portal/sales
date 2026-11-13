'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Ticket } from 'lucide-react';
import { canManageSupportTickets, cn, type PermissionUser } from '@/lib/utils';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import TicketsTable from '@/components/support/TicketsTable';
import TicketsPagination from '@/components/support/TicketsPagination';
import { useSupportOptions } from '@/components/support/useSupportOptions';
import type { SupportTicket } from '@/components/support/types';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;
type FilterKey = 'status' | 'reason' | 'assignedTo';

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
}

const SELECT_CLASS = 'input !py-2.5 text-sm';

export default function SupportTicketsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { reasons, statuses, employees } = useSupportOptions();

  const status = searchParams.get('status') ?? '';
  const reason = searchParams.get('reason') ?? '';
  const assignedTo = searchParams.get('assignedTo') ?? '';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [currentUser, setCurrentUser] = useState<PermissionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));
  }, []);

  const fetchTickets = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (reason) params.set('reason', reason);
    if (assignedTo) params.set('assignedTo', assignedTo);
    try {
      const res = await fetch(`/api/support/tickets?${params}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.data ?? []);
      setMeta({ totalCount: data.totalCount ?? 0, totalPages: data.totalPages || 1 });
      setError(null);
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      setError('Could not load tickets. Please try again.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, limit, search, status, reason, assignedTo]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => fetchTickets(controller.signal), SEARCH_DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
  }, [fetchTickets]);

  const setFilter = (key: FilterKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    setPage(1);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleClearFilters = () => {
    setSearch('');
    setPage(1);
    router.replace(pathname);
  };

  const isSupport = currentUser?.role === 'support';
  const hasFilters = Boolean(search || status || reason || assignedTo);
  const title = isSupport || assignedTo === 'me' ? 'My Tickets' : 'Support Tickets';

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={`${meta.totalCount} ticket${meta.totalCount === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ' in total'}`}
        icon={<Ticket className="h-5 w-5" />}
        actions={
          canManageSupportTickets(currentUser) ? (
            <Link href="/support/tickets/new" className="btn btn-primary">
              <Plus className="h-4 w-4" /> New Ticket
            </Link>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="relative mb-4">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Search tickets"
            className="w-full rounded-full border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
            placeholder="Search ticket no., patient ID or doctor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {['', ...statuses].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setFilter('status', s)}
              aria-pressed={status === s}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-150',
                status === s
                  ? 'bg-brand-light text-brand shadow-sm ring-2 ring-brand/20'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              {s || 'All Tickets'}
            </button>
          ))}
        </div>

        <div className={cn('grid grid-cols-1 gap-3 sm:items-end', isSupport ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[1fr_1fr_auto]')}>
          <div>
            <label className="input-label" htmlFor="ticket-reason-filter">Reason</label>
            <select id="ticket-reason-filter" className={SELECT_CLASS} value={reason} onChange={(e) => setFilter('reason', e.target.value)}>
              <option value="">All reasons</option>
              {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {!isSupport && (
            <div>
              <label className="input-label" htmlFor="ticket-assignee-filter">Assigned To</label>
              <select id="ticket-assignee-filter" className={SELECT_CLASS} value={assignedTo} onChange={(e) => setFilter('assignedTo', e.target.value)}>
                <option value="">Everyone</option>
                <option value="unassigned">Unassigned</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={handleClearFilters} disabled={!hasFilters}>
            Clear filters
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-danger-light bg-rose-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>
      )}

      <div className="rounded-2xl max-md:bg-transparent md:overflow-hidden md:border md:border-slate-200/80 md:bg-white md:shadow-sm">
        <div className="md:overflow-x-auto">
          <TicketsTable tickets={tickets} loading={loading} hasFilters={hasFilters} showCreatedBy={!isSupport} />
        </div>
        <TicketsPagination
          page={page}
          totalPages={meta.totalPages}
          totalCount={meta.totalCount}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>
    </PageShell>
  );
}
