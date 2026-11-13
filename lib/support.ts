import Dropdown from '@/models/Dropdown';
import { createSlug } from '@/lib/utils';
import type { JWTPayload } from '@/lib/auth';
import { Types } from 'mongoose';
import {
  SUPPORT_REASON_GROUP,
  SUPPORT_STATUS_GROUP,
  DEFAULT_SUPPORT_REASONS,
  DEFAULT_SUPPORT_STATUSES,
  SYSTEM_SUPPORT_STATUSES,
} from '@/lib/supportConstants';

const TICKET_PREFIX_LENGTH = 3;
const TICKET_FALLBACK_PREFIX = 'DOC';
const TICKET_TIME_ZONE = 'Asia/Kolkata';
const MAX_TICKET_NO_ATTEMPTS = 5;

async function seedGroup(group: string, labels: string[], systemLabels: string[] = []) {
  const count = await Dropdown.countDocuments({ group });
  if (count > 0) return;
  await Dropdown.insertMany(
    labels.map((label, i) => ({
      group,
      label,
      value: createSlug(label),
      order: i + 1,
      isSystem: systemLabels.includes(label),
      isActive: true,
    }))
  );
}

export async function ensureSupportDropdowns() {
  await seedGroup(SUPPORT_REASON_GROUP, DEFAULT_SUPPORT_REASONS);
  await seedGroup(SUPPORT_STATUS_GROUP, DEFAULT_SUPPORT_STATUSES, SYSTEM_SUPPORT_STATUSES);
}

export async function getActiveDropdownLabels(group: string): Promise<string[]> {
  await ensureSupportDropdowns();
  const options = await Dropdown.find({ group, isActive: true }).sort({ order: 1 }).select('label').lean();
  return options.map((o) => o.label);
}

/** First letters of the doctor's name (ignoring the "Dr." title), e.g. "Dr. Anil Kumar" → "ANI". */
function doctorTicketPrefix(doctorName: string): string {
  const lettersOnly = (value: string) => value.replace(/[^a-z]/gi, '').toUpperCase();
  const withoutTitle = lettersOnly(doctorName.replace(/^\s*dr\b\.?\s*/i, ''));
  return (withoutTitle || lettersOnly(doctorName)).slice(0, TICKET_PREFIX_LENGTH) || TICKET_FALLBACK_PREFIX;
}

/** Date and time down to milliseconds in IST, e.g. 20261113 + 164512345. */
function ticketTimestamp(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TICKET_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}${ms}`;
}

function nextTicketNo(doctorName: string, attempt: number): string {
  return `${doctorTicketPrefix(doctorName)}-${ticketTimestamp(new Date(Date.now() + attempt))}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** Retries on a ticket number collision when two tickets are created at the same moment. */
export async function createWithTicketNo<T>(doctorName: string, create: (ticketNo: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TICKET_NO_ATTEMPTS; attempt++) {
    try {
      return await create(nextTicketNo(doctorName, attempt));
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Support users only see tickets assigned to them or raised by them; admins see everything. */
export function supportTicketScope(user: JWTPayload): Record<string, unknown> {
  if (user.role !== 'support') return {};
  const userId = new Types.ObjectId(user.userId);
  return { $or: [{ assignedTo: userId }, { createdBy: userId }] };
}
