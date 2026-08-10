'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import StepIndicator from '@/components/StepIndicator';
import FileUploadWithProgress from '@/components/FileUploadWithProgress';

const MIN_SUMMARY_LENGTH = 500;

const STEPS = [
  'Basic Details',
  'Discussion',
  'Follow-up & Actions',
  'Deliverables & Cases',
  'Attachments & Rating',
];

const Field = ({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{ marginBottom: 16 }}>
    <label className="input-label" htmlFor={id}>{label}</label>
    <input className="input" id={id} {...props} />
  </div>
);

const TextArea = ({ label, id, ...props }: { label: string; id: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div style={{ marginBottom: 16 }}>
    <label className="input-label" htmlFor={id}>{label}</label>
    <textarea className="input" id={id} style={{ resize: 'vertical', fontFamily: 'inherit' }} {...props} />
  </div>
);

const SelectField = ({ label, id, options, ...props }: { label: string; id: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ marginBottom: 16 }}>
    <label className="input-label" htmlFor={id}>{label}</label>
    <select className="input" id={id} {...props}>
      <option value="">Select...</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: 12 }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }} />
    <div style={{
      width: 40, height: 24, borderRadius: 12, background: checked ? 'var(--brand)' : 'var(--border)',
      position: 'relative', transition: 'background 0.2s'
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
  </label>
);

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          onClick={() => onChange(star)}
          style={{
            cursor: 'pointer',
            fontSize: 28,
            color: star <= value ? '#FFD700' : 'var(--border)',
            transition: 'color 0.2s',
          }}
        >
          ★
        </div>
      ))}
    </div>
  );
};

export default function NewVisitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const doctorSlug = searchParams.get('doctor') || '';

  const [step, setStep] = useState(0);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; hasWriteAccess: boolean } | null>(null);

  const [form, setForm] = useState({
    doctor: '',
    visitDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    visitType: '',
    meetingMode: '',
    meetingSummary: '',
    keyDiscussionPoints: '',
    doctorFeedback: '',
    objectionsRaised: '',
    requirementsDiscussed: '',
    followUpDate: '',
    nextAction: '',
    pendingTasks: '',
    supportRequired: '',
    responsiblePerson: '',
    targetCompletionDate: '',
    brochuresGiven: false,
    sampleKitGiven: false,
    priceListShared: false,
    casePortfolioShared: false,
    scannerDemoDone: false,
    otherMaterialShared: '',
    lastCaseReceivedDate: '',
    totalCasesSubmittedThisVisit: '',
    prescriptionCasePhotos: [] as string[],
    remarksBySalesManager: '',
    doctorSatisfactionRating: 0,
  });

  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string; slug: string; speciality: string; city: string }>>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<{ _id: string; name: string; slug: string; city?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cityConflict, setCityConflict] = useState<{
    message: string;
    details: {
      existingCity?: string;
      existingDoctor?: string;
      existingVisitSlug?: string;
      newCity?: string;
      newDoctor?: string;
      visitDate?: string;
    };
  } | null>(null);
  const [autoSaved, setAutoSaved] = useState('');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const summaryLength = form.meetingSummary.length;
  const summaryValid = summaryLength >= MIN_SUMMARY_LENGTH;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';

  const nowString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const minDateString = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); });
    fetch(`/api/dropdowns?_t=${Date.now()}`).then(r => r.json()).then(data => {
      if (data.grouped) {
        const formatted: Record<string, string[]> = {};
        Object.keys(data.grouped).forEach(key => {
          formatted[key] = data.grouped[key].filter((d: { isActive: boolean; label: string }) => d.isActive).map((d: { isActive: boolean; label: string }) => d.label);
        });
        setDropdowns(formatted);
      }
    });
  }, []);

  const getOptions = (key: string) => dropdowns[key] || [];

  // Load doctor from query param
  useEffect(() => {
    if (doctorSlug) {
      fetch(`/api/doctors/${doctorSlug}`).then((r) => r.json()).then((d) => {
        if (d.data) {
          setSelectedDoctor({ _id: d.data._id, name: d.data.name, slug: d.data.slug, city: d.data.city });
          setDoctorSearch(d.data.name);
          setForm((f) => ({ ...f, doctor: d.data._id }));
        }
      });
    }
  }, [doctorSlug]);

  // Doctor search
  useEffect(() => {
    if (!doctorSearch || doctorSearch.length < 2) { 
      const tm = setTimeout(() => setDoctors([]), 0);
      return () => clearTimeout(tm); 
    }
    if (selectedDoctor && doctorSearch === selectedDoctor.name) return; // Prevent searching if it matches the selected doctor

    const t = setTimeout(async () => {
      const r = await fetch(`/api/doctors?search=${doctorSearch}&limit=8&assignedRep=me`);
      const d = await r.json();
      setDoctors(d.data || []);
      setShowDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [doctorSearch, selectedDoctor]);

  // Auto-save
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (form.meetingSummary.length > 50) {
        setAutoSaved('Draft saved');
        setTimeout(() => setAutoSaved(''), 3000);
      }
    }, 2000);
  }, [form]);

  const set = (k: string, v: unknown) => {
    if (k === 'visitDate' || k === 'doctor') setCityConflict(null);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = async () => {
    if (!selectedDoctor) { addToast('Please select a doctor', 'error'); return; }
    if (!form.visitDate) { addToast('Please select a visit date', 'error'); return; }
    if (!form.visitType) { addToast('Please select a visit type', 'error'); return; }
    if (!form.followUpDate) { addToast('Please select a next follow-up date', 'error'); return; }
    if (!summaryValid) { addToast(`Meeting summary needs ${MIN_SUMMARY_LENGTH - summaryLength} more characters`, 'error'); return; }

    setSubmitting(true);
    setCityConflict(null);
    try {
      const payload: Record<string, unknown> = { ...form, doctorName: selectedDoctor.name };
      if (payload.totalCasesSubmittedThisVisit === '') delete payload.totalCasesSubmittedThisVisit;
      if (payload.doctorSatisfactionRating === 0) delete payload.doctorSatisfactionRating;
      
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Visit logged successfully!', 'success');
        router.push(`/visits/${data.data.slug}`);
      } else if (data.error === 'CITY_CONFLICT') {
        setCityConflict({ message: data.message, details: data.details || {} });
        setStep(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        addToast(data.error || 'Failed to log visit', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log New Visit</h1>
          <p className="page-subtitle">Record your field visit details</p>
        </div>
        {autoSaved && <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ {autoSaved}</span>}
      </div>

      <div className="card">
        {cityConflict && (
          <div className="visit-conflict-alert" role="alert">
            <div className="visit-conflict-alert-icon">🗺️</div>
            <div className="visit-conflict-alert-body">
              <div className="visit-conflict-alert-title">Same-day city conflict</div>
              <p className="visit-conflict-alert-message">{cityConflict.message}</p>
              <div className="visit-conflict-alert-details">
                {cityConflict.details.existingCity && (
                  <span className="visit-conflict-chip">📍 Existing: {cityConflict.details.existingCity}</span>
                )}
                {cityConflict.details.newCity && (
                  <span className="visit-conflict-chip">📍 Requested: {cityConflict.details.newCity}</span>
                )}
                {cityConflict.details.existingDoctor && (
                  <span className="visit-conflict-chip">👨‍⚕️ {cityConflict.details.existingDoctor}</span>
                )}
              </div>
              <div className="visit-conflict-alert-actions">
                {cityConflict.details.existingVisitSlug && (
                  <Link href={`/visits/${cityConflict.details.existingVisitSlug}`} className="btn btn-secondary btn-sm">
                    View existing visit
                  </Link>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setCityConflict(null);
                    setStep(0);
                    document.getElementById('visitDate')?.focus();
                  }}
                >
                  Change visit date
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCityConflict(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

        {/* Step 0 - Basic Details */}
        {step === 0 && (
          <div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <label className="input-label">Search Doctor (Lookup) *</label>
              <input
                className="input"
                value={doctorSearch}
                onChange={(e) => {
                  setDoctorSearch(e.target.value);
                  setSelectedDoctor(null);
                  setCityConflict(null);
                  setForm((f) => ({ ...f, doctor: '' }));
                }}
                placeholder="Type doctor name..."
                autoComplete="off"
              />
              {showDropdown && doctors.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 20, marginTop: 4, overflow: 'hidden' }}>
                  {doctors.map((d) => (
                    <div
                      key={d._id}
                      onClick={() => {
                        setSelectedDoctor(d);
                        setDoctorSearch(d.name);
                        setForm((f) => ({ ...f, doctor: d._id }));
                        setCityConflict(null);
                        setShowDropdown(false);
                      }}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.speciality} · {d.city}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedDoctor && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--brand-light)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--brand)', fontWeight: 600 }}>✓ Selected: {selectedDoctor.name}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Visit Date & Time *</label>
                <input 
                  id="visitDate"
                  type="datetime-local" 
                  className="input" 
                  value={form.visitDate} 
                  onChange={(e) => set('visitDate', e.target.value)} 
                  min={minDateString}
                  max={nowString}
                  required 
                />
              </div>
              <div>
                <label className="input-label">Sales Executive Name *</label>
                <input className="input" value={currentUser?.name || ''} readOnly style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
              </div>
              <SelectField label="Visit Type *" id="visitType" options={getOptions('visitType')} value={form.visitType} onChange={(e) => set('visitType', e.target.value)} required />
              
              <div>
                <label className="input-label">Meeting Mode</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
                  {(getOptions('visitMeetingMode').length > 0 ? getOptions('visitMeetingMode') : ['Clinic', 'Phone', 'Online']).map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name="meetingMode" checked={form.meetingMode === mode} onChange={() => set('meetingMode', mode)} />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1 - Discussion */}
        {step === 1 && (
          <div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" style={{ margin: 0 }}>Meeting Summary *</label>
                <span style={{ fontSize: 12, color: summaryValid ? 'var(--success)' : summaryLength > 400 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {summaryLength} / {MIN_SUMMARY_LENGTH} chars {summaryValid ? '✓' : `(${MIN_SUMMARY_LENGTH - summaryLength} more needed)`}
                </span>
              </div>
              <textarea
                className="input"
                rows={8}
                value={form.meetingSummary}
                onChange={(e) => set('meetingSummary', e.target.value)}
                placeholder={`Describe the meeting in detail — minimum ${MIN_SUMMARY_LENGTH} characters required. Include: topics discussed, doctor's response, products shown, objections handled, next steps agreed, etc.`}
                style={{ resize: 'vertical', fontFamily: 'inherit', borderColor: summaryLength > 0 && !summaryValid ? 'var(--warning)' : undefined }}
              />
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (summaryLength / MIN_SUMMARY_LENGTH) * 100)}%`,
                  background: summaryValid ? 'var(--success)' : summaryLength > 400 ? 'var(--warning)' : 'var(--brand)',
                  borderRadius: 2,
                  transition: 'width 0.3s, background 0.3s',
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <TextArea label="Key Discussion Points" id="keyDiscussionPoints" rows={3} value={form.keyDiscussionPoints} onChange={(e) => set('keyDiscussionPoints', e.target.value)} />
              <TextArea label="Doctor's Feedback" id="doctorFeedback" rows={3} value={form.doctorFeedback} onChange={(e) => set('doctorFeedback', e.target.value)} />
              <TextArea label="Objections Raised" id="objectionsRaised" rows={3} value={form.objectionsRaised} onChange={(e) => set('objectionsRaised', e.target.value)} />
              <TextArea label="Requirements Discussed" id="requirementsDiscussed" rows={3} value={form.requirementsDiscussed} onChange={(e) => set('requirementsDiscussed', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2 - Follow-up & Actions */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Next Follow-up Date *</label>
                <input type="date" className="input" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Drives overdue alerts</div>
              </div>
              <SelectField label="Next Action" id="nextAction" options={getOptions('visitNextAction')} value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
              
              <div style={{ gridColumn: '1 / -1' }}>
                <TextArea label="Pending Tasks" id="pendingTasks" rows={3} value={form.pendingTasks} onChange={(e) => set('pendingTasks', e.target.value)} placeholder="Tasks to be completed..." />
              </div>
              
              <SelectField label="Responsible Person" id="responsiblePerson" options={getOptions('visitResponsiblePerson')} value={form.responsiblePerson} onChange={(e) => set('responsiblePerson', e.target.value)} />
              
              <div>
                <label className="input-label">Target Completion Date</label>
                <input type="date" className="input" value={form.targetCompletionDate} onChange={(e) => set('targetCompletionDate', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <TextArea label="Support Required from HO" id="supportRequired" rows={3} value={form.supportRequired} onChange={(e) => set('supportRequired', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Deliverables & Cases */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Materials Shared</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
              <Toggle label="Brochures Given" checked={form.brochuresGiven} onChange={(c) => set('brochuresGiven', c)} />
              <Toggle label="Sample Kit Given" checked={form.sampleKitGiven} onChange={(c) => set('sampleKitGiven', c)} />
              <Toggle label="Price List Shared" checked={form.priceListShared} onChange={(c) => set('priceListShared', c)} />
              <Toggle label="Case Portfolio Shared" checked={form.casePortfolioShared} onChange={(c) => set('casePortfolioShared', c)} />
              <Toggle label="Scanner Demo Done" checked={form.scannerDemoDone} onChange={(c) => set('scannerDemoDone', c)} />
              <Field label="Other Material Shared" id="otherMaterialShared" value={form.otherMaterialShared} onChange={(e) => set('otherMaterialShared', e.target.value)} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Case Submissions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">Last Case Received Date</label>
                <input type="date" className="input" value={form.lastCaseReceivedDate} onChange={(e) => set('lastCaseReceivedDate', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Total Cases Submitted (This Visit)</label>
                <input type="number" className="input" value={form.totalCasesSubmittedThisVisit} onChange={(e) => set('totalCasesSubmittedThisVisit', e.target.value)} min={0} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Rolls up to lifetime total for the doctor</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 - Attachments & Rating */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <FileUploadWithProgress 
                id="casePhotos"
                label="Prescription / Case Photos"
                multiple={true}
                existingValue={form.prescriptionCasePhotos}
                onUploadComplete={(urls) => set('prescriptionCasePhotos', urls as string[])} 
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label className="input-label">Doctor Satisfaction Rating</label>
              <StarRating value={form.doctorSatisfactionRating} onChange={(v) => set('doctorSatisfactionRating', v)} />
            </div>

            {isAdmin && (
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛡️</span> Manager Section
                </h3>
                <TextArea label="Remarks by Sales Manager" id="remarksBySalesManager" rows={3} value={form.remarksBySalesManager} onChange={(e) => set('remarksBySalesManager', e.target.value)} placeholder="Visible to managers only..." />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (step === 0) router.back();
              else setStep((s) => s - 1);
            }}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && (!selectedDoctor || !form.visitDate)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !summaryValid}
            >
              {submitting ? 'Saving...' : '✓ Save Visit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
