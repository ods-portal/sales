'use client';

import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryCount {
  _id: string;
  count: number;
}

interface CategoryDistributionProps {
  data: CategoryCount[];
}

const LEGACY_COLORS: Record<string, string> = {
  A: '#4F46E5', B: '#0EA5A4', C: '#F59E0B', D: '#9CA3AF',
};

const PALETTE = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#14B8A6', '#64748B'];

const DONUT_SIZE = 176;

function categoryLabel(id: string) {
  if (!id) return 'Uncategorised';
  return id.length === 1 ? `Category ${id}` : id;
}

function CategoryDistribution({ data }: CategoryDistributionProps) {
  const { rows, total } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.count - a.count);
    const sum = sorted.reduce((acc, c) => acc + c.count, 0);
    return {
      total: sum,
      rows: sorted.map((c, i) => ({
        key: c._id || `none-${i}`,
        label: categoryLabel(c._id),
        count: c.count,
        percent: sum ? Math.round((c.count / sum) * 100) : 0,
        color: LEGACY_COLORS[c._id] ?? PALETTE[i % PALETTE.length],
      })),
    };
  }, [data]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
      <div className="relative mx-auto shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="count"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={rows.length > 1 ? 2 : 0}
              cornerRadius={6}
              stroke="none"
              isAnimationActive
            >
              {rows.map((r) => (
                <Cell key={r.key} fill={r.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${v} doctor${v === 1 ? '' : 's'}`, n]}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Doctors</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-3" aria-label="Doctor category breakdown">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="mb-1.5 flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={r.label}>{r.label}</span>
              <span className="shrink-0 font-semibold text-slate-900">{r.count}</span>
              <span className="w-10 shrink-0 text-right text-xs text-slate-400">{r.percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${r.percent}%`, backgroundColor: r.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(CategoryDistribution);
