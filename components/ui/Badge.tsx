import { cn } from '@/lib/utils';

const VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200/80',
  info: 'bg-sky-50 text-sky-700 ring-sky-200/80',
  brand: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200/80',
} as const;

type BadgeVariant = keyof typeof VARIANTS;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Overdue':
      return 'danger';
    case 'Cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}
