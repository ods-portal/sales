export const SUPPORT_REASON_GROUP = 'supportReason';
export const SUPPORT_STATUS_GROUP = 'supportStatus';

export const SUPPORT_OPEN_STATUS = 'Open';
export const SUPPORT_CLOSED_STATUS = 'Closed';

export const DEFAULT_SUPPORT_REASONS = [
  'Aligner Not Fitting',
  'Aligner Broken / Missing',
  'Attachment Issue',
  'Treatment Plan Issue',
  'Scanning Issue',
  'Portal / Login Issue',
  'Payment / Billing Issue',
  'Delivery / Courier Issue',
  'Other',
];

export const DEFAULT_SUPPORT_STATUSES = [
  SUPPORT_OPEN_STATUS,
  'In Progress',
  'Pending',
  'Resolved',
  SUPPORT_CLOSED_STATUS,
];

/** Open and Closed drive ticket logic, so admins cannot rename or delete them. */
export const SYSTEM_SUPPORT_STATUSES = [SUPPORT_OPEN_STATUS, SUPPORT_CLOSED_STATUS];

const STATUS_STYLES: Record<string, string> = {
  Open: 'bg-sky-50 text-sky-700 ring-sky-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function supportStatusClass(status: string): string {
  return STATUS_STYLES[status] ?? 'bg-violet-50 text-violet-700 ring-violet-200';
}

const STATUS_BAR_STYLES: Record<string, string> = {
  Open: 'bg-sky-500',
  'In Progress': 'bg-indigo-500',
  Pending: 'bg-amber-500',
  Resolved: 'bg-emerald-500',
  Closed: 'bg-slate-400',
};

export function supportStatusBarClass(status: string): string {
  return STATUS_BAR_STYLES[status] ?? 'bg-violet-500';
}
