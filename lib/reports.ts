import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
} from 'date-fns';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { resolveSalesPersonsForVisits, resolveAssignedRepsForDoctors } from '@/lib/resolveRep';
import Visit from '@/models/Visit';
import Doctor from '@/models/Doctor';
import User from '@/models/User';

export type ReportRange = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportFilters {
  doctorId?: string;
  salesPersonId?: string;
  city?: string;
  area?: string;
}

export interface ReportFilterLabels {
  doctorName?: string;
  salesPersonName?: string;
  city?: string;
  area?: string;
}

export interface ReportPeriod {
  start: Date;
  end: Date;
  label: string;
  filenameSuffix: string;
}

export interface ReportVisitRow {
  visitDate: string;
  doctorName: string;
  doctorCity: string;
  doctorArea: string;
  doctorSpeciality: string;
  visitType: string;
  salesPerson: string;
  status: string;
  followUpDate: string;
  meetingMode: string;
  rating: string;
}

export interface ReportDoctorRow {
  name: string;
  slug: string;
  previousSlugs: string;
  phone: string;
  email: string;
  speciality: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  area: string;
  state: string;
  assignedRep: string;
  category: string;
  status: string;
  potentialRating: string;
  monthlyAlignerCases: string;
  lifetimeCasesSubmitted: string;
  currentAlignerBrands: string;
  otherOrthoSystems: string;
  decisionMaker: string;
  probabilityOfConversion: string;
  expectedFirstCaseDate: string;
  expectedMonthlyCaseVolume: string;
  estimatedMonthlyRevenuePotential: string;
  currentBrand: string;
  currentPricing: string;
  doctorLikes: string;
  doctorPainPoints: string;
  reasonForNotSwitching: string;
  reasonForNotSwitchingDetails: string;
  doctorBirthday: string;
  clinicAnniversary: string;
  preferredCommunication: string;
  bestTimeToVisit: string;
  decisionStage: string;
  doctorPhotoConsent: string;
  clinicPhotograph: string;
  doctorPhotograph: string;
  visitingCard: string;
  documents: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportVisitFullRow {
  slug: string;
  visitDate: string;
  visitType: string;
  meetingMode: string;
  status: string;
  followUpDate: string;
  statusUpdatedAt: string;
  doctorName: string;
  doctorSlug: string;
  doctorCity: string;
  doctorArea: string;
  salesPerson: string;
  salesPersonEmail: string;
  meetingSummary: string;
  keyDiscussionPoints: string;
  doctorFeedback: string;
  objectionsRaised: string;
  requirementsDiscussed: string;
  nextAction: string;
  pendingTasks: string;
  supportRequired: string;
  responsiblePerson: string;
  targetCompletionDate: string;
  brochuresGiven: string;
  sampleKitGiven: string;
  priceListShared: string;
  casePortfolioShared: string;
  scannerDemoDone: string;
  otherMaterialShared: string;
  lastCaseReceivedDate: string;
  totalCasesSubmittedThisVisit: string;
  prescriptionCasePhotos: string;
  remarksBySalesManager: string;
  doctorSatisfactionRating: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepPerformance {
  name: string;
  visits: number;
  completed: number;
  pending: number;
}

export interface ReportData {
  title: string;
  periodLabel: string;
  filtersLabel?: string;
  generatedAt: string;
  generatedBy: string;
  kpis: {
    totalVisits: number;
    completedVisits: number;
    pendingVisits: number;
    overdueVisits: number;
    cancelledVisits: number;
    newDoctors: number;
    uniqueDoctorsVisited: number;
    avgSatisfaction: number | null;
  };
  visits: ReportVisitRow[];
  doctors: ReportDoctorRow[];
  visitsFull: ReportVisitFullRow[];
  repPerformance: RepPerformance[];
  statusBreakdown: { status: string; count: number }[];
  visitTypeBreakdown: { type: string; count: number }[];
}

export function resolveReportPeriod(
  range: ReportRange,
  from?: string,
  to?: string
): ReportPeriod {
  const now = new Date();

  switch (range) {
    case 'daily': {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return {
        start,
        end,
        label: format(now, 'EEEE, MMMM d, yyyy'),
        filenameSuffix: format(now, 'yyyy-MM-dd'),
      };
    }
    case 'weekly': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
        filenameSuffix: `week-${format(start, 'yyyy-MM-dd')}`,
      };
    }
    case 'monthly': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        start,
        end,
        label: format(now, 'MMMM yyyy'),
        filenameSuffix: format(now, 'yyyy-MM'),
      };
    }
    case 'custom': {
      if (!from || !to) {
        throw new Error('Custom range requires from and to dates');
      }
      const start = startOfDay(parseISO(from));
      const end = endOfDay(parseISO(to));
      if (start > end) {
        throw new Error('Start date must be before end date');
      }
      return {
        start,
        end,
        label: `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`,
        filenameSuffix: `${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}`,
      };
    }
    default:
      throw new Error('Invalid report range');
  }
}

const RANGE_TITLES: Record<ReportRange, string> = {
  daily: 'Daily Sales Report',
  weekly: 'Weekly Performance Report',
  monthly: 'Monthly KPI Report',
  custom: 'Custom Range Report',
};

function fmtDate(d: Date | string | undefined | null): string {
  if (!d) return '';
  return format(new Date(d), 'yyyy-MM-dd');
}

function fmtDateTime(d: Date | string | undefined | null): string {
  if (!d) return '';
  return format(new Date(d), 'yyyy-MM-dd HH:mm');
}

function fmtBool(v: boolean | undefined | null): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '';
}

function fmtNum(v: number | undefined | null): string {
  return v === undefined || v === null ? '' : String(v);
}

function fmtArr(v: string[] | undefined | null): string {
  return v?.length ? v.join('; ') : '';
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

function getDoctorIdFromVisit(v: { doctor?: unknown }): string | null {
  const doc = v.doctor as { _id?: unknown } | unknown;
  if (doc && typeof doc === 'object' && '_id' in (doc as object)) {
    return String((doc as { _id: unknown })._id);
  }
  if (doc) return String(doc);
  return null;
}

function mapDoctorRow(
  d: Record<string, unknown> & {
    name: string;
    slug: string;
    assignedRep?: { name?: string } | null;
  }
): ReportDoctorRow {
  return {
    name: d.name,
    slug: d.slug,
    previousSlugs: fmtArr(d.previousSlugs as string[]),
    phone: str(d.phone),
    email: str(d.email),
    speciality: str(d.speciality),
    clinicName: str(d.clinicName),
    clinicAddress: str(d.clinicAddress),
    city: str(d.city),
    area: str(d.area),
    state: str(d.state),
    assignedRep: (d.assignedRep as { name?: string })?.name || '—',
    category: str(d.category),
    status: str(d.status),
    potentialRating: str(d.potentialRating),
    monthlyAlignerCases: fmtNum(d.monthlyAlignerCases as number),
    lifetimeCasesSubmitted: fmtNum(d.lifetimeCasesSubmitted as number),
    currentAlignerBrands: fmtArr(d.currentAlignerBrands as string[]),
    otherOrthoSystems: fmtArr(d.otherOrthoSystems as string[]),
    decisionMaker: str(d.decisionMaker),
    probabilityOfConversion: fmtNum(d.probabilityOfConversion as number),
    expectedFirstCaseDate: fmtDate(d.expectedFirstCaseDate as Date),
    expectedMonthlyCaseVolume: fmtNum(d.expectedMonthlyCaseVolume as number),
    estimatedMonthlyRevenuePotential: fmtNum(d.estimatedMonthlyRevenuePotential as number),
    currentBrand: str(d.currentBrand),
    currentPricing: fmtNum(d.currentPricing as number),
    doctorLikes: str(d.doctorLikes),
    doctorPainPoints: str(d.doctorPainPoints),
    reasonForNotSwitching: str(d.reasonForNotSwitching),
    reasonForNotSwitchingDetails: str(d.reasonForNotSwitchingDetails),
    doctorBirthday: fmtDate(d.doctorBirthday as Date),
    clinicAnniversary: fmtDate(d.clinicAnniversary as Date),
    preferredCommunication: str(d.preferredCommunication),
    bestTimeToVisit: str(d.bestTimeToVisit),
    decisionStage: str(d.decisionStage),
    doctorPhotoConsent: fmtBool(d.doctorPhotoConsent as boolean),
    clinicPhotograph: str(d.clinicPhotograph),
    doctorPhotograph: str(d.doctorPhotograph),
    visitingCard: str(d.visitingCard),
    documents: fmtArr(d.documents as string[]),
    createdAt: fmtDateTime(d.createdAt as Date),
    updatedAt: fmtDateTime(d.updatedAt as Date),
  };
}

function mapVisitFullRow(v: Record<string, unknown>): ReportVisitFullRow {
  const doctor = v.doctor as { name?: string; slug?: string; city?: string; area?: string } | undefined;
  const rep = v.salesPerson as { name?: string; email?: string } | undefined;
  return {
    slug: str(v.slug),
    visitDate: fmtDate(v.visitDate as Date),
    visitType: str(v.visitType),
    meetingMode: str(v.meetingMode),
    status: str(v.status),
    followUpDate: fmtDate(v.followUpDate as Date),
    statusUpdatedAt: fmtDateTime(v.statusUpdatedAt as Date),
    doctorName: doctor?.name || '—',
    doctorSlug: doctor?.slug || '—',
    doctorCity: doctor?.city || '—',
    doctorArea: doctor?.area || '—',
    salesPerson: rep?.name || '—',
    salesPersonEmail: rep?.email || '—',
    meetingSummary: str(v.meetingSummary),
    keyDiscussionPoints: str(v.keyDiscussionPoints),
    doctorFeedback: str(v.doctorFeedback),
    objectionsRaised: str(v.objectionsRaised),
    requirementsDiscussed: str(v.requirementsDiscussed),
    nextAction: str(v.nextAction),
    pendingTasks: str(v.pendingTasks),
    supportRequired: str(v.supportRequired),
    responsiblePerson: str(v.responsiblePerson),
    targetCompletionDate: fmtDate(v.targetCompletionDate as Date),
    brochuresGiven: fmtBool(v.brochuresGiven as boolean),
    sampleKitGiven: fmtBool(v.sampleKitGiven as boolean),
    priceListShared: fmtBool(v.priceListShared as boolean),
    casePortfolioShared: fmtBool(v.casePortfolioShared as boolean),
    scannerDemoDone: fmtBool(v.scannerDemoDone as boolean),
    otherMaterialShared: str(v.otherMaterialShared),
    lastCaseReceivedDate: fmtDate(v.lastCaseReceivedDate as Date),
    totalCasesSubmittedThisVisit: fmtNum(v.totalCasesSubmittedThisVisit as number),
    prescriptionCasePhotos: fmtArr(v.prescriptionCasePhotos as string[]),
    remarksBySalesManager: str(v.remarksBySalesManager),
    doctorSatisfactionRating: fmtNum(v.doctorSatisfactionRating as number),
    createdAt: fmtDateTime(v.createdAt as Date),
    updatedAt: fmtDateTime(v.updatedAt as Date),
  };
}

function buildDoctorMatch(
  period: ReportPeriod,
  filters: ReportFilters = {}
): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.doctorId) match._id = new mongoose.Types.ObjectId(filters.doctorId);
  if (filters.salesPersonId) match.assignedRep = new mongoose.Types.ObjectId(filters.salesPersonId);
  if (filters.city) match.city = filters.city;
  if (filters.area) match.area = filters.area;
  if (!filters.doctorId && !filters.salesPersonId && !filters.city && !filters.area) {
    match.createdAt = { $gte: period.start, $lte: period.end };
  }
  return match;
}

async function applyLocationFilter(match: Record<string, unknown>, filters: ReportFilters) {
  if (!filters.city && !filters.area) return;
  const doctorQuery: Record<string, string> = {};
  if (filters.city) doctorQuery.city = filters.city;
  if (filters.area) doctorQuery.area = filters.area;
  const ids = await Doctor.find(doctorQuery).distinct('_id');
  if (filters.doctorId) {
    const allowed = ids.some((id) => String(id) === filters.doctorId);
    match.doctor = allowed ? new mongoose.Types.ObjectId(filters.doctorId) : { $in: [] };
    return;
  }
  match.doctor = { $in: ids };
}

function buildVisitMatch(
  period: ReportPeriod,
  filters: ReportFilters = {}
): Record<string, unknown> {
  const match: Record<string, unknown> = {
    visitDate: { $gte: period.start, $lte: period.end },
  };
  if (filters.doctorId) {
    match.doctor = new mongoose.Types.ObjectId(filters.doctorId);
  }
  if (filters.salesPersonId) {
    match.salesPerson = new mongoose.Types.ObjectId(filters.salesPersonId);
  }
  return match;
}

async function resolveFilterLabels(
  filters: ReportFilters
): Promise<ReportFilterLabels> {
  const labels: ReportFilterLabels = {};
  if (filters.doctorId) {
    const doc = await Doctor.findById(filters.doctorId).select('name').lean();
    if (doc) labels.doctorName = doc.name;
  }
  if (filters.salesPersonId) {
    const rep = await User.findById(filters.salesPersonId).select('name').lean();
    if (rep) labels.salesPersonName = rep.name;
  }
  if (filters.city) labels.city = filters.city;
  if (filters.area) labels.area = filters.area;
  return labels;
}

function buildFiltersLabel(labels: ReportFilterLabels): string | undefined {
  const parts: string[] = [];
  if (labels.doctorName) parts.push(`Doctor: ${labels.doctorName}`);
  if (labels.salesPersonName) parts.push(`Sales Rep: ${labels.salesPersonName}`);
  if (labels.city) parts.push(`City: ${labels.city}`);
  if (labels.area) parts.push(`Area: ${labels.area}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export async function fetchReportData(
  range: ReportRange,
  generatedBy: string,
  from?: string,
  to?: string,
  filters: ReportFilters = {}
): Promise<ReportData> {
  await connectDB();
  const period = resolveReportPeriod(range, from, to);
  const visitMatch = buildVisitMatch(period, filters);
  await applyLocationFilter(visitMatch, filters);
  const filterLabels = await resolveFilterLabels(filters);
  const filtersLabel = buildFiltersLabel(filterLabels);

  const [visitsRaw, statusAgg, typeAgg, repAgg] = await Promise.all([
    Visit.find(visitMatch)
      .populate('doctor')
      .populate('salesPerson', 'name email slug')
      .sort({ visitDate: -1 })
      .lean(),
    Visit.aggregate([
      { $match: visitMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Visit.aggregate([
      { $match: visitMatch },
      { $group: { _id: '$visitType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Visit.aggregate([
      { $match: visitMatch },
      {
        $group: {
          _id: '$salesPerson',
          visits: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['Pending', 'Overdue']] }, 1, 0] },
          },
        },
      },
      { $sort: { visits: -1 } },
    ]),
  ]);

  const newDoctorsQuery: Record<string, unknown> = { createdAt: { $gte: period.start, $lte: period.end } };
  if (filters.doctorId) newDoctorsQuery._id = new mongoose.Types.ObjectId(filters.doctorId);
  if (filters.city) newDoctorsQuery.city = filters.city;
  if (filters.area) newDoctorsQuery.area = filters.area;
  const newDoctors = filters.salesPersonId
    ? 0
    : await Doctor.countDocuments(newDoctorsQuery);

  const visitsResolved = await resolveSalesPersonsForVisits(visitsRaw);

  const doctorIdSet = new Set<string>();
  if (filters.doctorId) doctorIdSet.add(filters.doctorId);
  for (const v of visitsResolved) {
    const id = getDoctorIdFromVisit(v);
    if (id) doctorIdSet.add(id);
  }

  const doctorFilterMatch = buildDoctorMatch(period, filters);
  const doctorsFromFilter = await Doctor.find(doctorFilterMatch).select('_id').lean();
  for (const d of doctorsFromFilter) doctorIdSet.add(String(d._id));

  const doctorsRaw = doctorIdSet.size > 0
    ? await Doctor.find({ _id: { $in: [...doctorIdSet] } }).sort({ name: 1 }).lean()
    : [];
  const doctorsResolved = await resolveAssignedRepsForDoctors(doctorsRaw);
  const doctors = doctorsResolved.map((d) =>
    mapDoctorRow(d as unknown as Record<string, unknown> & { name: string; slug: string })
  );
  const visitsFull = visitsResolved.map((v) =>
    mapVisitFullRow(v as unknown as Record<string, unknown>)
  );

  const statusMap = new Map(
    statusAgg.map((s: { _id: string; count: number }) => [s._id, s.count])
  );

  const ratings = visitsResolved
    .map((v) => v.doctorSatisfactionRating)
    .filter((r): r is number => typeof r === 'number');
  const avgSatisfaction =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const uniqueDoctors = new Set(
    visitsResolved.map((v) => {
      const doc = v.doctor as { _id?: unknown } | unknown;
      if (doc && typeof doc === 'object' && '_id' in (doc as object)) {
        return String((doc as { _id: unknown })._id);
      }
      return String(doc);
    })
  );

  const visits: ReportVisitRow[] = visitsResolved.map((v) => ({
    visitDate: format(new Date(v.visitDate), 'yyyy-MM-dd'),
    doctorName: (v.doctor as { name?: string })?.name || '—',
    doctorCity: (v.doctor as { city?: string })?.city || '—',
    doctorArea: (v.doctor as { area?: string })?.area || '—',
    doctorSpeciality: (v.doctor as { speciality?: string })?.speciality || '—',
    visitType: v.visitType,
    salesPerson: (v.salesPerson as { name?: string })?.name || '—',
    status: v.status,
    followUpDate: v.followUpDate ? format(new Date(v.followUpDate), 'yyyy-MM-dd') : '—',
    meetingMode: v.meetingMode || '—',
    rating: v.doctorSatisfactionRating ? String(v.doctorSatisfactionRating) : '—',
  }));

  const repIds: string[] = repAgg.map((r: { _id: unknown }) => String(r._id));
  const repUsers = await User.find({ _id: { $in: repIds } }).select('name').lean();
  const repNameMap = new Map(
    repUsers.map((u) => [String(u._id), u.name])
  );

  const repPerformance: RepPerformance[] = repAgg.map(
    (r: { _id: unknown; visits: number; completed: number; pending: number }) => ({
      name: repNameMap.get(String(r._id)) || 'Unknown Rep',
      visits: r.visits,
      completed: r.completed,
      pending: r.pending,
    })
  );

  return {
    title: RANGE_TITLES[range],
    periodLabel: period.label,
    filtersLabel,
    generatedAt: format(new Date(), 'MMMM d, yyyy · h:mm a'),
    generatedBy,
    kpis: {
      totalVisits: visits.length,
      completedVisits: statusMap.get('Completed') || 0,
      pendingVisits: statusMap.get('Pending') || 0,
      overdueVisits: statusMap.get('Overdue') || 0,
      cancelledVisits: statusMap.get('Cancelled') || 0,
      newDoctors,
      uniqueDoctorsVisited: uniqueDoctors.size,
      avgSatisfaction,
    },
    visits,
    doctors,
    visitsFull,
    repPerformance,
    statusBreakdown: statusAgg.map((s: { _id: string; count: number }) => ({
      status: s._id,
      count: s.count,
    })),
    visitTypeBreakdown: typeAgg.map((t: { _id: string; count: number }) => ({
      type: t._id || 'Unknown',
      count: t.count,
    })),
  };
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const DOCTOR_CSV_COLUMNS: { key: keyof ReportDoctorRow; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'previousSlugs', label: 'Previous Slugs' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'speciality', label: 'Speciality' },
  { key: 'clinicName', label: 'Clinic Name' },
  { key: 'clinicAddress', label: 'Clinic Address' },
  { key: 'city', label: 'City' },
  { key: 'area', label: 'Area' },
  { key: 'state', label: 'State' },
  { key: 'assignedRep', label: 'Assigned Rep' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'potentialRating', label: 'Potential Rating' },
  { key: 'monthlyAlignerCases', label: 'Monthly Aligner Cases' },
  { key: 'lifetimeCasesSubmitted', label: 'Lifetime Cases Submitted' },
  { key: 'currentAlignerBrands', label: 'Current Aligner Brands' },
  { key: 'otherOrthoSystems', label: 'Other Ortho Systems' },
  { key: 'decisionMaker', label: 'Decision Maker' },
  { key: 'probabilityOfConversion', label: 'Probability Of Conversion (%)' },
  { key: 'expectedFirstCaseDate', label: 'Expected First Case Date' },
  { key: 'expectedMonthlyCaseVolume', label: 'Expected Monthly Case Volume' },
  { key: 'estimatedMonthlyRevenuePotential', label: 'Est. Monthly Revenue Potential' },
  { key: 'currentBrand', label: 'Current Brand' },
  { key: 'currentPricing', label: 'Current Pricing' },
  { key: 'doctorLikes', label: 'Doctor Likes' },
  { key: 'doctorPainPoints', label: 'Doctor Pain Points' },
  { key: 'reasonForNotSwitching', label: 'Reason For Not Switching' },
  { key: 'reasonForNotSwitchingDetails', label: 'Reason For Not Switching Details' },
  { key: 'doctorBirthday', label: 'Doctor Birthday' },
  { key: 'clinicAnniversary', label: 'Clinic Anniversary' },
  { key: 'preferredCommunication', label: 'Preferred Communication' },
  { key: 'bestTimeToVisit', label: 'Best Time To Visit' },
  { key: 'decisionStage', label: 'Decision Stage' },
  { key: 'doctorPhotoConsent', label: 'Photo Consent' },
  { key: 'clinicPhotograph', label: 'Clinic Photograph URL' },
  { key: 'doctorPhotograph', label: 'Doctor Photograph URL' },
  { key: 'visitingCard', label: 'Visiting Card URL' },
  { key: 'documents', label: 'Documents' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

const VISIT_FULL_CSV_COLUMNS: { key: keyof ReportVisitFullRow; label: string }[] = [
  { key: 'slug', label: 'Visit Slug' },
  { key: 'visitDate', label: 'Visit Date' },
  { key: 'visitType', label: 'Visit Type' },
  { key: 'meetingMode', label: 'Meeting Mode' },
  { key: 'status', label: 'Status' },
  { key: 'followUpDate', label: 'Follow-up Date' },
  { key: 'statusUpdatedAt', label: 'Status Updated At' },
  { key: 'doctorName', label: 'Doctor Name' },
  { key: 'doctorSlug', label: 'Doctor Slug' },
  { key: 'doctorCity', label: 'Doctor City' },
  { key: 'doctorArea', label: 'Doctor Area' },
  { key: 'salesPerson', label: 'Sales Person' },
  { key: 'salesPersonEmail', label: 'Sales Person Email' },
  { key: 'meetingSummary', label: 'Meeting Summary' },
  { key: 'keyDiscussionPoints', label: 'Key Discussion Points' },
  { key: 'doctorFeedback', label: 'Doctor Feedback' },
  { key: 'objectionsRaised', label: 'Objections Raised' },
  { key: 'requirementsDiscussed', label: 'Requirements Discussed' },
  { key: 'nextAction', label: 'Next Action' },
  { key: 'pendingTasks', label: 'Pending Tasks' },
  { key: 'supportRequired', label: 'Support Required' },
  { key: 'responsiblePerson', label: 'Responsible Person' },
  { key: 'targetCompletionDate', label: 'Target Completion Date' },
  { key: 'brochuresGiven', label: 'Brochures Given' },
  { key: 'sampleKitGiven', label: 'Sample Kit Given' },
  { key: 'priceListShared', label: 'Price List Shared' },
  { key: 'casePortfolioShared', label: 'Case Portfolio Shared' },
  { key: 'scannerDemoDone', label: 'Scanner Demo Done' },
  { key: 'otherMaterialShared', label: 'Other Material Shared' },
  { key: 'lastCaseReceivedDate', label: 'Last Case Received Date' },
  { key: 'totalCasesSubmittedThisVisit', label: 'Cases Submitted This Visit' },
  { key: 'prescriptionCasePhotos', label: 'Prescription Case Photos' },
  { key: 'remarksBySalesManager', label: 'Remarks By Sales Manager' },
  { key: 'doctorSatisfactionRating', label: 'Doctor Satisfaction Rating' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

function rowToCsv<K extends string>(
  row: Record<K, string>,
  columns: { key: K; label: string }[]
): string {
  return columns.map((col) => escapeCsv(row[col.key] ?? '')).join(',');
}

export function generateReportCsv(data: ReportData): string {
  const lines: string[] = [
    'DSR CMS — Sales Report',
    `Report,${escapeCsv(data.title)}`,
    `Period,${escapeCsv(data.periodLabel)}`,
    ...(data.filtersLabel ? [`Filters,${escapeCsv(data.filtersLabel)}`] : []),
    `Generated,${escapeCsv(data.generatedAt)}`,
    `Generated By,${escapeCsv(data.generatedBy)}`,
    '',
    'KPI Summary',
    'Metric,Value',
    `Total Visits,${data.kpis.totalVisits}`,
    `Completed,${data.kpis.completedVisits}`,
    `Pending,${data.kpis.pendingVisits}`,
    `Overdue,${data.kpis.overdueVisits}`,
    `Cancelled,${data.kpis.cancelledVisits}`,
    `New Doctors,${data.kpis.newDoctors}`,
    `Unique Doctors Visited,${data.kpis.uniqueDoctorsVisited}`,
    `Avg Satisfaction,${data.kpis.avgSatisfaction ?? 'N/A'}`,
    '',
    'Rep Performance',
    'Sales Rep,Total Visits,Completed,Pending',
    ...data.repPerformance.map(
      (r) => `${escapeCsv(r.name)},${r.visits},${r.completed},${r.pending}`
    ),
    '',
    'Visit Summary',
    'Date,Doctor,City,Area,Speciality,Type,Sales Rep,Status,Follow-up,Mode,Rating',
    ...data.visits.map((v) =>
      [
        v.visitDate,
        escapeCsv(v.doctorName),
        escapeCsv(v.doctorCity),
        escapeCsv(v.doctorArea),
        escapeCsv(v.doctorSpeciality),
        escapeCsv(v.visitType),
        escapeCsv(v.salesPerson),
        v.status,
        v.followUpDate,
        escapeCsv(v.meetingMode),
        v.rating,
      ].join(',')
    ),
    '',
    `Doctor Profiles (${data.doctors.length} records)`,
    DOCTOR_CSV_COLUMNS.map((c) => escapeCsv(c.label)).join(','),
    ...data.doctors.map((d) => rowToCsv(d, DOCTOR_CSV_COLUMNS)),
    '',
    `Full Visit Details (${data.visitsFull.length} records)`,
    VISIT_FULL_CSV_COLUMNS.map((c) => escapeCsv(c.label)).join(','),
    ...data.visitsFull.map((v) => rowToCsv(v, VISIT_FULL_CSV_COLUMNS)),
  ];
  return '\uFEFF' + lines.join('\n');
}

function statusColor(status: string): string {
  switch (status) {
    case 'Completed':
      return '#15803d';
    case 'Pending':
      return '#b45309';
    case 'Overdue':
      return '#dc2626';
    case 'Cancelled':
      return '#6b7280';
    default:
      return '#374151';
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'Completed':
      return '#dcfce7';
    case 'Pending':
      return '#fef3c7';
    case 'Overdue':
      return '#fee2e2';
    case 'Cancelled':
      return '#f3f4f6';
    default:
      return '#f9fafb';
  }
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderWideTable<K extends string>(
  columns: { key: K; label: string }[],
  rows: Record<K, string>[]
): string {
  const header = columns.map((c) => `<th>${htmlEscape(c.label)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = row[c.key] ?? '';
          const display = val.length > 200 ? `${val.slice(0, 200)}…` : val;
          return `<td title="${htmlEscape(val)}">${htmlEscape(display) || '—'}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<div class="table-scroll"><table class="wide-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function generateReportHtml(data: ReportData): string {
  const kpiCards = [
    { label: 'Total Visits', value: data.kpis.totalVisits, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Completed', value: data.kpis.completedVisits, color: '#15803d', bg: '#dcfce7' },
    { label: 'Pending', value: data.kpis.pendingVisits, color: '#b45309', bg: '#fef3c7' },
    { label: 'Overdue', value: data.kpis.overdueVisits, color: '#dc2626', bg: '#fee2e2' },
    { label: 'New Doctors', value: data.kpis.newDoctors, color: '#1d4ed8', bg: '#dbeafe' },
    {
      label: 'Doctors Visited',
      value: data.kpis.uniqueDoctorsVisited,
      color: '#7c3aed',
      bg: '#ede9fe',
    },
  ];

  const repRows = data.repPerformance
    .map(
      (r, i) => `
      <tr>
        <td><span class="rank">${i + 1}</span> ${r.name}</td>
        <td class="num">${r.visits}</td>
        <td class="num completed">${r.completed}</td>
        <td class="num pending">${r.pending}</td>
      </tr>`
    )
    .join('');

  const visitRows = data.visits
    .map(
      (v) => `
      <tr>
        <td>${v.visitDate}</td>
        <td><strong>${v.doctorName}</strong><br><span class="muted">${v.doctorArea && v.doctorArea !== '—' ? v.doctorArea : v.doctorCity} · ${v.doctorSpeciality}</span></td>
        <td>${v.visitType}</td>
        <td>${v.salesPerson}</td>
        <td><span class="badge" style="color:${statusColor(v.status)};background:${statusBg(v.status)}">${v.status}</span></td>
        <td>${v.followUpDate}</td>
        <td class="num">${v.rating}</td>
      </tr>`
    )
    .join('');

  const statusBars = data.statusBreakdown
    .map((s) => {
      const pct =
        data.kpis.totalVisits > 0
          ? Math.round((s.count / data.kpis.totalVisits) * 100)
          : 0;
      return `
      <div class="bar-row">
        <div class="bar-label">${s.status}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${statusColor(s.status)}"></div></div>
        <div class="bar-value">${s.count} (${pct}%)</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.title} — DSR CMS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f7f9fc; color: #111827; line-height: 1.5; }
    .page { max-width: 1100px; margin: 0 auto; padding: 40px 32px; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%); color: white; border-radius: 20px; padding: 36px 40px; margin-bottom: 28px; box-shadow: 0 8px 32px rgba(79,70,229,0.25); }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
    .brand { font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85; margin-bottom: 8px; }
    .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
    .period { font-size: 16px; opacity: 0.9; }
    .meta { text-align: right; font-size: 13px; opacity: 0.85; }
    .meta div { margin-bottom: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .kpi { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e5e9f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; margin-bottom: 8px; }
    .kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
    .section { background: white; border-radius: 16px; border: 1px solid #e5e9f0; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #111827; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e9f0; }
    td { padding: 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .num { text-align: center; font-weight: 600; }
    .completed { color: #15803d; }
    .pending { color: #b45309; }
    .rank { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 700; margin-right: 6px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .muted { font-size: 11px; color: #9ca3af; }
    .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .bar-label { width: 90px; font-size: 13px; font-weight: 600; }
    .bar-track { flex: 1; height: 10px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; transition: width 0.3s; }
    .bar-value { width: 80px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600; }
    .table-scroll { overflow-x: auto; margin: 0 -4px; }
    .wide-table { min-width: 1200px; font-size: 11px; }
    .wide-table th { white-space: nowrap; }
    .wide-table td { max-width: 220px; word-break: break-word; }
    .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 16px rgba(79,70,229,0.4); }
    .print-btn:hover { background: #4338ca; }
    @media print {
      body { background: white; }
      .print-btn { display: none; }
      .page { padding: 20px; }
      .header { box-shadow: none; }
      .section, .kpi { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="brand">DSR CMS · Daily Sales Report</div>
          <div class="title">${data.title}</div>
          <div class="period">${data.periodLabel}</div>
          ${data.filtersLabel ? `<div class="period" style="margin-top:6px;font-size:14px;">${data.filtersLabel}</div>` : ''}
        </div>
        <div class="meta">
          <div>Generated ${data.generatedAt}</div>
          <div>By ${data.generatedBy}</div>
          ${data.kpis.avgSatisfaction ? `<div>Avg Rating: ${data.kpis.avgSatisfaction} / 5</div>` : ''}
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      ${kpiCards
        .map(
          (k) => `
        <div class="kpi">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value" style="color:${k.color}">${k.value}</div>
        </div>`
        )
        .join('')}
    </div>

    <div class="two-col">
      <div class="section">
        <div class="section-title">🏆 Top Performers</div>
        ${
          data.repPerformance.length > 0
            ? `<table><thead><tr><th>Sales Rep</th><th>Visits</th><th>Done</th><th>Open</th></tr></thead><tbody>${repRows}</tbody></table>`
            : '<p class="muted">No visit data for this period.</p>'
        }
      </div>
      <div class="section">
        <div class="section-title">📊 Status Breakdown</div>
        ${data.statusBreakdown.length > 0 ? statusBars : '<p class="muted">No visits in this period.</p>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">📅 Visit Log (${data.visits.length} records)</div>
      ${
        data.visits.length > 0
          ? `<table><thead><tr><th>Date</th><th>Doctor</th><th>Type</th><th>Rep</th><th>Status</th><th>Follow-up</th><th>Rating</th></tr></thead><tbody>${visitRows}</tbody></table>`
          : '<p class="muted">No visits recorded for this period.</p>'
      }
    </div>

    <div class="section">
      <div class="section-title">👨‍⚕️ Doctor Profiles (${data.doctors.length} records)</div>
      ${
        data.doctors.length > 0
          ? renderWideTable(
              DOCTOR_CSV_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
              data.doctors
            )
          : '<p class="muted">No doctor profiles for this report scope.</p>'
      }
    </div>

    <div class="section">
      <div class="section-title">📋 Full Visit Details (${data.visitsFull.length} records)</div>
      ${
        data.visitsFull.length > 0
          ? renderWideTable(
              VISIT_FULL_CSV_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
              data.visitsFull
            )
          : '<p class="muted">No visit details for this period.</p>'
      }
    </div>

    <div class="footer">DSR CMS · Confidential · Generated automatically</div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Save as PDF</button>
</body>
</html>`;
}
