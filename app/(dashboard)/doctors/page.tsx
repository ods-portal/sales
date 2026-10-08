'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { areaOptionsForCity, formatDate, daysSince } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  D: 'badge badge-gray',
};

interface Doctor {
  _id: string;
  name: string;
  slug: string;
  speciality: string;
  category: string;
  status: string;
  city: string;
  area?: string;
  state?: string;
  phone?: string;
  email?: string;
  clinicName?: string;
  monthlyAlignerCases?: number;
  potentialRating?: string;
  assignedRep: { name: string; slug: string };
  createdAt: string;
  lastVisitDate?: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const LIMITS = [10, 20, 50, 100];

export default function DoctorsPage() {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ totalCount: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState('-createdAt');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [currentUser, setCurrentUser] = useState<{ role: string, hasWriteAccess: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); });
    fetch('/api/dropdowns').then(r => r.json()).then(data => {
      if (data.grouped) {
        const formatted: Record<string, string[]> = {};
        Object.keys(data.grouped).forEach(key => {
          formatted[key] = data.grouped[key].filter((d: { isActive: boolean; label: string }) => d.isActive).map((d: { isActive: boolean; label: string }) => d.label);
        });
        setDropdowns(formatted);
      }
    });
  }, []);

  const isSales = currentUser?.role === 'salesPerson';
  const canEdit = currentUser?.role === 'superAdmin' || (currentUser?.role === 'admin' && currentUser?.hasWriteAccess);
  const colCount = isSales ? 8 : 9;

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort,
      ...(search && { search }),
      ...(category && { category }),
      ...(status && { status }),
      ...(city && { city }),
      ...(area && { area }),
    });
    const res = await fetch(`/api/doctors?${params}`);
    const data = await res.json();
    setDoctors(data.data || []);
    setMeta({ totalCount: data.totalCount, totalPages: data.totalPages, currentPage: data.currentPage });
    setLoading(false);
  }, [page, limit, sort, search, category, status, city, area]);

  useEffect(() => {
    const timer = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  const handleSort = (field: string) => {
    setSort((prev) => (prev === field ? `-${field}` : field));
    setPage(1);
  };

  const sortArrow = (field: string) => {
    if (sort === field) return ' ↑';
    if (sort === `-${field}`) return ' ↓';
    return '';
  };

  const handleDelete = async (slug: string, name: string) => {
    const ok = await confirm({ title: 'Delete Doctor', message: `Are you sure you want to delete Dr. ${name}? This action cannot be undone.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    setDeleting(slug);
    const res = await fetch(`/api/doctors/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      addToast(`Dr. ${name} deleted successfully`, 'success');
      fetchDoctors();
    } else {
      addToast('Failed to delete doctor', 'error');
    }
    setDeleting(null);
  };

  const clearFilters = () => {
    setSearch(''); setCategory(''); setStatus(''); setCity(''); setArea(''); setPage(1);
  };

  const hasFilters = search || category || status || city || area;
  const areaOptions = areaOptionsForCity(city);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Management</h1>
          <p className="page-subtitle">{meta.totalCount} total doctors</p>
        </div>
        <Link href="/doctors/new" className="btn btn-primary">+ Add New Doctor</Link>
      </div>

      {/* Filters */}
      <div className="card card-sm mb-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-[1_1_220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">🔍</span>
          <input
            type="text"
            className="input pl-9"
            placeholder="Search doctors, city, speciality..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select className="input flex-[0_0_140px]" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {(dropdowns['doctorCategory'] || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="input flex-[0_0_140px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {(dropdowns['doctorStatus'] || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="input flex-[0_0_160px]"
          value={city}
          onChange={(e) => { setCity(e.target.value); setArea(''); setPage(1); }}
        >
          <option value="">All Cities</option>
          {(dropdowns['city'] || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>

        {city && (
          <select className="input flex-[0_0_180px]" value={area} onChange={(e) => { setArea(e.target.value); setPage(1); }}>
            <option value="">All Areas</option>
            {areaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        )}

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>Name{sortArrow('name')}</th>
                <th onClick={() => handleSort('speciality')}>Speciality{sortArrow('speciality')}</th>
                <th onClick={() => handleSort('category')}>Category{sortArrow('category')}</th>
                <th onClick={() => handleSort('city')}>City{sortArrow('city')}</th>
                {!isSales && <th>Assigned Rep</th>}
                <th onClick={() => handleSort('monthlyAlignerCases')}>Cases/mo{sortArrow('monthlyAlignerCases')}</th>
                <th>Last Follow Up</th>
                <th onClick={() => handleSort('createdAt')}>Added{sortArrow('createdAt')}</th>
                <th className="w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: limit > 10 ? 10 : limit }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: colCount }).map((__, j) => (
                        <td key={j}><div className="skeleton h-[14px] rounded" /></td>
                      ))}
                    </tr>
                  ))
                : doctors.length === 0
                ? (
                  <tr>
                    <td colSpan={colCount} className="text-center py-[60px] text-text-muted">
                      <div className="text-[32px] mb-2">🏥</div>
                      <div className="font-semibold">{hasFilters ? 'No doctors match these filters' : 'No doctors added yet'}</div>
                      {!hasFilters && <Link href="/doctors/new" className="btn btn-primary btn-sm mt-3 inline-flex">Add First Doctor</Link>}
                    </td>
                  </tr>
                )
                : doctors.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <Link href={`/doctors/${doc.slug}`} className="font-semibold text-brand no-underline">
                        {doc.name}
                      </Link>
                    </td>
                    <td className="text-text-secondary">{doc.speciality}</td>
                    <td><span className={CAT_BADGE[doc.category]}>{doc.category}</span></td>
                    <td className="text-text-secondary">
                      <div>{doc.city || '—'}</div>
                      {doc.area && <div className="text-xs text-text-muted">{doc.area}</div>}
                    </td>
                    {!isSales && <td className="text-text-secondary text-[13px]">{doc.assignedRep?.name}</td>}
                    <td>{doc.monthlyAlignerCases ?? '—'}</td>
                    <td className="text-[13px] text-text-secondary">
                      {doc.lastVisitDate ? (
                        daysSince(doc.lastVisitDate) === 0 ? 'Today' : `${daysSince(doc.lastVisitDate)} days ago`
                      ) : '—'}
                    </td>
                    <td className="text-text-muted text-xs">{formatDate(doc.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/doctors/${doc.slug}`} className="btn btn-ghost btn-sm" title="View">👁</Link>
                        {canEdit && (
                          <>
                            <Link href={`/doctors/${doc.slug}/edit`} className="btn btn-ghost btn-sm" title="Edit">✏️</Link>
                            <button
                              className="btn btn-ghost btn-sm text-danger"
                              onClick={() => handleDelete(doc.slug, doc.name)}
                              disabled={deleting === doc.slug}
                              title="Delete"
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-3 px-4 border-t border-border flex-wrap gap-3">
          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            Rows per page:
            <select className="input w-[70px] px-2 py-1" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span>Total: {meta.totalCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(1)}>⟪</button>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
              const p = start + i;
              return p <= meta.totalPages ? (
                <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
              ) : null;
            })}
            <button className="btn btn-ghost btn-sm" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            <button className="btn btn-ghost btn-sm" disabled={page === meta.totalPages} onClick={() => setPage(meta.totalPages)}>⟫</button>
          </div>
        </div>
      </div>
    </div>
  );
}
