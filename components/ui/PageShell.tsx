import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export default function PageShell({ children, className, wide }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full space-y-4 animate-fade-in md:space-y-6', wide ? 'max-w-[1480px]' : 'max-w-[1400px]', className)}>
      {children}
    </div>
  );
}
