'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Stethoscope,
  Briefcase,
  Tags,
  TrendingUp,
  Swords,
  Paperclip,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import StepIndicator from '@/components/StepIndicator';
import FileUploadWithProgress from '@/components/FileUploadWithProgress';
import { areaOptionsForCity, cn } from '@/lib/utils';

const STEPS = [
  'Information',
  'Practice Profile',
  'Categorization',
  'Opportunity Tracking',
  'Competitor Info',
  'Attachments',
  'Additional Info',
];

const STEP_ICONS = [Stethoscope, Briefcase, Tags, TrendingUp, Swords, Paperclip, CalendarHeart];

const STEP_DESCRIPTIONS = [
  'Enter doctor contact details, clinic location, and assigned sales rep.',
  'Capture practice volume, brands used, and decision-making context.',
  'Classify the doctor by category, potential, and current status.',
  'Track conversion probability and expected business opportunity.',
  'Understand competitor landscape and switching barriers.',
  'Upload clinic photos, visiting card, and supporting documents.',
  'Add personal dates, communication preferences, and visit timing.',
];

function FormField({
  label,
  id,
  hint,
  required,
  className,
  ...props
}: {
  label: string;
  id: string;
  hint?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="input-label" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <input
        id={id}
        className="input transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
        {...props}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function FormSelect({
  label,
  id,
  options,
  required,
  className,
  ...props
}: {
  label: string;
  id: string;
  options: string[];
  required?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="input-label" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <select
        id={id}
        className="input transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({
  label,
  id,
  required,
  className,
  ...props
}: {
  label: string;
  id: string;
  required?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="input-label" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <textarea
        id={id}
        className="input min-h-[110px] resize-y font-inherit transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
        rows={4}
        {...props}
      />
    </div>
  );
}

function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  className?: string;
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="input-label">{label}</label>
      <div className="flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        {options.length === 0 ? (
          <span className="text-sm text-slate-500">No options available</span>
        ) : (
          options.map((option) => {
            const selected = value.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                  selected
                    ? 'bg-brand text-white shadow-md shadow-indigo-200/60 ring-2 ring-brand/30'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand/40 hover:text-brand'
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
                {option}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChipRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="input-label">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                selected
                  ? 'bg-brand text-white shadow-md shadow-indigo-200/60'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand/40'
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ConversionSlider({
  value,
  onChange,
}: {
  value: string | number;
  onChange: (val: string) => void;
}) {
  const num = Number(value) || 0;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50/80 to-white p-5">
      <div className="flex items-center justify-between">
        <label className="input-label mb-0">Probability of Conversion</label>
        <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">{num}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={num}
        onChange={(e) => onChange(e.target.value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}

function StepSection({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const Icon = STEP_ICONS[step];
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-indigo-200/50">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{STEPS[step]}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{STEP_DESCRIPTIONS[step]}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AddDoctorPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [salesReps, setSalesReps] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setCurrentUser(data.user);
        if (data.user && (data.user.role === 'admin' || data.user.role === 'superAdmin')) {
          fetch('/api/users')
            .then((r) => r.json())
            .then((res) => {
              if (res.data) {
                setSalesReps(res.data.filter((u: { role: string }) => u.role === 'salesPerson'));
              }
            });
        }
      });

    fetch('/api/dropdowns')
      .then((res) => res.json())
      .then((data) => {
        if (data.grouped) {
          const formatted: Record<string, string[]> = {};
          Object.keys(data.grouped).forEach((key) => {
            formatted[key] = data.grouped[key]
              .filter((d: { isActive: boolean; label: string }) => d.isActive)
              .map((d: { isActive: boolean; label: string }) => d.label);
          });
          setDropdowns(formatted);
        }
      })
      .catch(() => undefined);
  }, []);

  const getOptions = (group: string) => dropdowns[group] || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>({
    name: '',
    phone: '',
    email: '',
    speciality: '',
    clinicName: '',
    clinicAddress: '',
    city: '',
    area: '',
    state: '',
    assignedRep: '',
    currentAlignerBrands: [],
    monthlyAlignerCases: '',
    otherOrthoSystems: [],
    decisionMaker: '',
    category: '',
    potentialRating: '',
    status: '',
    probabilityOfConversion: '',
    expectedFirstCaseDate: '',
    expectedMonthlyCaseVolume: '',
    estimatedMonthlyRevenuePotential: '',
    currentBrand: '',
    currentPricing: '',
    doctorLikes: '',
    doctorPainPoints: '',
    reasonForNotSwitching: '',
    reasonForNotSwitchingDetails: '',
    doctorPhotoConsent: false,
    clinicPhotograph: '',
    doctorPhotograph: '',
    visitingCard: '',
    documents: [],
    doctorBirthday: '',
    clinicAnniversary: '',
    preferredCommunication: '',
    bestTimeToVisit: '',
    decisionStage: '',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const cityOptions = (() => {
    const options = getOptions('city');
    if (form.city && !options.includes(form.city)) return [form.city, ...options];
    return options;
  })();
  const areaOptions = areaOptionsForCity(form.city);
  const stateOptions = (() => {
    const options = getOptions('state');
    if (form.state && !options.includes(form.state)) return [form.state, ...options];
    return options;
  })();

  const hasCityArea = () => {
    if (!form.city) {
      addToast('Please select a city', 'error');
      return false;
    }
    if (!form.area) {
      addToast('Please select an area', 'error');
      return false;
    }
    return true;
  };

  const reasonOptions = (() => {
    const options = getOptions('reasonForNotSwitching');
    if (form.reasonForNotSwitching && !options.includes(form.reasonForNotSwitching)) {
      return [form.reasonForNotSwitching, ...options];
    }
    return options;
  })();

  const hasSwitchingReasonDetails = () => {
    if (!form.reasonForNotSwitching) return true;
    if (String(form.reasonForNotSwitchingDetails || '').trim()) return true;
    addToast('Please explain the reason for not switching. It is required once a reason is selected.', 'error');
    return false;
  };

  const handleNext = () => {
    if (step === 0 && !hasCityArea()) return;
    if (step === 4 && !hasSwitchingReasonDetails()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.clinicAddress || !form.category) {
      addToast('Please fill all mandatory fields (Name, Phone, Email, Address, Category)', 'error');
      return;
    }
    if (!hasCityArea() || !hasSwitchingReasonDetails()) return;

    if (!/^\d{10}$/.test(form.phone)) {
      addToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form };

      ['monthlyAlignerCases', 'probabilityOfConversion', 'expectedMonthlyCaseVolume', 'estimatedMonthlyRevenuePotential', 'currentPricing'].forEach((key) => {
        if (payload[key] === '') delete payload[key];
        else if (payload[key] != null) payload[key] = Number(payload[key]);
      });

      ['expectedFirstCaseDate', 'doctorBirthday', 'clinicAnniversary'].forEach((key) => {
        if (payload[key] === '') delete payload[key];
      });

      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Doctor added successfully!', 'success');
        router.push(`/doctors/${data.data.slug}`);
      } else {
        addToast(data.error || 'Failed to add doctor', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';

  return (
    <PageShell>
      <PageHeader
        title="Add New Doctor"
        subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
        icon={<UserPlus className="h-5 w-5" />}
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-6 sm:px-8">
          <div className="overflow-x-auto">
            <StepIndicator current={step} total={STEPS.length} labels={STEPS} />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {step === 0 && (
            <StepSection step={0}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Doctor Name"
                  id="name"
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
                <FormSelect
                  label="Speciality"
                  id="speciality"
                  options={getOptions('speciality')}
                  value={form.speciality}
                  onChange={(e) => set('speciality', e.target.value)}
                />
                <FormField
                  label="Mobile Number"
                  id="phone"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  hint="Numbers only, exactly 10 digits"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                />
                <FormField
                  label="Email ID"
                  id="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
                {isAdmin ? (
                  <>
                    <FormField
                      label="Clinic Name"
                      id="clinicName"
                      placeholder="Perfect Smiles Dental"
                      value={form.clinicName}
                      onChange={(e) => set('clinicName', e.target.value)}
                    />
                    <FormSelect
                      label="Assigned Sales Rep"
                      id="assignedRep"
                      options={salesReps.map((r) => r.name)}
                      value={salesReps.find((r) => r._id === form.assignedRep)?.name || ''}
                      onChange={(e) => {
                        const rep = salesReps.find((r) => r.name === e.target.value);
                        set('assignedRep', rep ? rep._id : '');
                      }}
                      required
                    />
                  </>
                ) : (
                  <FormField
                    label="Clinic Name"
                    id="clinicName"
                    placeholder="Perfect Smiles Dental"
                    value={form.clinicName}
                    onChange={(e) => set('clinicName', e.target.value)}
                    className="md:col-span-2"
                  />
                )}
                <FormSelect
                  label="City"
                  id="city"
                  options={cityOptions}
                  value={form.city}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({ ...prev, city: value, area: '' }));
                  }}
                  required
                />
                {form.city && (
                  <FormSelect
                    label="Area"
                    id="area"
                    options={areaOptions}
                    value={form.area}
                    onChange={(e) => set('area', e.target.value)}
                    required
                  />
                )}
                <FormSelect
                  label="State"
                  id="state"
                  options={stateOptions}
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                />
                <FormTextarea
                  label="Clinic Address"
                  id="clinicAddress"
                  placeholder="Full clinic address with landmark"
                  value={form.clinicAddress}
                  onChange={(e) => set('clinicAddress', e.target.value)}
                  required
                  className="md:col-span-2"
                />
              </div>
            </StepSection>
          )}

          {step === 1 && (
            <StepSection step={1}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <ChipMultiSelect
                  label="Current Aligner Brand(s) Used"
                  options={getOptions('currentAlignerBrand')}
                  value={form.currentAlignerBrands}
                  onChange={(val) => set('currentAlignerBrands', val)}
                />
                <ChipMultiSelect
                  label="Other Orthodontic Systems Used"
                  options={getOptions('otherOrthoSystem')}
                  value={form.otherOrthoSystems}
                  onChange={(val) => set('otherOrthoSystems', val)}
                />
                <FormField
                  label="Monthly Aligner Cases"
                  id="cases"
                  type="number"
                  min={0}
                  placeholder="e.g. 10"
                  value={form.monthlyAlignerCases}
                  onChange={(e) => set('monthlyAlignerCases', e.target.value)}
                />
                <FormSelect
                  label="Decision Maker"
                  id="dm"
                  options={getOptions('decisionMaker')}
                  value={form.decisionMaker}
                  onChange={(e) => set('decisionMaker', e.target.value)}
                />
              </div>
            </StepSection>
          )}

          {step === 2 && (
            <StepSection step={2}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormSelect
                  label="Potential Rating"
                  id="potential"
                  options={getOptions('potentialRating')}
                  value={form.potentialRating}
                  onChange={(e) => set('potentialRating', e.target.value)}
                />
                <FormSelect
                  label="Current Status"
                  id="status"
                  options={getOptions('doctorStatus')}
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                />
                <div className="md:col-span-2">
                  <ChipRadioGroup
                    label="Category"
                    name="category"
                    options={getOptions('doctorCategory')}
                    value={form.category}
                    onChange={(val) => set('category', val)}
                    required
                  />
                </div>
              </div>
            </StepSection>
          )}

          {step === 3 && (
            <StepSection step={3}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ConversionSlider
                    value={form.probabilityOfConversion}
                    onChange={(val) => set('probabilityOfConversion', val)}
                  />
                </div>
                <FormField
                  label="Expected First Case Date"
                  id="firstCaseDate"
                  type="date"
                  value={form.expectedFirstCaseDate}
                  onChange={(e) => set('expectedFirstCaseDate', e.target.value)}
                />
                <FormField
                  label="Expected Monthly Case Volume"
                  id="expectedVol"
                  type="number"
                  min={0}
                  placeholder="e.g. 5"
                  value={form.expectedMonthlyCaseVolume}
                  onChange={(e) => set('expectedMonthlyCaseVolume', e.target.value)}
                />
                <FormField
                  label="Estimated Monthly Revenue Potential (₹)"
                  id="revenue"
                  type="number"
                  min={0}
                  placeholder="e.g. 50000"
                  value={form.estimatedMonthlyRevenuePotential}
                  onChange={(e) => set('estimatedMonthlyRevenuePotential', e.target.value)}
                  className="md:col-span-2"
                />
              </div>
            </StepSection>
          )}

          {step === 4 && (
            <StepSection step={4}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Current Brand"
                  id="currBrand"
                  placeholder="Competitor brand name"
                  value={form.currentBrand}
                  onChange={(e) => set('currentBrand', e.target.value)}
                />
                <FormField
                  label="Current Pricing (₹)"
                  id="currPricing"
                  type="number"
                  min={0}
                  placeholder="Annual or per-case pricing"
                  value={form.currentPricing}
                  onChange={(e) => set('currentPricing', e.target.value)}
                />
                <FormTextarea
                  label="Doctor's Likes"
                  id="likes"
                  placeholder="What does the doctor appreciate about current solution?"
                  value={form.doctorLikes}
                  onChange={(e) => set('doctorLikes', e.target.value)}
                  className="md:col-span-2"
                />
                <FormTextarea
                  label="Doctor's Pain Points"
                  id="pain"
                  placeholder="Key challenges or frustrations"
                  value={form.doctorPainPoints}
                  onChange={(e) => set('doctorPainPoints', e.target.value)}
                  className="md:col-span-2"
                />
                <FormSelect
                  label="Reason for Not Switching"
                  id="reasonNotSwitch"
                  options={reasonOptions}
                  value={form.reasonForNotSwitching}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      reasonForNotSwitching: value,
                      reasonForNotSwitchingDetails: value ? prev.reasonForNotSwitchingDetails : '',
                    }));
                  }}
                  className="md:col-span-2"
                />
                {form.reasonForNotSwitching && (
                  <FormTextarea
                    label="Explain this reason"
                    id="reasonNotSwitchDetails"
                    placeholder="Write why the doctor is not switching"
                    value={form.reasonForNotSwitchingDetails}
                    onChange={(e) => set('reasonForNotSwitchingDetails', e.target.value)}
                    required
                    autoFocus
                    className="md:col-span-2"
                  />
                )}
              </div>
            </StepSection>
          )}

          {step === 5 && (
            <StepSection step={5}>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Upload files directly to secure cloud storage. Supported formats: images and PDFs.
              </p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.doctorPhotoConsent}
                      onChange={(e) => set('doctorPhotoConsent', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded accent-brand"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      I have obtained consent to upload the doctor&apos;s photograph
                    </span>
                  </label>
                  {form.doctorPhotoConsent && (
                    <div className="mt-4">
                      <FileUploadWithProgress
                        label="Doctor Photograph"
                        id="docPhoto"
                        accept="image/*"
                        existingValue={form.doctorPhotograph}
                        onUploadComplete={(url) => set('doctorPhotograph', url)}
                      />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <FileUploadWithProgress
                    label="Documents (PDF, Images, etc.)"
                    id="docs"
                    multiple
                    existingValue={form.documents}
                    onUploadComplete={(urls) => set('documents', urls)}
                  />
                </div>
              </div>
            </StepSection>
          )}

          {step === 6 && (
            <StepSection step={6}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Doctor Birthday"
                  id="bday"
                  type="date"
                  value={form.doctorBirthday}
                  onChange={(e) => set('doctorBirthday', e.target.value)}
                />
                <FormField
                  label="Clinic Anniversary"
                  id="anniv"
                  type="date"
                  value={form.clinicAnniversary}
                  onChange={(e) => set('clinicAnniversary', e.target.value)}
                />
                <FormField
                  label="Best Time to Visit"
                  id="timeToVisit"
                  type="time"
                  value={form.bestTimeToVisit}
                  onChange={(e) => set('bestTimeToVisit', e.target.value)}
                />
                <FormSelect
                  label="Decision Stage"
                  id="decisionStage"
                  options={getOptions('decisionStage')}
                  value={form.decisionStage}
                  onChange={(e) => set('decisionStage', e.target.value)}
                />
                <div className="md:col-span-2">
                  <ChipRadioGroup
                    label="Preferred Communication"
                    name="comm"
                    options={getOptions('preferredCommunication')}
                    value={form.preferredCommunication}
                    onChange={(val) => set('preferredCommunication', val)}
                  />
                </div>
              </div>
            </StepSection>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm sm:px-8">
          {step > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Next Step
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Doctor Profile'}
            </button>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
