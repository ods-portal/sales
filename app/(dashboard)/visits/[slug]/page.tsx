'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, History } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { formatDate, formatDateTime, daysSince, isPastDate } from '@/lib/utils';

const MIN_RESCHEDULE_REMARKS = 10;
const RESCHEDULABLE_STATUSES = new Set(['Pending', 'Overdue']);

function toDateInputValue(value: string | Date): string {
  return new Date(value).toISOString().split('T')[0];
}

interface RescheduleHistoryEntry {
  rescheduledAt: string;
  rescheduledByName: string;
  rescheduledByRole: string;
  previousVisitDate: string;
  newVisitDate: string;
  previousFollowUpDate: string;
  newFollowUpDate: string;
  remarks: string;
}

const STATUS_BADGE: Record<string, string> = {
  Completed: 'badge badge-green',
  Pending: 'badge badge-amber',
  Overdue: 'badge badge-red',
  Cancelled: 'badge badge-gray',
};

const BooleanRow = ({ label, value }: { label: string; value?: unknown }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex gap-2 py-3 border-b border-border items-center">
      <span className="min-w-[160px] text-[13px] text-text-secondary font-medium">{label}</span>
      <span className={`text-sm ${value ? 'text-success' : 'text-text-muted'}`}>
        {value ? '✅ Yes' : '❌ No'}
      </span>
    </div>
  );
};

const InfoRow = ({ label, value, type = 'text' }: { label: string; value?: unknown; type?: 'text' | 'date' }) => {
  if (!value) return null;
  let displayValue = String(value);
  if (type === 'date') {
    displayValue = formatDate(value as string);
  }
  return (
    <div className="flex gap-2 py-3 border-b border-border">
      <span className="min-w-[160px] text-[13px] text-text-secondary font-medium">{label}</span>
      <span className="text-sm text-text-primary font-medium flex-1">{displayValue}</span>
    </div>
  );
};

const TextBlock = ({ label, value }: { label: string; value?: unknown }) => {
  if (!value) return null;
  return (
    <div className="mt-4">
      <span className="block text-[13px] text-text-secondary font-medium mb-2">{label}</span>
      <div className="p-4 bg-bg-secondary rounded-[10px] text-sm leading-[1.6] text-text-primary whitespace-pre-wrap">
        {String(value)}
      </div>
    </div>
  );
};

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { addToast } = useToast();
  const confirm = useConfirm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [visit, setVisit] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleFollowUpDate, setRescheduleFollowUpDate] = useState('');
  const [rescheduleRemarks, setRescheduleRemarks] = useState('');
  const [rescheduleRemarksError, setRescheduleRemarksError] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const loadVisit = useCallback(() => {
    return fetch(`/api/visits/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setVisit(d.data);
        return d.data;
      });
  }, [slug]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); });
    loadVisit()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [loadVisit]);

  const canManageVisit =
    currentUser &&
    (currentUser.role === 'superAdmin' ||
      (currentUser.role === 'admin' && currentUser.hasWriteAccess));

  const canReschedule =
    canManageVisit && visit && RESCHEDULABLE_STATUSES.has(String(visit.status));

  const openRescheduleModal = () => {
    if (!visit) return;
    setRescheduleFollowUpDate(toDateInputValue(String(visit.followUpDate)));
    setRescheduleRemarks('');
    setRescheduleRemarksError('');
    setShowReschedule(true);
  };

  const handleReschedule = async () => {
    const remarks = rescheduleRemarks.trim();
    if (remarks.length < MIN_RESCHEDULE_REMARKS) {
      setRescheduleRemarksError(`Remarks are required (minimum ${MIN_RESCHEDULE_REMARKS} characters)`);
      return;
    }

    setRescheduling(true);
    setRescheduleRemarksError('');
    try {
      const res = await fetch(`/api/visits/${slug}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpDate: rescheduleFollowUpDate,
          remarks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data.error || 'Failed to reschedule visit', 'error');
        return;
      }
      setVisit(data.data);
      setShowReschedule(false);
      addToast('Visit rescheduled successfully', 'success');
    } finally {
      setRescheduling(false);
    }
  };

  const rescheduleHistory = (visit?.rescheduleHistory || []) as RescheduleHistoryEntry[];
  const sortedRescheduleHistory = [...rescheduleHistory].reverse();

  if (loading) {
    return (
      <div>
        <div className="skeleton h-[180px] rounded-2xl mb-4" />
        <div className="skeleton h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="card text-center py-20">
        <div className="text-[48px] mb-3">📅</div>
        <div className="text-xl font-bold">Visit not found</div>
        <Link href="/visits" className="btn btn-primary mt-4 inline-flex">← Back to Visits</Link>
      </div>
    );
  }

  const doctor = visit.doctor as Record<string, unknown>;
  const salesPerson = visit.salesPerson as Record<string, unknown>;
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-[13px] text-text-muted mb-4">
        <Link href="/visits" className="text-brand no-underline">Visits</Link>
        {' / '}
        <span>{formatDate(String(visit.visitDate))}</span>
      </div>

      {/* Header Card */}
      <div className="card mb-4 bg-brand-light">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-extrabold text-text-primary m-0">
                {String(visit.visitType)} Visit
              </h1>
              <span className={STATUS_BADGE[String(visit.status)] || 'badge badge-gray'}>
                {String(visit.status)}
              </span>
            </div>
            <div className="text-[15px] text-text-secondary flex items-center gap-3">
              <span>{formatDateTime(String(visit.visitDate))}</span>
              {visit.meetingMode && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-xl text-xs font-medium">
                    {visit.meetingMode === 'Online' ? '🌐' : visit.meetingMode === 'Phone' ? '📞' : '🏥'}
                    {String(visit.meetingMode)}
                  </span>
                </>
              )}
            </div>
          </div>

          {canManageVisit && (
            <div className="flex flex-wrap gap-2">
              {canReschedule && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={openRescheduleModal}
                >
                  <CalendarClock className="h-4 w-4" />
                  Reschedule
                </button>
              )}
              <button 
                className="btn btn-secondary btn-sm text-danger border-danger-light"
                onClick={async () => {
                  const ok = await confirm({ title: 'Delete Visit', message: 'Are you sure you want to delete this visit?', confirmText: 'Delete', danger: true });
                  if (!ok) return;
                  const res = await fetch(`/api/visits/${slug}`, { method: 'DELETE' });
                  if (res.ok) {
                    addToast('Visit deleted', 'success');
                    router.push('/visits');
                  } else {
                    addToast('Failed to delete visit', 'error');
                  }
                }}
              >
                🗑 Delete Visit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details Split */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.5px] mb-3">Doctor Details</h2>
          <div className="font-semibold text-base mb-1">
            <Link href={`/doctors/${doctor?.slug}`} className="text-brand no-underline">
              {doctor?.name as string}
            </Link>
          </div>
          <div className="text-[13px] text-text-secondary">{doctor?.speciality as string}</div>
          <div className="text-[13px] text-text-secondary">{doctor?.city as string}</div>
        </div>

        <div className="card">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.5px] mb-3">Rep Details</h2>
          <div className="font-semibold text-base mb-1">
            {salesPerson ? String(salesPerson.name) : 'Unknown Rep'}
          </div>
          <div className="text-[13px] text-text-secondary">{salesPerson ? String(salesPerson.email) : ''}</div>
          <div className="text-xs text-text-muted mt-2">
            Logged: {formatDateTime(String(visit.createdAt))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card mb-4">
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          💬 Discussion
        </h2>
        
        <TextBlock label="Meeting Summary" value={visit.meetingSummary} />
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {visit.keyDiscussionPoints && (
            <div>
              <span className="block text-[13px] text-text-secondary font-medium mb-2">Key Discussion Points</span>
              <div className="p-3 border border-border rounded-lg text-sm">{String(visit.keyDiscussionPoints)}</div>
            </div>
          )}
          {visit.doctorFeedback && (
            <div>
              <span className="block text-[13px] text-text-secondary font-medium mb-2">Doctors&apos; Feedback</span>
              <div className="p-3 border border-border rounded-lg text-sm">{String(visit.doctorFeedback)}</div>
            </div>
          )}
          {visit.objectionsRaised && (
            <div>
              <span className="block text-[13px] text-text-secondary font-medium mb-2">Objections Raised</span>
              <div className="p-3 border border-danger-light rounded-lg text-sm text-danger">{String(visit.objectionsRaised)}</div>
            </div>
          )}
          {visit.requirementsDiscussed && (
            <div>
              <span className="block text-[13px] text-text-secondary font-medium mb-2">Requirements Discussed</span>
              <div className="p-3 border border-brand-light rounded-lg text-sm">{String(visit.requirementsDiscussed)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Deliverables & Case Submissions */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            📦 Deliverables Shared
          </h2>
          <BooleanRow label="Brochures Given" value={visit.brochuresGiven} />
          <BooleanRow label="Sample Kit Given" value={visit.sampleKitGiven} />
          <BooleanRow label="Price List Shared" value={visit.priceListShared} />
          <BooleanRow label="Case Portfolio Shared" value={visit.casePortfolioShared} />
          <BooleanRow label="Scanner Demo Done" value={visit.scannerDemoDone} />
          <InfoRow label="Other Materials" value={visit.otherMaterialShared} />
        </div>

        <div className="card">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            📊 Case Submissions
          </h2>
          <InfoRow label="Last Case Received" value={visit.lastCaseReceivedDate} type="date" />
          
          {visit.totalCasesSubmittedThisVisit && (
            <div className="p-4 bg-success text-white rounded-xl text-center mt-4">
              <div className="text-[32px] font-extrabold">+{String(visit.totalCasesSubmittedThisVisit)}</div>
              <div className="text-sm font-medium opacity-90">Cases Submitted This Visit</div>
            </div>
          )}

          {visit.doctorSatisfactionRating && (
            <div className="mt-6">
              <span className="block text-[13px] text-text-secondary font-medium mb-2">Satisfaction Rating</span>
              <div className="text-2xl text-[#FFD700] tracking-[2px]">
                {'★'.repeat(Number(visit.doctorSatisfactionRating))}
                {'☆'.repeat(5 - Number(visit.doctorSatisfactionRating))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Follow Up */}
      {Boolean(visit.followUpDate || visit.nextAction || visit.pendingTasks || visit.supportRequired) && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📆</span>
            <h2 className="text-base font-bold m-0">Follow-up & Actions</h2>
          </div>
          
          {Boolean(visit.followUpDate) && (() => {
            const followUpPast =
              isPastDate(String(visit.followUpDate)) &&
              String(visit.status) !== 'Completed' &&
              String(visit.status) !== 'Cancelled';
            return (
              <div
                className={`mb-4 inline-flex items-center gap-2 follow-up-date${followUpPast ? ' overdue' : ''}`}
              >
                <span className="font-semibold">
                  Due: {formatDate(String(visit.followUpDate))}
                </span>
                {followUpPast && (
                  <span className="badge badge-red">{daysSince(String(visit.followUpDate))} days overdue</span>
                )}
              </div>
            );
          })()}
          
          <InfoRow label="Next Action" value={visit.nextAction} />
          <InfoRow label="Responsible Person" value={visit.responsiblePerson} />
          <InfoRow label="Target Completion" value={visit.targetCompletionDate} type="date" />
          <TextBlock label="Pending Tasks" value={visit.pendingTasks} />
          <TextBlock label="Support Required from HO" value={visit.supportRequired} />
        </div>
      )}

      {/* Attachments */}
      {visit.prescriptionCasePhotos && Array.isArray(visit.prescriptionCasePhotos) && visit.prescriptionCasePhotos.length > 0 && (
        <div className="card mb-4">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            📎 Case Photos
          </h2>
          <div className="flex gap-3 flex-wrap">
            {visit.prescriptionCasePhotos.map((url: string, i: number) => (
              <div key={i} className="border border-border rounded-lg p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Case ${i+1}`} className="w-[120px] h-[120px] object-cover rounded-md mb-2" />
                <div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">⬇️ Download</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule History */}
      {sortedRescheduleHistory.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-brand" />
            <h2 className="text-base font-bold m-0">Reschedule History</h2>
          </div>
          <div className="space-y-4">
            {sortedRescheduleHistory.map((entry, index) => (
              <div
                key={`${entry.rescheduledAt}-${index}`}
                className="rounded-xl border border-border bg-bg-secondary/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-text-primary">
                      {entry.rescheduledByName}
                    </div>
                    <div className="text-xs text-text-muted capitalize">
                      {entry.rescheduledByRole.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatDateTime(entry.rescheduledAt)}
                  </div>
                </div>

                <div className="mb-3 text-sm">
                  <div className="rounded-lg bg-white p-3 ring-1 ring-border">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                      Follow-up Date
                    </div>
                    <div className="text-text-secondary line-through">
                      {formatDate(entry.previousFollowUpDate)}
                    </div>
                    <div className="font-semibold text-brand mt-1">
                      → {formatDate(entry.newFollowUpDate)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                    Remarks
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed m-0">
                    {entry.remarks}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manager Remarks */}
      {visit.remarksBySalesManager && (
        <div className="card bg-danger-light">
          <h2 className="text-base font-bold text-danger mb-3 flex items-center gap-2">
            🛡️ Manager Remarks
          </h2>
          <div className="text-sm text-danger whitespace-pre-wrap leading-normal">
            {String(visit.remarksBySalesManager)}
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="modal-overlay" onClick={() => !rescheduling && setShowReschedule(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-900">
                <CalendarClock className="h-5 w-5 text-brand" />
                Reschedule Visit
              </div>
              <p className="mb-6 text-sm text-slate-500">
                Update only the next follow-up date. Remarks are mandatory and will be visible to everyone.
              </p>

              <div className="mb-4">
                <div>
                  <label className="input-label" htmlFor="reschedule-follow-up">Follow-up Date</label>
                  <input
                    id="reschedule-follow-up"
                    type="date"
                    className="input"
                    value={rescheduleFollowUpDate}
                    onChange={(e) => setRescheduleFollowUpDate(e.target.value)}
                    disabled={rescheduling}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="input-label" htmlFor="reschedule-remarks">
                  Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  id="reschedule-remarks"
                  className={`input min-h-[100px] resize-y ${rescheduleRemarksError ? 'border-danger' : ''}`}
                  placeholder="Explain why this visit is being rescheduled..."
                  value={rescheduleRemarks}
                  onChange={(e) => {
                    setRescheduleRemarks(e.target.value);
                    if (rescheduleRemarksError) setRescheduleRemarksError('');
                  }}
                  disabled={rescheduling}
                  rows={4}
                />
                {rescheduleRemarksError ? (
                  <p className="mt-1 text-xs text-danger">{rescheduleRemarksError}</p>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">
                    Minimum {MIN_RESCHEDULE_REMARKS} characters required
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowReschedule(false)}
                  disabled={rescheduling}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={handleReschedule}
                  disabled={rescheduling}
                >
                  {rescheduling ? 'Saving…' : 'Save Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
