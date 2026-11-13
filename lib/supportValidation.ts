import mongoose from 'mongoose';
import User from '@/models/User';

const MAX_ATTACHMENTS = 20;

export function sanitizeUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url))
    .slice(0, MAX_ATTACHMENTS);
}

interface Assignee {
  _id: mongoose.Types.ObjectId;
  name: string;
}

/** Tickets can only be assigned to active support employees; empty means unassigned. */
export async function resolveAssignee(value: unknown): Promise<{ user?: Assignee; error?: string }> {
  const id = String(value ?? '').trim();
  if (!id) return {};
  if (!mongoose.isValidObjectId(id)) return { error: 'Please select a valid employee' };

  const user = await User.findOne({ _id: id, role: 'support', status: 'active' }).select('name').lean();
  if (!user) return { error: 'Selected employee is not an active support user' };
  return { user: { _id: user._id as mongoose.Types.ObjectId, name: user.name } };
}
