import { cn } from '@/lib/utils';

interface TicketFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + helper/error text, matching the doctor form field layout. */
export default function TicketField({ label, htmlFor, required, hint, error, className, children }: TicketFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="input-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="input-error" id={`${htmlFor}-error`} role="alert">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500" id={`${htmlFor}-hint`}>{hint}</p>
      )}
    </div>
  );
}

export const FIELD_INPUT_CLASS = 'input transition-all focus:border-brand focus:ring-4 focus:ring-brand/10';
export const FIELD_TEXTAREA_CLASS = `${FIELD_INPUT_CLASS} min-h-[110px] resize-y`;
