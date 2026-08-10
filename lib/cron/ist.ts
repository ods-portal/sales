const IST_TIMEZONE = 'Asia/Kolkata';

export function getISTDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date);
}

export function getISTDayBounds(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00+05:30`),
    end: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
}

export function getISTYesterdayString(reference = new Date()): string {
  const todayStr = getISTDateString(reference);
  const ref = new Date(`${todayStr}T12:00:00+05:30`);
  ref.setDate(ref.getDate() - 1);
  return getISTDateString(ref);
}

export function formatISTDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}
