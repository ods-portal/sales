import slugifyLib from 'slugify';

export function createSlug(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

export async function generateUniqueSlug(
  base: string,
  existingSlugsFn: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = createSlug(base);
  let slug = baseSlug;
  let counter = 2;

  while (await existingSlugsFn(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysSince(date: Date | string): number {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** True when the calendar date is before today (date-only comparison). */
export function isPastDate(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export const AREA_DIRECTIONS = ['North', 'South', 'East', 'West', 'Central'] as const;

export function areaOptionsForCity(city: string): string[] {
  const name = city.trim();
  if (!name) return [];
  return AREA_DIRECTIONS.map((direction) => `${direction} ${name}`);
}

export function isValidAreaForCity(city: string, area: string): boolean {
  return areaOptionsForCity(city).includes(area.trim());
}

export interface PermissionUser {
  role: string;
  hasWriteAccess?: boolean;
}

export function hasWriteAccess(user?: PermissionUser | null): boolean {
  if (!user) return false;
  return user.role === 'superAdmin' || (user.role === 'admin' && Boolean(user.hasWriteAccess));
}

/** Sales persons log their own doctors and visits; admins need write access. */
export function canCreateRecords(user?: PermissionUser | null): boolean {
  if (!user) return false;
  return user.role === 'salesPerson' || hasWriteAccess(user);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}
