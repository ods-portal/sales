import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import Visit from '@/models/Visit';
import Doctor from '@/models/Doctor';
import mongoose from 'mongoose';

export type RepInfo = { name: string; email?: string; slug?: string; _id?: unknown };

const OBJECT_ID_FIELDS = new Set(['assignedRep', 'salesPerson', 'doctor', '_id']);

/** Cast string ObjectIds for raw aggregation $match (Mongoose find/count auto-cast; aggregate does not). */
export function prepareMongoMatchFilter(
  filter: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(value)) {
      result.$or = value.map((clause) =>
        prepareMongoMatchFilter(clause as Record<string, unknown>)
      );
      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      '$in' in (value as object)
    ) {
      const inValues = (value as { $in: unknown[] }).$in;
      result[key] = {
        $in: inValues.map((id) =>
          typeof id === 'string' && mongoose.isValidObjectId(id)
            ? new mongoose.Types.ObjectId(id)
            : id
        ),
      };
      continue;
    }

    if (
      OBJECT_ID_FIELDS.has(key) &&
      typeof value === 'string' &&
      mongoose.isValidObjectId(value)
    ) {
      result[key] = new mongoose.Types.ObjectId(value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

async function resolveRepByName(actorName: string): Promise<RepInfo> {
  const rep = await User.findOne({ name: actorName }).select('name email slug').lean();
  return rep ?? { name: actorName, email: '', slug: '' };
}

async function resolveRepFromVisitAudit(doctorId: string): Promise<RepInfo | null> {
  const visit = await Visit.findOne({ doctor: doctorId })
    .sort({ visitDate: -1 })
    .select('_id')
    .lean();
  if (!visit) return null;

  const log = await AuditLog.findOne({
    entity: 'Visit',
    entityId: visit._id.toString(),
    action: 'CREATE',
  }).lean();
  if (!log?.actorName) return null;

  return resolveRepByName(log.actorName);
}

export async function resolveAssignedRep(
  assignedRepId: string | undefined | null,
  doctorId?: string
): Promise<RepInfo | null> {
  if (!assignedRepId) return null;

  const rep = await User.findById(assignedRepId).select('name email slug').lean();
  if (rep) return rep;

  if (doctorId) {
    return resolveRepFromVisitAudit(doctorId);
  }
  return null;
}

export async function resolveAssignedRepsForDoctors<
  T extends { _id: { toString(): string } | string; assignedRep?: unknown },
>(doctors: T[]): Promise<(T & { assignedRep: RepInfo | null })[]> {
  const repIds = [
    ...new Set(
      doctors
        .map((d) => d.assignedRep?.toString())
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const reps = await User.find({ _id: { $in: repIds } })
    .select('name email slug')
    .lean();
  const repMap = new Map(reps.map((r) => [r._id.toString(), r]));

  const orphanedDoctorIds = doctors
    .filter((d) => {
      const id = d.assignedRep?.toString();
      return id && !repMap.has(id);
    })
    .map((d) => (typeof d._id === 'object' ? d._id.toString() : String(d._id)));

  const doctorRepFallback = new Map<string, RepInfo>();

  if (orphanedDoctorIds.length > 0) {
    const visits = await Visit.find({ doctor: { $in: orphanedDoctorIds } })
      .select('_id doctor')
      .sort({ visitDate: -1 })
      .lean();

    const visitIds = visits.map((v) => v._id.toString());
    const logs = await AuditLog.find({
      entity: 'Visit',
      entityId: { $in: visitIds },
      action: 'CREATE',
    }).lean();

    const logByVisitId = new Map(logs.map((l) => [l.entityId, l.actorName]));
    const actorNames = new Set<string>();

    for (const visit of visits) {
      const docId = visit.doctor.toString();
      if (doctorRepFallback.has(docId)) continue;
      const actorName = logByVisitId.get(visit._id.toString());
      if (actorName) {
        actorNames.add(actorName);
        doctorRepFallback.set(docId, { name: actorName, email: '', slug: '' });
      }
    }

    if (actorNames.size > 0) {
      const usersByName = await User.find({ name: { $in: [...actorNames] } })
        .select('name email slug')
        .lean();
      const userByName = new Map(usersByName.map((u) => [u.name, u]));
      for (const [docId, fallback] of doctorRepFallback) {
        const user = userByName.get(fallback.name);
        if (user) doctorRepFallback.set(docId, user);
      }
    }
  }

  return doctors.map((d) => {
    const repId = d.assignedRep?.toString();
    const docId = typeof d._id === 'object' ? d._id.toString() : String(d._id);
    let assignedRep: RepInfo | null = repId ? repMap.get(repId) ?? null : null;
    if (!assignedRep && repId) {
      assignedRep = doctorRepFallback.get(docId) ?? null;
    }
    return { ...d, assignedRep };
  });
}

export async function resolveSalesPersonFromAudit(
  visitId: string,
  actorName?: string | null
): Promise<RepInfo | null> {
  const name =
    actorName ??
    (
      await AuditLog.findOne({
        entity: 'Visit',
        entityId: visitId,
        action: 'CREATE',
      }).lean()
    )?.actorName;

  if (!name) return null;
  return resolveRepByName(name);
}

export async function resolveSalesPersonsForVisits<
  T extends { _id: { toString(): string } | string; salesPerson?: unknown },
>(visits: T[]): Promise<T[]> {
  const unresolved = visits.filter((v) => !v.salesPerson);
  if (unresolved.length === 0) return visits;

  const visitIds = unresolved.map((v) =>
    typeof v._id === 'object' ? v._id.toString() : String(v._id)
  );

  const logs = await AuditLog.find({
    entity: 'Visit',
    entityId: { $in: visitIds },
    action: 'CREATE',
  }).lean();

  const logByEntityId = new Map(logs.map((l) => [l.entityId, l.actorName]));
  const actorNames = [...new Set(logs.map((l) => l.actorName).filter(Boolean))] as string[];

  const usersByName =
    actorNames.length > 0
      ? await User.find({ name: { $in: actorNames } }).select('name email slug').lean()
      : [];
  const userByName = new Map(usersByName.map((u) => [u.name, u]));

  return visits.map((v) => {
    if (v.salesPerson) return v;
    const id = typeof v._id === 'object' ? v._id.toString() : String(v._id);
    const actorName = logByEntityId.get(id);
    if (!actorName) return { ...v, salesPerson: null };
    const rep = userByName.get(actorName) ?? { name: actorName, email: '', slug: '' };
    return { ...v, salesPerson: rep };
  });
}

async function getOrphanedRefIds(
  docs: Array<{ assignedRep?: unknown; salesPerson?: unknown }>,
  refField: 'assignedRep' | 'salesPerson'
): Promise<string[]> {
  const refIds = [
    ...new Set(
      docs.map((d) => {
        const value = refField === 'assignedRep' ? d.assignedRep : d.salesPerson;
        return value?.toString();
      }).filter((id): id is string => Boolean(id))
    ),
  ];
  if (refIds.length === 0) return [];

  const existingUsers = await User.find({ _id: { $in: refIds } }).select('_id').lean();
  const existingIds = new Set(existingUsers.map((u) => u._id.toString()));

  return refIds.filter((id) => !existingIds.has(id));
}

async function getOrphanedVisitIdsForRepName(repName: string): Promise<string[]> {
  const visits = await Visit.find({}).select('_id salesPerson').lean();
  const orphanedRepIds = await getOrphanedRefIds(visits, 'salesPerson');
  if (orphanedRepIds.length === 0) return [];

  const orphanedVisits = visits.filter((v) => {
    const repId = v.salesPerson?.toString();
    return repId && orphanedRepIds.includes(repId);
  });

  const orphanedVisitIds = orphanedVisits.map((v) => v._id.toString());
  const logs = await AuditLog.find({
    entity: 'Visit',
    entityId: { $in: orphanedVisitIds },
    action: 'CREATE',
    actorName: repName,
  })
    .select('entityId')
    .lean();

  return logs.map((l) => l.entityId);
}

async function getOrphanedDoctorIdsForRepName(repName: string): Promise<string[]> {
  const doctors = await Doctor.find({}).select('_id assignedRep').lean();
  const orphanedRepIds = await getOrphanedRefIds(doctors, 'assignedRep');
  if (orphanedRepIds.length === 0) return [];

  const orphanedDoctors = doctors.filter((d) => {
    const repId = d.assignedRep?.toString();
    return repId && orphanedRepIds.includes(repId);
  });
  const orphanedDoctorIds = orphanedDoctors.map((d) => d._id.toString());

  const visits = await Visit.find({ doctor: { $in: orphanedDoctorIds } })
    .select('_id doctor')
    .lean();
  const visitIds = visits.map((v) => v._id.toString());
  const visitToDoctor = new Map(visits.map((v) => [v._id.toString(), v.doctor.toString()]));

  const logs = await AuditLog.find({
    entity: 'Visit',
    entityId: { $in: visitIds },
    action: 'CREATE',
    actorName: repName,
  })
    .select('entityId')
    .lean();

  const doctorIds = new Set<string>();
  for (const log of logs) {
    const docId = visitToDoctor.get(log.entityId);
    if (docId) doctorIds.add(docId);
  }
  return [...doctorIds];
}

export async function buildSalesPersonVisitFilter(
  userId: string,
  userName: string
): Promise<Record<string, unknown>> {
  const orphanedVisitIds = await getOrphanedVisitIdsForRepName(userName);
  if (orphanedVisitIds.length === 0) {
    return { salesPerson: userId };
  }
  return {
    $or: [{ salesPerson: userId }, { _id: { $in: orphanedVisitIds } }],
  };
}

export async function buildSalesPersonDoctorFilter(
  userId: string,
  userName: string
): Promise<Record<string, unknown>> {
  const orphanedDoctorIds = await getOrphanedDoctorIdsForRepName(userName);
  if (orphanedDoctorIds.length === 0) {
    return { assignedRep: userId };
  }
  return {
    $or: [{ assignedRep: userId }, { _id: { $in: orphanedDoctorIds } }],
  };
}

export async function isVisitOwnedBySalesPerson(
  visit: { _id: { toString(): string }; salesPerson?: unknown },
  userId: string,
  userName: string
): Promise<boolean> {
  const repId = visit.salesPerson?.toString();
  if (repId === userId) return true;
  if (!repId) return false;

  const rep = await User.findById(repId).select('_id').lean();
  if (rep) return false;

  const log = await AuditLog.findOne({
    entity: 'Visit',
    entityId: visit._id.toString(),
    action: 'CREATE',
  }).lean();
  return log?.actorName === userName;
}
