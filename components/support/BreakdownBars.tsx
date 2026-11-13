import { memo } from 'react';
import Link from 'next/link';

interface BreakdownRow {
  _id: string;
  count: number;
}

interface BreakdownBarsProps {
  rows: BreakdownRow[];
  /** Builds the filtered tickets link for a row. */
  hrefFor: (value: string) => string;
  colorFor?: (value: string, index: number) => string;
  ariaLabel: string;
}

const PALETTE = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-slate-400'];

const defaultColor = (_: string, i: number) => PALETTE[i % PALETTE.length];

function BreakdownBars({ rows, hrefFor, colorFor = defaultColor, ariaLabel }: BreakdownBarsProps) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <ul className="space-y-3" aria-label={ariaLabel}>
      {rows.map((r, i) => {
        const label = r._id || 'Not set';
        const percent = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={label}>
            <Link
              href={hrefFor(r._id)}
              className="-mx-2 block rounded-lg px-2 py-1 no-underline transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <div className="mb-1.5 flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={label}>{label}</span>
                <span className="shrink-0 font-semibold text-slate-900">{r.count}</span>
                <span className="w-10 shrink-0 text-right text-xs text-slate-400">{percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${colorFor(r._id, i)}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default memo(BreakdownBars);
