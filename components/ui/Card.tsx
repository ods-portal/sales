import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const PADDING = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-5 md:p-8',
};

export default function Card({ children, className, padding = 'md', hover }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm',
        PADDING[padding],
        hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-base font-bold text-slate-900', className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('mt-0.5 text-xs text-slate-500', className)}>{children}</p>;
}
