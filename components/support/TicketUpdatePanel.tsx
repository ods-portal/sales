'use client';

import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { SUPPORT_CLOSED_STATUS } from '@/lib/supportConstants';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import FileUploadWithProgress from '@/components/FileUploadWithProgress';
import TicketField, { FIELD_INPUT_CLASS, FIELD_TEXTAREA_CLASS } from './TicketField';
import type { SupportEmployee, SupportTicket } from './types';

interface TicketUpdatePanelProps {
  ticket: SupportTicket;
  statuses: string[];
  employees: SupportEmployee[];
  onUpdated: (ticket: SupportTicket) => void;
}

interface UpdateDraft {
  status: string;
  assignedTo: string;
  actionTaken: string;
  note: string;
  images: string[];
  videos: string[];
}

const toUrlList = (value: string | string[]) => (Array.isArray(value) ? value : value ? [value] : []);
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const draftFrom = (t: SupportTicket): UpdateDraft => ({
  status: t.status,
  assignedTo: t.assignedTo ?? '',
  actionTaken: t.actionTaken ?? '',
  note: '',
  images: t.images ?? [],
  videos: t.videos ?? [],
});

/** Only send fields that differ from the saved ticket, so history entries reflect real changes. */
function buildPatch(draft: UpdateDraft, ticket: SupportTicket) {
  const saved = draftFrom(ticket);
  const patch: Record<string, unknown> = {};
  if (draft.status !== saved.status) patch.status = draft.status;
  if (draft.assignedTo !== saved.assignedTo) patch.assignedTo = draft.assignedTo;
  if (draft.actionTaken.trim() !== saved.actionTaken.trim()) patch.actionTaken = draft.actionTaken;
  if (!sameList(draft.images, saved.images)) patch.images = draft.images;
  if (!sameList(draft.videos, saved.videos)) patch.videos = draft.videos;
  if (draft.note.trim()) patch.note = draft.note.trim();
  return patch;
}

export default function TicketUpdatePanel({ ticket, statuses, employees, onUpdated }: TicketUpdatePanelProps) {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<UpdateDraft>(() => draftFrom(ticket));
  const [saving, setSaving] = useState(false);

  const patch = useMemo(() => buildPatch(draft, ticket), [draft, ticket]);
  const isDirty = Object.keys(patch).length > 0;
  const statusOptions = statuses.includes(ticket.status) ? statuses : [ticket.status, ...statuses];

  const set = <K extends keyof UpdateDraft>(key: K, value: UpdateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    if (patch.status === SUPPORT_CLOSED_STATUS) {
      const ok = await confirm({
        title: 'Close Ticket',
        message: 'Close this ticket? Your name and the closing date & time will be recorded. It stays available for reference.',
        confirmText: 'Close Ticket',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.ticketNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket');
      onUpdated(data.data);
      setDraft(draftFrom(data.data));
      addToast('Ticket updated', 'success');
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'Failed to update ticket', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle>Update Ticket</CardTitle>
      <CardDescription className="mb-4">Every status change is saved to the history</CardDescription>
      <form onSubmit={handleSave} className="space-y-4" noValidate>
        <TicketField label="Support Status" htmlFor="update-status" hint="Choosing Closed records the closing date & time automatically">
          <select id="update-status" className={FIELD_INPUT_CLASS} value={draft.status} onChange={(e) => set('status', e.target.value)}>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </TicketField>

        <TicketField label="Support Assigned To" htmlFor="update-assignee" hint="Only active support team members are listed">
          <select id="update-assignee" className={FIELD_INPUT_CLASS} value={draft.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
            <option value="">Unassigned</option>
            {ticket.assignedTo && !employees.some((emp) => emp._id === ticket.assignedTo) && (
              <option value={ticket.assignedTo}>{ticket.assignedToName ?? 'Previous assignee'} (inactive)</option>
            )}
            {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
          </select>
        </TicketField>

        <TicketField label="Support Provided / Action Taken" htmlFor="update-action" hint="Visible to everyone on the support desk">
          <textarea id="update-action" className={FIELD_TEXTAREA_CLASS} rows={4} placeholder="What was done to resolve the issue?" value={draft.actionTaken} onChange={(e) => set('actionTaken', e.target.value)} />
        </TicketField>

        <TicketField label="Update Note" htmlFor="update-note" hint="Optional — added to the status history">
          <textarea id="update-note" className={FIELD_TEXTAREA_CLASS} rows={2} placeholder="e.g. Called the doctor, replacement dispatched" value={draft.note} onChange={(e) => set('note', e.target.value)} />
        </TicketField>

        <FileUploadWithProgress label="Image Attachments" id="update-images" accept="image/*" multiple existingValue={draft.images} onUploadComplete={(v) => set('images', toUrlList(v))} />
        <FileUploadWithProgress label="Video Attachments" id="update-videos" accept="video/*" multiple existingValue={draft.videos} onUploadComplete={(v) => set('videos', toUrlList(v))} />

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className="btn btn-secondary" disabled={!isDirty || saving} onClick={() => setDraft(draftFrom(ticket))}>
            Reset
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isDirty || saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Card>
  );
}
