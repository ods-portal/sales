import { memo } from 'react';
import { cn } from '@/lib/utils';
import { supportStatusClass } from '@/lib/supportConstants';

interface SupportStatusBadgeProps {
  status: string;
  className?: string;
}

function SupportStatusBadge({ status, className }: SupportStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        supportStatusClass(status),
        className
      )}
    >
      {status}
    </span>
  );
}

export default memo(SupportStatusBadge);
