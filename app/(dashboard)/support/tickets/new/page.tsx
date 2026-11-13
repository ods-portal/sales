'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, LifeBuoy, Lock, Save } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { SUPPORT_OPEN_STATUS } from '@/lib/supportConstants';
import { useToast } from '@/components/ui/ToastProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card';
import FileUploadWithProgress from '@/components/FileUploadWithProgress';
import DoctorLookup from '@/components/support/DoctorLookup';
import TicketField, { FIELD_INPUT_CLASS, FIELD_TEXTAREA_CLASS } from '@/components/support/TicketField';
import SupportStatusBadge from '@/components/support/SupportStatusBadge';
import { useSupportOptions } from '@/components/support/useSupportOptions';
import { useNewTicketForm } from '@/components/support/useNewTicketForm';

interface SessionUser {
  userId: string;
  name: string;
  role: string;
}

const toUrlList = (value: string | string[]) => (Array.isArray(value) ? value : value ? [value] : []);

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-right text-[13px] font-semibold text-slate-900" suppressHydrationWarning>{children}</span>
    </div>
  );
}

export default function NewSupportTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorSlug = searchParams.get('doctor') ?? '';
  const { addToast } = useToast();
  const { reasons, employees, loading: optionsLoading, error: optionsError } = useSupportOptions();
  const { form, errors, setField, touch, validateAll } = useNewTicketForm();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [openedAt] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!doctorSlug) return;
    const controller = new AbortController();
    fetch(`/api/doctors/${encodeURIComponent(doctorSlug)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setField('doctor', { _id: d.data._id, name: d.data.name, slug: d.data.slug, city: d.data.city, area: d.data.area, speciality: d.data.speciality });
      })
      .catch((err) => { if (!controller.signal.aborted) console.error(err); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorSlug]);

  const isSupport = currentUser?.role === 'support';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      addToast('Please fix the highlighted fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, doctor: form.doctor?._id, assignedTo: isSupport ? undefined : form.assignedTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
      addToast(`Ticket ${data.data.ticketNo} created`, 'success');
      router.push(`/support/tickets/${data.data.ticketNo}`);
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'Failed to create ticket', 'error');
      setSubmitting(false);
    }
  };

  const fieldError = (field: keyof typeof errors) => (errors[field] ? 'border-danger' : undefined);

  return (
    <PageShell>
      <PageHeader
        title="New Support Ticket"
        subtitle="Log a doctor's support request and assign it to the team"
        icon={<LifeBuoy className="h-5 w-5" />}
        actions={
          <Link href="/support/tickets" className="btn btn-secondary">
            <ChevronLeft className="h-4 w-4" /> All Tickets
          </Link>
        }
      />

      {optionsError && (
        <p className="rounded-xl border border-danger-light bg-rose-50 px-4 py-3 text-sm text-danger" role="alert">{optionsError}</p>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
        <Card padding="none" className="overflow-hidden">
          <div className="space-y-5 p-4 md:p-6">
            <div>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>Who needs help and what is the issue</CardDescription>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <DoctorLookup value={form.doctor} onChange={(d) => setField('doctor', d)} onBlur={() => touch('doctor')} error={errors.doctor} autoFocus={!doctorSlug} />
              </div>

              <TicketField label="Patient ID" htmlFor="patientId" required error={errors.patientId} hint="As shown in the treatment portal">
                <input
                  id="patientId"
                  className={cn(FIELD_INPUT_CLASS, fieldError('patientId'))}
                  placeholder="e.g. PT-10234"
                  value={form.patientId}
                  onChange={(e) => setField('patientId', e.target.value)}
                  onBlur={() => touch('patientId')}
                  aria-invalid={Boolean(errors.patientId)}
                />
              </TicketField>

              <TicketField label="Reason for Support" htmlFor="reason" required error={errors.reason} hint="Options are managed by admin in Dropdowns">
                <select
                  id="reason"
                  className={cn(FIELD_INPUT_CLASS, fieldError('reason'))}
                  value={form.reason}
                  disabled={optionsLoading}
                  onChange={(e) => setField('reason', e.target.value)}
                  onBlur={() => touch('reason')}
                  aria-invalid={Boolean(errors.reason)}
                >
                  <option value="">{optionsLoading ? 'Loading reasons...' : 'Select a reason'}</option>
                  {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </TicketField>

              <TicketField label="Doctor Concern / Issue Description" htmlFor="concern" required error={errors.concern} hint="Describe the problem in the doctor's words" className="md:col-span-2">
                <textarea
                  id="concern"
                  className={cn(FIELD_TEXTAREA_CLASS, fieldError('concern'))}
                  rows={4}
                  placeholder="What issue did the doctor report?"
                  value={form.concern}
                  onChange={(e) => setField('concern', e.target.value)}
                  onBlur={() => touch('concern')}
                  aria-invalid={Boolean(errors.concern)}
                />
              </TicketField>

              <TicketField label="Support Provided / Action Taken" htmlFor="actionTaken" hint="Optional — you can update this later" className="md:col-span-2">
                <textarea
                  id="actionTaken"
                  className={FIELD_TEXTAREA_CLASS}
                  rows={3}
                  placeholder="Steps taken so far, if any"
                  value={form.actionTaken}
                  onChange={(e) => setField('actionTaken', e.target.value)}
                />
              </TicketField>

              <FileUploadWithProgress label="Image Attachments" id="ticket-images" accept="image/*" multiple existingValue={form.images} onUploadComplete={(v) => setField('images', toUrlList(v))} />
              <FileUploadWithProgress label="Video Attachments" id="ticket-videos" accept="video/*" multiple existingValue={form.videos} onUploadComplete={(v) => setField('videos', toUrlList(v))} />
            </div>
          </div>

          <div className="mobile-sticky-footer sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-3.5 py-3 backdrop-blur-sm sm:px-6 md:py-4">
            <Link href="/support/tickets" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting || optionsLoading}>
              <Save className="h-4 w-4" />
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Assignment</CardTitle>
            <CardDescription className="mb-4">Who will handle this ticket</CardDescription>
            {isSupport ? (
              <TicketField label="Support Assigned To" htmlFor="assignedTo" hint="Tickets you raise are assigned to you. An admin can reassign them later.">
                <div id="assignedTo" className={cn(FIELD_INPUT_CLASS, 'flex items-center gap-2 bg-slate-50 text-slate-700')} aria-readonly="true">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate font-medium">{currentUser?.name}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand">You</span>
                </div>
              </TicketField>
            ) : (
              <TicketField label="Support Assigned To" htmlFor="assignedTo" hint={employees.length ? 'Only active support team members are listed' : 'No support users yet — create one from Manage Users'}>
                <select
                  id="assignedTo"
                  className={FIELD_INPUT_CLASS}
                  value={form.assignedTo}
                  disabled={optionsLoading}
                  onChange={(e) => setField('assignedTo', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                </select>
              </TicketField>
            )}
          </Card>

          <Card>
            <CardTitle>Ticket Info</CardTitle>
            <CardDescription className="mb-2">Filled in automatically</CardDescription>
            <InfoItem label="Ticket No.">Generated on save</InfoItem>
            <InfoItem label="Support Date & Time">{formatDateTime(openedAt)}</InfoItem>
            <InfoItem label="Status"><SupportStatusBadge status={SUPPORT_OPEN_STATUS} /></InfoItem>
            <InfoItem label="Created By">{currentUser?.name ?? '—'}</InfoItem>
          </Card>
        </div>
      </form>
    </PageShell>
  );
}
