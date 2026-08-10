'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import StepIndicator from '@/components/StepIndicator';
import FileUploadWithProgress from '@/components/FileUploadWithProgress';

const STEPS = [
  'Information',
  'Practice Profile',
  'Categorization',
  'Opportunity Tracking',
  'Competitor Info',
  'Attachments',
  'Additional Info',
];

const Field = ({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="mb-4">
    <label className="input-label" htmlFor={id}>{label}</label>
    <input id={id} className="input" {...props} />
  </div>
);

const SelectField = ({ label, id, options, ...props }: { label: string; id: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="mb-4">
    <label className="input-label" htmlFor={id}>{label}</label>
    <select id={id} className="input" {...props}>
      <option value="">Select an option</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const TextArea = ({ label, id, ...props }: { label: string; id: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div className="mb-4">
    <label className="input-label" htmlFor={id}>{label}</label>
    <textarea id={id} className="input resize-y font-inherit" rows={3} {...props} />
  </div>
);

const MultiSelectField = ({ label, id, options, value, onChange }: { label: string; id: string; options: string[]; value: string[]; onChange: (val: string[]) => void }) => (
  <div className="mb-4">
    <label className="input-label" htmlFor={id}>{label}</label>
    <div className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-bg-primary max-h-[160px] overflow-y-auto">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
          <input 
            type="checkbox" 
            checked={value.includes(o)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...value, o]);
              } else {
                onChange(value.filter(v => v !== o));
              }
            }}
            className="w-4 h-4 cursor-pointer accent-brand"
          />
          {o}
        </label>
      ))}
      {options.length === 0 && <div className="text-[13px] text-text-secondary">No options available</div>}
    </div>
  </div>
);

export default function EditDoctorPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { addToast } = useToast();
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Dropdowns State
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [salesReps, setSalesReps] = useState<any[]>([]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>({
    name: '', phone: '', email: '', speciality: '', clinicName: '', clinicAddress: '', city: '', state: '', assignedRep: '',
    currentAlignerBrands: [], monthlyAlignerCases: '', otherOrthoSystems: [], decisionMaker: '',
    category: '', potentialRating: '', status: '',
    probabilityOfConversion: '', expectedFirstCaseDate: '', expectedMonthlyCaseVolume: '', estimatedMonthlyRevenuePotential: '',
    currentBrand: '', currentPricing: '', doctorLikes: '', doctorPainPoints: '', reasonForNotSwitching: '',
    doctorPhotoConsent: false, clinicPhotograph: '', doctorPhotograph: '', visitingCard: '', documents: [],
    doctorBirthday: '', clinicAnniversary: '', preferredCommunication: '', bestTimeToVisit: '', decisionStage: '',
  });

  useEffect(() => {
    if (!slug) return;
    
    // Fetch users for admin rep assignment
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setCurrentUser(data.user);
      if (data.user && (data.user.role === 'admin' || data.user.role === 'superAdmin')) {
        fetch('/api/users').then(r => r.json()).then(res => {
          if (res.data) setSalesReps(res.data.filter((u: { role: string }) => u.role === 'salesPerson'));
        });
      }
    });

    Promise.all([
      fetch(`/api/doctors/${slug}`).then((res) => res.json()),
      fetch('/api/dropdowns').then(res => res.json())
    ])
    .then(([doctorData, dropdownData]) => {
      // Process Dropdowns
      if (dropdownData.grouped) {
        const formatted: Record<string, string[]> = {};
        Object.keys(dropdownData.grouped).forEach(key => {
          formatted[key] = dropdownData.grouped[key].filter((d: { isActive: boolean; label: string }) => d.isActive).map((d: { isActive: boolean; label: string }) => d.label);
        });
        setDropdowns(formatted);
      }

      // Process Doctor Form Data
      if (doctorData.data) {
        const doc = doctorData.data;
        
        const formatDate = (dateString?: string) => {
          if (!dateString) return '';
          const d = new Date(dateString);
          return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
        };

        setForm({
          name: doc.name || '', phone: doc.phone || '', email: doc.email || '', speciality: doc.speciality || '',
          clinicName: doc.clinicName || '', clinicAddress: doc.clinicAddress || '', city: doc.city || '', state: doc.state || '', 
          assignedRep: typeof doc.assignedRep === 'object' ? doc.assignedRep?._id : (doc.assignedRep || ''),
          currentAlignerBrands: doc.currentAlignerBrands || [], monthlyAlignerCases: doc.monthlyAlignerCases?.toString() || '', otherOrthoSystems: doc.otherOrthoSystems || [], decisionMaker: doc.decisionMaker || '',
          category: doc.category || '', potentialRating: doc.potentialRating || '', status: doc.status || '',
          probabilityOfConversion: doc.probabilityOfConversion?.toString() || '', expectedFirstCaseDate: formatDate(doc.expectedFirstCaseDate), expectedMonthlyCaseVolume: doc.expectedMonthlyCaseVolume?.toString() || '', estimatedMonthlyRevenuePotential: doc.estimatedMonthlyRevenuePotential?.toString() || '',
          currentBrand: doc.currentBrand || '', currentPricing: doc.currentPricing?.toString() || '', doctorLikes: doc.doctorLikes || '', doctorPainPoints: doc.doctorPainPoints || '', reasonForNotSwitching: doc.reasonForNotSwitching || '',
          doctorPhotoConsent: doc.doctorPhotoConsent || false, clinicPhotograph: doc.clinicPhotograph || '', doctorPhotograph: doc.doctorPhotograph || '', visitingCard: doc.visitingCard || '', documents: doc.documents || [],
          doctorBirthday: formatDate(doc.doctorBirthday), clinicAnniversary: formatDate(doc.clinicAnniversary), preferredCommunication: doc.preferredCommunication || '', bestTimeToVisit: doc.bestTimeToVisit || '', decisionStage: doc.decisionStage || '',
        });
      }
      setLoading(false);
    })
    .catch(() => {
      addToast('Failed to load data', 'error');
      setLoading(false);
    });
  }, [slug, addToast]);

  const getOptions = (group: string) => dropdowns[group] || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.clinicAddress || !form.category) {
      addToast('Please fill all mandatory fields (Name, Phone, Email, Address, Category)', 'error');
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      addToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form };
      
      // Clean up empty numbers to avoid Mongoose CastErrors
      ['monthlyAlignerCases', 'probabilityOfConversion', 'expectedMonthlyCaseVolume', 'estimatedMonthlyRevenuePotential', 'currentPricing'].forEach(key => {
        if (payload[key] === '') { delete payload[key]; }
        else if (payload[key] != null) { payload[key] = Number(payload[key]); }
      });

      // Clean up empty dates
      ['expectedFirstCaseDate', 'doctorBirthday', 'clinicAnniversary'].forEach(key => {
        if (payload[key] === '') { delete payload[key]; }
      });

      const res = await fetch(`/api/doctors/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Doctor updated successfully!', 'success');
        router.push(`/doctors/${data.data.slug}`);
      } else {
        addToast(data.error || 'Failed to update doctor', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-[400px] rounded-2xl" />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Doctor</h1>
          <p className="page-subtitle">Update information for {form.name}</p>
        </div>
      </div>

      <div className="card">
        <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

        {/* Step 0 — Information */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Doctor Name *" id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            <SelectField label="Speciality" id="speciality" options={getOptions('speciality')} value={form.speciality} onChange={(e) => set('speciality', e.target.value)} />
            
            <Field label="Mobile Number *" id="phone" type="tel" maxLength={10} value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            <Field label="Email ID *" id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            
            {currentUser?.role !== 'salesPerson' ? (
              <>
                <Field label="Clinic Name" id="clinicName" value={form.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
                <SelectField 
                  label="Assigned Sales Rep *" 
                  id="assignedRep" 
                  options={salesReps.map(r => r.name)}
                  value={salesReps.find(r => r._id === form.assignedRep)?.name || ''} 
                  onChange={(e) => {
                    const rep = salesReps.find(r => r.name === e.target.value);
                    set('assignedRep', rep ? rep._id : '');
                  }} 
                  required={currentUser?.role !== 'salesPerson'}
                />
              </>
            ) : (
              <div className="col-span-full">
                <Field label="Clinic Name" id="clinicName" value={form.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
              </div>
            )}
            
            <Field label="City" id="city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <Field label="State" id="state" value={form.state} onChange={(e) => set('state', e.target.value)} />
            
            <div className="col-span-full">
              <TextArea label="Clinic Address *" id="clinicAddress" value={form.clinicAddress} onChange={(e) => set('clinicAddress', e.target.value)} required />
            </div>
          </div>
        )}

        {/* Step 1 — Practice Profile */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Multi-selects share a row for consistent height */}
            <MultiSelectField label="Current Aligner Brand(s) Used" id="brands" options={getOptions('currentAlignerBrand')} value={form.currentAlignerBrands} onChange={(val) => set('currentAlignerBrands', val)} />
            <MultiSelectField label="Other Orthodontic Systems Used" id="otherSystems" options={getOptions('otherOrthoSystem')} value={form.otherOrthoSystems} onChange={(val) => set('otherOrthoSystems', val)} />
            
            {/* Standard fields share a row */}
            <Field label="Monthly Aligner Cases" id="cases" type="number" value={form.monthlyAlignerCases} onChange={(e) => set('monthlyAlignerCases', e.target.value)} />
            <SelectField label="Decision Maker" id="dm" options={getOptions('decisionMaker')} value={form.decisionMaker} onChange={(e) => set('decisionMaker', e.target.value)} />
          </div>
        )}

        {/* Step 2 — Categorization */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Potential Rating" id="potential" options={getOptions('potentialRating')} value={form.potentialRating} onChange={(e) => set('potentialRating', e.target.value)} />
            <SelectField label="Current Status" id="status" options={getOptions('doctorStatus')} value={form.status} onChange={(e) => set('status', e.target.value)} />
            
            <div className="col-span-full mb-4">
              <label className="input-label">Category *</label>
              <div className="flex gap-4">
                {getOptions('doctorCategory').map(cat => (
                  <label key={cat} className="flex items-center gap-2">
                    <input type="radio" name="category" value={cat} checked={form.category === cat} onChange={(e) => set('category', e.target.value)} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Opportunity Tracking */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Probability of Conversion (%)</label>
              <div className="flex items-center gap-4 h-[42px]">
                <input type="range" min="0" max="100" value={form.probabilityOfConversion || 0} onChange={(e) => set('probabilityOfConversion', e.target.value)} className="flex-1" />
                <span className="font-semibold">{form.probabilityOfConversion || 0}%</span>
              </div>
            </div>
            <Field label="Expected First Case Date" id="firstCaseDate" type="date" value={form.expectedFirstCaseDate} onChange={(e) => set('expectedFirstCaseDate', e.target.value)} />
            
            <Field label="Expected Monthly Case Volume" id="expectedVol" type="number" value={form.expectedMonthlyCaseVolume} onChange={(e) => set('expectedMonthlyCaseVolume', e.target.value)} />
            <Field label="Estimated Monthly Revenue Potential (₹)" id="revenue" type="number" value={form.estimatedMonthlyRevenuePotential} onChange={(e) => set('estimatedMonthlyRevenuePotential', e.target.value)} />
          </div>
        )}

        {/* Step 4 — Competitor Info */}
        {step === 4 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Brand" id="currBrand" value={form.currentBrand} onChange={(e) => set('currentBrand', e.target.value)} />
            <Field label="Current Pricing" id="currPricing" type="number" value={form.currentPricing} onChange={(e) => set('currentPricing', e.target.value)} />
            
            <div className="col-span-full">
              <TextArea label="Doctor's Likes" id="likes" value={form.doctorLikes} onChange={(e) => set('doctorLikes', e.target.value)} />
            </div>
            <div className="col-span-full">
              <TextArea label="Doctor's Pain Points" id="pain" value={form.doctorPainPoints} onChange={(e) => set('doctorPainPoints', e.target.value)} />
            </div>
            
            {form.currentBrand && (
              <div className="col-span-full">
                <TextArea label="Reason for Not Switching" id="reasonNotSwitch" value={form.reasonForNotSwitching} onChange={(e) => set('reasonForNotSwitching', e.target.value)} />
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Attachments */}
        {step === 5 && (
          <div>
            <p className="text-sm text-text-secondary mb-6">
              Upload files directly to secure cloud storage.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <FileUploadWithProgress 
                label="Clinic Photograph" 
                id="clinicPhoto" 
                accept="image/*"
                existingValue={form.clinicPhotograph}
                onUploadComplete={(url) => set('clinicPhotograph', url)} 
              />
              
              <FileUploadWithProgress 
                label="Visiting Card" 
                id="visitingCard" 
                accept="image/*"
                existingValue={form.visitingCard}
                onUploadComplete={(url) => set('visitingCard', url)} 
              />
              
              <div className="col-span-full bg-bg-secondary p-4 rounded-lg">
                <label className="flex items-center gap-2 mb-3 font-medium">
                  <input type="checkbox" checked={form.doctorPhotoConsent} onChange={(e) => set('doctorPhotoConsent', e.target.checked)} />
                  I have obtained consent to upload the Doctor&apos;s photograph
                </label>
                {form.doctorPhotoConsent && (
                  <FileUploadWithProgress 
                    label="Doctor Photograph" 
                    id="docPhoto" 
                    accept="image/*"
                    existingValue={form.doctorPhotograph}
                    onUploadComplete={(url) => set('doctorPhotograph', url)} 
                  />
                )}
              </div>

              <div className="col-span-full">
                <FileUploadWithProgress 
                  label="Documents (PDF, Images, etc.)" 
                  id="docs" 
                  multiple 
                  existingValue={form.documents}
                  onUploadComplete={(urls) => set('documents', urls)} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6 — Additional Info */}
        {step === 6 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Doctor Birthday" id="bday" type="date" value={form.doctorBirthday} onChange={(e) => set('doctorBirthday', e.target.value)} />
            <Field label="Clinic Anniversary" id="anniv" type="date" value={form.clinicAnniversary} onChange={(e) => set('clinicAnniversary', e.target.value)} />
            
            <Field label="Best Time to Visit" id="timeToVisit" type="time" value={form.bestTimeToVisit} onChange={(e) => set('bestTimeToVisit', e.target.value)} />
            <SelectField label="Decision Stage" id="decisionStage" options={getOptions('decisionStage')} value={form.decisionStage} onChange={(e) => set('decisionStage', e.target.value)} />
            
            <div className="col-span-full">
              <label className="input-label">Preferred Communication</label>
              <div className="flex gap-4">
                {getOptions('preferredCommunication').map(method => (
                  <label key={method} className="flex items-center gap-2">
                    <input type="radio" name="comm" value={method} checked={form.preferredCommunication === method} onChange={(e) => set('preferredCommunication', e.target.value)} />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-8">
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>
          ) : <div />}
          
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next Step</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Doctor Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
