import { cn } from '@/lib/utils';

const ACCENTS = {
  indigo: { bar: 'bg-indigo-500', glow: 'shadow-indigo-100/80', icon: 'text-indigo-600 bg-indigo-50' },
  emerald: { bar: 'bg-emerald-500', glow: 'shadow-emerald-100/80', icon: 'text-emerald-600 bg-emerald-50' },
  amber: { bar: 'bg-amber-500', glow: 'shadow-amber-100/80', icon: 'text-amber-600 bg-amber-50' },
  rose: { bar: 'bg-rose-500', glow: 'shadow-rose-100/80', icon: 'text-rose-600 bg-rose-50' },
  sky: { bar: 'bg-sky-500', glow: 'shadow-sky-100/80', icon: 'text-sky-600 bg-sky-50' },
  violet: { bar: 'bg-violet-500', glow: 'shadow-violet-100/80', icon: 'text-violet-600 bg-violet-50' },
} as const;

type KpiAccent = keyof typeof ACCENTS;

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: KpiAccent;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function KpiCard({ label, value, hint, accent = 'indigo', icon, loading }: KpiCardProps) {
  const style = ACCENTS[accent];

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
        <div className="skeleton mb-3 h-3 w-[40%]" />
        <div className="skeleton mb-2 h-8 w-[55%]" />
        <div className="skeleton h-2.5 w-[45%]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        style.glow
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', style.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
          {hint && <div className="mt-1.5 text-xs text-slate-400">{hint}</div>}
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', style.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
