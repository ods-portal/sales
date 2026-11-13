import Dropdown from '@/models/Dropdown';
import SupportTicket from '@/models/SupportTicket';
import { createSlug } from '@/lib/utils';
import {
  SUPPORT_REASON_GROUP,
  SUPPORT_STATUS_GROUP,
  DEFAULT_SUPPORT_REASONS,
  DEFAULT_SUPPORT_STATUSES,
  SYSTEM_SUPPORT_STATUSES,
} from '@/lib/supportConstants';

const TICKET_PREFIX = 'SUP';
const TICKET_SEQ_DIGITS = 5;
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

async function nextTicketNo(): Promise<string> {
  const prefix = `${TICKET_PREFIX}-${new Date().getFullYear()}-`;
  const last = await SupportTicket.findOne({ ticketNo: { $regex: `^${prefix}` } })
    .sort({ ticketNo: -1 })
    .select('ticketNo')
    .lean();
  const lastSeq = last ? parseInt(last.ticketNo.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(TICKET_SEQ_DIGITS, '0')}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** Retries on a ticket number collision when two tickets are created at the same moment. */
export async function createWithTicketNo<T>(create: (ticketNo: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TICKET_NO_ATTEMPTS; attempt++) {
    try {
      return await create(await nextTicketNo());
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
