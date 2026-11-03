'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDate, isPastDate, daysSince, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import PageShell from '@/components/ui/PageShell';

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_FILTERS = [
  { value: '', label: 'All Visits', icon: '📋' },
  { value: 'Pending', label: 'Pending', icon: '⏳' },
  { value: 'Overdue', label: 'Overdue', icon: '🔴' },
  { value: 'Completed', label: 'Completed', icon: '✅' },
  { value: 'Cancelled', label: 'Cancelled', icon: '⊘' },
];

interface Visit {
  _id: string;
  slug: string;
  visitDate: string;
  visitType: string;
  status: string;
  followUpDate?: string;
  doctor: { name: string; slug: string; city: string; area?: string; speciality: string };
  salesPerson: { name: string; slug: string };
  meetingSummary: string;
  isFlagged?: boolean;
  flagNote?: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const LIMITS = [10, 20, 50];
const ACTIONABLE_STATUSES = new Set(['Pending', 'Overdue']);

function IconBtn({
  href,
  onClick,
  disabled,
  title,
  variant = 'default',
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  variant?: 'default' | 'danger';
  children: ReactNode;
}) {
  const className = cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
    variant === 'danger'
      ? 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
      : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-brand',
    disabled && 'pointer-events-none opacity-50'
  );

  if (href) {
    return (
      <Link href={href} className={className} title={title} aria-label={title}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} title={title} aria-label={title}>
      {children}
    </button>
  );
}

export default function VisitsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ totalCount: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState('-visitDate');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role: string; hasWriteAccess: boolean } | null>(null);

  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    const t = setTimeout(() => {
      setStatus(urlStatus);
      setPage(1);
    }, 0);
    return () => clearTimeout(t);
  }, [searchParams]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort,
      ...(search && { search }),
      ...(status && { status }),
    });
    const res = await fetch(`/api/visits?${params}`);
    const data = await res.json();
    setVisits(data.data || []);
    setMeta({ totalCount: data.totalCount, totalPages: data.totalPages, currentPage: data.currentPage });
    setLoading(false);
  }, [page, limit, sort, search, status]);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => { if (d.user) setCurrentUser(d.user); });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchVisits, 300);
    return () => clearTimeout(t);
  }, [fetchVisits]);

  const sortArrow = (f: string) => (sort === f ? ' ↑' : sort === `-${f}` ? ' ↓' : '');
  const handleSort = (f: string) => { setSort((p) => (p === f ? `-${f}` : f)); setPage(1); };

  const handleStatusFilter = (value: string) => {
    setStatus(value);
    setPage(1);
    const params = new URLSearchParams();
    if (value) params.set('status', value);
    router.push(value ? `/visits?${params.toString()}` : '/visits');
  };

  const canEdit = currentUser?.role === 'superAdmin' || (currentUser?.role === 'admin' && currentUser?.hasWriteAccess);
  const canUpdateStatus =
    currentUser?.role === 'salesPerson' ||
    currentUser?.role === 'superAdmin' ||
    (currentUser?.role === 'admin' && currentUser?.hasWriteAccess);

  const isPendingView = status === 'Pending';

  const handleStatusUpdate = async (slug: string, nextStatus: 'Completed' | 'Cancelled') => {
    if (nextStatus === 'Cancelled') {
      const ok = await confirm({
        title: 'Cancel Visit',
        message: 'Mark this visit as cancelled? This will remove it from your pending follow-ups.',
        confirmText: 'Mark Cancelled',
        danger: true,
      });
      if (!ok) return;
    }

    setUpdating(slug);
    try {
      const res = await fetch(`/api/visits/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Visit marked as ${nextStatus.toLowerCase()}`, 'success');
        fetchVisits();
      } else {
        addToast(data.error || 'Failed to update visit status', 'error');
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (slug: string) => {
    const ok = await confirm({ title: 'Delete Visit', message: 'Are you sure you want to delete this visit?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    setDeleting(slug);
    const res = await fetch(`/api/visits/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      addToast('Visit deleted successfully', 'success');
      fetchVisits();
    } else {
      addToast('Failed to delete visit', 'error');
    }
    setDeleting(null);
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isPendingView ? 'Pending Visits' : 'Visit Management'}
            </h1>
            {isPendingView && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                {meta.totalCount} open
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isPendingView
              ? 'Review and resolve visits awaiting follow-up action'
              : `${meta.totalCount} total visits logged`}
          </p>
        </div>
        {canUpdateStatus && (
          <Link
            href="/visits/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-brand-hover hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98]"
          >
            <span className="text-lg leading-none">+</span>
            Log New Visit
          </Link>
        )}
      </div>

      {/* Pending banner */}
      {isPendingView && canUpdateStatus && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-amber-100">⏳</span>
          <p className="text-sm leading-relaxed text-amber-900">
            <span className="font-semibold">Action required</span>
            {' — mark '}
            <span className="font-medium text-emerald-700">Complete</span>
            {' when the follow-up is done, or '}
            <span className="font-medium text-slate-600">Cancel</span>
            {' if the visit is no longer active.'}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="relative mb-4">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="w-full rounded-full border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
            placeholder="Search doctor, city, visit type..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => handleStatusFilter(f.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-150',
                status === f.value
                  ? 'bg-brand-light text-brand shadow-sm ring-2 ring-brand/20'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <span className="text-xs opacity-80">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl max-md:bg-transparent md:overflow-hidden md:border md:border-slate-200/80 md:bg-white md:shadow-sm">
        <div className="md:overflow-x-auto">
          <table className="responsive-table w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {[
                  { label: 'Date', sort: 'visitDate' },
                  { label: 'Doctor' },
                  { label: 'Type' },
                  { label: 'Sales Rep' },
                  { label: 'Status', sort: 'status' },
                  { label: 'Follow-up' },
                  { label: isPendingView ? 'Resolve' : 'Actions' },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={col.sort ? () => handleSort(col.sort!) : undefined}
                    className={cn(
                      'px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500',
                      col.sort && 'cursor-pointer select-none hover:text-brand',
                      col.label === 'Resolve' || col.label === 'Actions' ? 'min-w-[280px]' : ''
                    )}
                  >
                    {col.label}{col.sort ? sortArrow(col.sort) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded-md bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📅</div>
                    <p className="text-base font-semibold text-slate-900">No visits found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {status ? 'Try a different filter or clear your search' : 'Log your first visit to get started'}
                    </p>
                  </td>
                </tr>
              ) : visits.map((v) => {
                const isPastPendingVisit =
                  v.status === 'Pending' &&
                  Boolean(v.followUpDate) &&
                  isPastDate(v.followUpDate!);
                const isFollowUpPast =
                  Boolean(v.followUpDate) &&
                  isPastDate(v.followUpDate!) &&
                  v.status !== 'Completed' &&
                  v.status !== 'Cancelled';
                const showResolve = canUpdateStatus && ACTIONABLE_STATUSES.has(v.status);
                const isUpdating = updating === v.slug;

                return (
                  <tr
                    key={v._id}
                    className={cn(
                      'group transition-colors',
                      isPastPendingVisit
                        ? 'bg-rose-50/70 hover:bg-rose-50 ring-1 ring-inset ring-rose-100'
                        : 'hover:bg-indigo-50/30'
                    )}
                  >
                    <td data-label="Date" className={cn(
                      'whitespace-nowrap px-5 py-4 font-semibold',
                      isPastPendingVisit ? 'text-rose-700' : 'text-slate-900'
                    )}>
                      {formatDate(v.visitDate)}
                    </td>
                    <td className="cell-primary px-5 py-4">
                      <Link
                        href={`/doctors/${v.doctor?.slug}`}
                        className="font-semibold text-brand hover:text-brand-hover hover:underline"
                      >
                        {v.doctor?.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {v.doctor?.area || v.doctor?.city} · {v.doctor?.speciality}
                      </p>
                    </td>
                    <td data-label="Type" className="px-5 py-4 text-slate-600">{v.visitType}</td>
                    <td data-label="Sales Rep" className="px-5 py-4 text-slate-600">{v.salesPerson?.name || '—'}</td>
                    <td data-label="Status" className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                        <span className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                          STATUS_STYLES[v.status] || STATUS_STYLES.Cancelled
                        )}>
                          {v.status}
                        </span>
                        {v.isFlagged && (
                          <span
                            className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                            title={v.flagNote || 'Flagged'}
                          >
                            Flagged
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Follow-up" className="px-5 py-4">
                      {v.followUpDate ? (
                        <div className="flex flex-col items-end gap-1 md:items-start">
                          <span className={cn(
                            'text-sm font-medium',
                            isFollowUpPast ? 'text-rose-600' : 'text-slate-600'
                          )}>
                            {formatDate(v.followUpDate)}
                          </span>
                          {isFollowUpPast && (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              {daysSince(v.followUpDate)}d overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="cell-actions px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2 md:flex-nowrap md:justify-start">
                        <IconBtn href={`/visits/${v.slug}`} title="View details">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </IconBtn>

                        {showResolve && (
                          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200/80">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(v.slug, 'Completed')}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {isUpdating ? 'Saving…' : 'Complete'}
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(v.slug, 'Cancelled')}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-rose-600 hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" /><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                              </svg>
                              Cancel
                            </button>
                          </div>
                        )}

                        {canEdit && (
                          <IconBtn
                            onClick={() => handleDelete(v.slug)}
                            disabled={deleting === v.slug}
                            title="Delete visit"
                            variant="danger"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 md:mt-0 md:rounded-none md:border-x-0 md:border-b-0 md:border-slate-100 md:bg-slate-50/50 md:px-5 md:py-3.5">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Rows per page</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-slate-400">·</span>
            <span>{meta.totalCount} total</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: '⟪', fn: () => setPage(1), disabled: page === 1 },
              { label: '‹', fn: () => setPage((p) => p - 1), disabled: page === 1 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                disabled={btn.disabled}
                onClick={btn.fn}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-40"
              >
                {btn.label}
              </button>
            ))}
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
              const p = start + i;
              return p <= meta.totalPages ? (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-all',
                    p === page
                      ? 'bg-brand text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  )}
                >
                  {p}
                </button>
              ) : null;
            })}
            {[
              { label: '›', fn: () => setPage((p) => p + 1), disabled: page === meta.totalPages },
              { label: '⟫', fn: () => setPage(meta.totalPages), disabled: page === meta.totalPages },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                disabled={btn.disabled}
                onClick={btn.fn}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-40"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
