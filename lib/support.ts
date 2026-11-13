import Dropdown from '@/models/Dropdown';
import SupportTicket from '@/models/SupportTicket';
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
const CHAR_CODE_A = 65;
const LAST_LETTER_INDEX = 25;
const NUMBERS_PER_LETTER = 99;
const SUFFIX_NUMBER_DIGITS = 2;

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

function currentTicketYear(): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TICKET_TIME_ZONE, year: 'numeric' }).format(new Date());
}

/**
 * Suffix sequence: A01 … A99, B01 … B99 … Z99. Index 0 = A01.
 * Past Z99 the number keeps growing on Z (Z100, Z101 …) so codes never repeat.
 */
function suffixToIndex(suffix: string): number {
  return (suffix.charCodeAt(0) - CHAR_CODE_A) * NUMBERS_PER_LETTER + parseInt(suffix.slice(1), 10) - 1;
}

function indexToSuffix(index: number): string {
  const letterIndex = Math.min(Math.floor(index / NUMBERS_PER_LETTER), LAST_LETTER_INDEX);
  const number = index - letterIndex * NUMBERS_PER_LETTER + 1;
  return `${String.fromCharCode(CHAR_CODE_A + letterIndex)}${String(number).padStart(SUFFIX_NUMBER_DIGITS, '0')}`;
}

/** e.g. "Dr. Support Test" in 2026 → SUP2026-A01, then SUP2026-A02 … */
async function nextTicketNo(doctorName: string): Promise<string> {
  const base = `${doctorTicketPrefix(doctorName)}${currentTicketYear()}-`;
  const existing = await SupportTicket.find({ ticketNo: { $regex: `^${base}[A-Z]\\d{2,}$` } })
    .select('ticketNo')
    .lean();
  const lastIndex = existing.reduce((max, t) => Math.max(max, suffixToIndex(t.ticketNo.slice(base.length))), -1);
  return `${base}${indexToSuffix(lastIndex + 1)}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** Retries on a ticket number collision when two tickets are created at the same moment. */
export async function createWithTicketNo<T>(doctorName: string, create: (ticketNo: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TICKET_NO_ATTEMPTS; attempt++) {
    try {
      return await create(await nextTicketNo(doctorName));
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
