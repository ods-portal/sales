'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDateTime, daysSince, canCreateRecords } from '@/lib/utils';

type TabKey = 'profile' | 'practice' | 'categorization' | 'opportunity' | 'competitor' | 'attachments' | 'additional' | 'visits';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'profile', label: '📋 Information' },
  { key: 'practice', label: '🏥 Practice' },
  { key: 'categorization', label: '📊 Category' },
  { key: 'opportunity', label: '💰 Opportunity' },
  { key: 'competitor', label: '⚔️ Competitor' },
  { key: 'attachments', label: '📎 Attachments' },
  { key: 'additional', label: '➕ Additional' },
  { key: 'visits', label: '📅 Visit History' },
];

const STATUS_BADGE: Record<string, string> = {
  Active: 'badge badge-green',
  Prospect: 'badge badge-blue',
  Dormant: 'badge badge-gray',
  Lost: 'badge badge-red',
};

const CAT_BADGE: Record<string, string> = {
  A: 'badge badge-indigo',
  B: 'badge badge-blue',
  C: 'badge badge-amber',
};

const InfoRow = ({ label, value }: { label: string; value?: unknown }) => {
  if (value === undefined || value === null || value === '') return null;
  let displayValue = String(value);
  if (Array.isArray(value)) displayValue = value.join(', ');
  
  return (
    <div className="flex gap-2 py-2.5 border-b border-border">
      <span className="min-w-[200px] text-[13px] text-text-secondary font-medium">{label}</span>
      <span className="text-sm text-text-primary whitespace-pre-wrap">{displayValue}</span>
    </div>
  );
};

export default function DoctorDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [doctor, setDoctor] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [visits, setVisits] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('profile');
  const [currentUser, setCurrentUser] = useState<{ role: string, hasWriteAccess: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); });
    Promise.all([
      fetch(`/api/doctors/${slug}`).then((r) => r.json()),
      fetch(`/api/visits?sort=-visitDate&limit=50`).then((r) => r.json()),
    ]).then(([docData, visitsData]) => {
      setDoctor(docData.data);
      // Filter visits for this doctor (client-side since we don't have a doctor-specific visits endpoint)
      setVisits((visitsData.data || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (v: Record<string, any>) => (v.doctor as Record<string, any>)?.slug === slug
      ));
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-[180px] rounded-2xl mb-4" />
        <div className="skeleton h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="card text-center py-20">
        <div className="text-[48px] mb-3">🏥</div>
        <div className="text-xl font-bold">Doctor not found</div>
        <Link href="/doctors" className="btn btn-primary mt-4 inline-flex">← Back to Doctors</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-[13px] text-text-muted mb-4">
        <Link href="/doctors" className="text-brand no-underline">Doctors</Link>
        {' / '}
        <span>{String(doctor.name)}</span>
      </div>

      {/* Doctor Header Card */}
      <div className="card mb-4 bg-gradient-to-br from-[#F0F4FF] to-white">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-[72px] h-[72px] rounded-[18px] bg-brand text-white flex items-center justify-center text-[28px] font-extrabold shrink-0">
            {String(doctor.name).charAt(4)?.toUpperCase() || 'D'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-extrabold text-text-primary m-0">{String(doctor.name)}</h1>
              {doctor.category && <span className={CAT_BADGE[String(doctor.category)] || 'badge badge-gray'}>Cat. {String(doctor.category)}</span>}
              {doctor.status && <span className={STATUS_BADGE[String(doctor.status)] || 'badge badge-gray'}>{String(doctor.status)}</span>}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {doctor.speciality} · {doctor.area || doctor.city}{doctor.state ? `, ${doctor.state}` : ''}
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {Boolean(doctor.phone) && <a href={`tel:${doctor.phone}`} className="text-[13px] text-brand no-underline">📞 {String(doctor.phone)}</a>}
              {Boolean(doctor.email) && <a href={`mailto:${doctor.email}`} className="text-[13px] text-brand no-underline">✉️ {String(doctor.email)}</a>}
              <span className="text-[13px] text-text-muted">📅 Added {formatDate(String(doctor.createdAt))}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {canCreateRecords(currentUser) && (
              <Link href={`/visits/new?doctor=${slug}`} className="btn btn-primary">+ Log Visit</Link>
            )}
            {currentUser && (currentUser.role === 'superAdmin' || (currentUser.role === 'admin' && currentUser.hasWriteAccess)) && (
              <Link href={`/doctors/${slug}/edit`} className="btn btn-secondary">Edit</Link>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-border flex-wrap">
          <div className="text-center">
            <div className="text-[22px] font-extrabold text-brand">{visits.length}</div>
            <div className="text-xs text-text-muted">Total Visits</div>
          </div>
          {Boolean(doctor.monthlyAlignerCases) && (
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-success">{String(doctor.monthlyAlignerCases)}</div>
              <div className="text-xs text-text-muted">Aligner Cases/Month</div>
            </div>
          )}
          {Boolean(doctor.probabilityOfConversion) && (
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-info">{String(doctor.probabilityOfConversion)}%</div>
              <div className="text-xs text-text-muted">Conversion Prob.</div>
            </div>
          )}
          {visits.length > 0 && (
            <div className="text-center">
              <div className="text-[22px] font-extrabold text-warning">
                {daysSince(String((visits[0] as Record<string, unknown>).visitDate))}d
              </div>
              <div className="text-xs text-text-muted">Days Since Last Visit</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-0">
        <div className="flex border-b border-border px-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3.5 border-b-2 text-sm whitespace-nowrap transition-all duration-150 ${tab === t.key ? 'border-brand text-brand font-semibold' : 'border-transparent text-text-secondary font-normal'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'profile' && (
            <div>
              <InfoRow label="Doctor Name" value={doctor.name} />
              <InfoRow label="Speciality" value={doctor.speciality} />
              <InfoRow label="Phone" value={doctor.phone} />
              <InfoRow label="Email" value={doctor.email} />
              <InfoRow label="Clinic Name" value={doctor.clinicName} />
              <InfoRow label="Clinic Address" value={doctor.clinicAddress} />
              <InfoRow label="City" value={doctor.city} />
              <InfoRow label="Area" value={doctor.area} />
              <InfoRow label="State" value={doctor.state} />
              <InfoRow label="Assigned Rep" value={doctor.assignedRep?.name} />
            </div>
          )}

          {tab === 'practice' && (
            <div>
              <InfoRow label="Current Aligner Brand(s) Used" value={doctor.currentAlignerBrands} />
              <InfoRow label="Monthly Aligner Cases" value={doctor.monthlyAlignerCases} />
              <InfoRow label="Other Orthodontic Systems Used" value={doctor.otherOrthoSystems} />
              <InfoRow label="Decision Maker" value={doctor.decisionMaker} />
            </div>
          )}

          {tab === 'categorization' && (
            <div>
              <InfoRow label="Category" value={doctor.category} />
              <InfoRow label="Potential Rating" value={doctor.potentialRating} />
              <InfoRow label="Current Status" value={doctor.status} />
            </div>
          )}

          {tab === 'opportunity' && (
            <div>
              <InfoRow label="Probability of Conversion" value={doctor.probabilityOfConversion ? `${doctor.probabilityOfConversion}%` : null} />
              <InfoRow label="Expected First Case Date" value={doctor.expectedFirstCaseDate ? formatDate(doctor.expectedFirstCaseDate) : null} />
              <InfoRow label="Expected Monthly Case Volume" value={doctor.expectedMonthlyCaseVolume} />
              <InfoRow label="Estimated Monthly Revenue Potential" value={doctor.estimatedMonthlyRevenuePotential ? `₹${doctor.estimatedMonthlyRevenuePotential}` : null} />
            </div>
          )}

          {tab === 'competitor' && (
            <div>
              <InfoRow label="Current Brand" value={doctor.currentBrand} />
              <InfoRow label="Current Pricing" value={doctor.currentPricing ? `₹${doctor.currentPricing}` : null} />
              <InfoRow label="Doctor's Likes" value={doctor.doctorLikes} />
              <InfoRow label="Doctor's Pain Points" value={doctor.doctorPainPoints} />
              <InfoRow label="Reason for Not Switching" value={doctor.reasonForNotSwitching} />
              <InfoRow label="Reason Details" value={doctor.reasonForNotSwitchingDetails} />
            </div>
          )}

          {tab === 'attachments' && (
            <div>
              {doctor.clinicPhotograph && (
                <div className="mb-6">
                  <div className="flex items-center justify-between max-w-[300px] mb-2">
                    <div className="text-[13px] text-text-secondary font-medium">Clinic Photograph</div>
                    <a href={doctor.clinicPhotograph} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm px-2 py-1 text-xs">
                      ⬇️ Download
                    </a>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doctor.clinicPhotograph} alt="Clinic" className="max-w-[300px] rounded-lg border border-border" />
                </div>
              )}
              {doctor.doctorPhotograph && doctor.doctorPhotoConsent && (
                <div className="mb-6">
                  <div className="flex items-center justify-between max-w-[300px] mb-2">
                    <div className="text-[13px] text-text-secondary font-medium">Doctor Photograph</div>
                    <a href={doctor.doctorPhotograph} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm px-2 py-1 text-xs">
                      ⬇️ Download
                    </a>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doctor.doctorPhotograph} alt="Doctor" className="max-w-[300px] rounded-lg border border-border" />
                </div>
              )}
              {doctor.visitingCard && (
                <div className="mb-6">
                  <div className="flex items-center justify-between max-w-[300px] mb-2">
                    <div className="text-[13px] text-text-secondary font-medium">Visiting Card</div>
                    <a href={doctor.visitingCard} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm px-2 py-1 text-xs">
                      ⬇️ Download
                    </a>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doctor.visitingCard} alt="Visiting Card" className="max-w-[300px] rounded-lg border border-border" />
                </div>
              )}
              {doctor.documents && Array.isArray(doctor.documents) && doctor.documents.length > 0 && (
                <div className="mb-6">
                  <div className="text-[13px] text-text-secondary font-medium mb-2">Documents</div>
                  <div className="flex flex-wrap gap-2">
                    {doctor.documents.map((docUrl: string, idx: number) => (
                      <a key={idx} href={docUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm inline-flex items-center gap-1.5">
                        📄 Document {idx + 1} ⬇️
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'additional' && (
            <div>
              <InfoRow label="Doctor Birthday" value={doctor.doctorBirthday ? formatDate(doctor.doctorBirthday) : null} />
              <InfoRow label="Clinic Anniversary" value={doctor.clinicAnniversary ? formatDate(doctor.clinicAnniversary) : null} />
              <InfoRow label="Preferred Communication" value={doctor.preferredCommunication} />
              <InfoRow label="Best Time to Visit" value={doctor.bestTimeToVisit} />
              <InfoRow label="Decision Stage" value={doctor.decisionStage} />
              <InfoRow label="Created At" value={formatDateTime(String(doctor.createdAt))} />
            </div>
          )}

          {tab === 'visits' && (
            <div>
              {visits.length === 0 ? (
                <div className="text-center py-10 text-text-muted">
                  <div className="text-[32px] mb-2">📅</div>
                  <div className="font-semibold">No visits logged yet</div>
                  {canCreateRecords(currentUser) && (
                    <Link href={`/visits/new?doctor=${slug}`} className="btn btn-primary btn-sm mt-3 inline-flex">Log First Visit</Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {visits.map((v) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const visit = v as Record<string, any>;
                    return (
                      <Link key={String(visit._id)} href={`/visits/${visit.slug}`} className="no-underline">
                        <div className="px-4 py-3.5 rounded-[10px] border border-border flex gap-3 items-center transition-colors duration-150 hover:bg-bg-secondary">
                          <div className="w-10 h-10 rounded-[10px] bg-brand-light text-brand flex items-center justify-center text-lg shrink-0">📝</div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{String(visit.visitType)} Visit</div>
                            <div className="text-xs text-text-muted">{formatDate(String(visit.visitDate))}</div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className={
                              String(visit.status) === 'Completed' ? 'badge badge-green' :
                              String(visit.status) === 'Pending' ? 'badge badge-amber' :
                              'badge badge-red'
                            }>{String(visit.status)}</span>
                            {visit.isFlagged && (
                              <span className="badge badge-amber" title={String(visit.flagNote || 'Flagged')}>
                                Flagged
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
