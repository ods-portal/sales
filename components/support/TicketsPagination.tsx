import { cn } from '@/lib/utils';

const LIMITS = [10, 20, 50];
const VISIBLE_PAGES = 5;

interface TicketsPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const NAV_BTN = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-40';

export default function TicketsPagination({ page, totalPages, totalCount, limit, onPageChange, onLimitChange }: TicketsPaginationProps) {
  const lastPage = Math.max(1, totalPages);
  const start = Math.max(1, Math.min(page - 2, lastPage - (VISIBLE_PAGES - 1)));
  const pages = Array.from({ length: Math.min(VISIBLE_PAGES, lastPage) }, (_, i) => start + i).filter((p) => p <= lastPage);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 md:mt-0 md:rounded-none md:border-x-0 md:border-b-0 md:border-slate-100 md:bg-slate-50/50 md:px-5 md:py-3.5">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <label htmlFor="tickets-limit">Rows per page</label>
        <select
          id="tickets-limit"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-slate-400">·</span>
        <span>{totalCount} total</span>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button type="button" className={NAV_BTN} disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">⟪</button>
        <button type="button" className={NAV_BTN} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">‹</button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-all',
              p === page ? 'bg-brand text-white shadow-sm shadow-indigo-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
            )}
          >
            {p}
          </button>
        ))}
        <button type="button" className={NAV_BTN} disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} aria-label="Next page">›</button>
        <button type="button" className={NAV_BTN} disabled={page >= lastPage} onClick={() => onPageChange(lastPage)} aria-label="Last page">⟫</button>
      </nav>
    </div>
  );
}
