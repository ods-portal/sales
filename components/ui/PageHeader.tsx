import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 md:gap-4', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 md:gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-11 md:w-11 md:rounded-2xl max-md:[&_svg]:h-[18px] max-md:[&_svg]:w-[18px] bg-gradient-to-br from-brand to-indigo-600 text-white shadow-lg shadow-indigo-200/50">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl leading-tight font-bold md:text-2xl md:leading-normal tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-slate-500 md:mt-1 md:text-sm md:leading-normal">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:[&>*]:flex-1 max-md:[&>*]:justify-center">{actions}</div>}
    </div>
  );
}
