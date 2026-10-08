'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, X, BarChart3, Download, FileText, CalendarRange } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { areaOptionsForCity } from '@/lib/utils';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

type ExportFormat = 'csv' | 'html';
type ReportRange = 'daily' | 'weekly' | 'monthly' | 'custom';

interface FilterDoctor {
  id: string;
  name: string;
  city: string;
  area?: string;
  speciality: string;
}

interface FilterSalesPerson {
  id: string;
  name: string;
}

interface ReportPreview {
  periodLabel: string;
  filtersLabel?: string;
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
  repPerformance: { name: string; visits: number; completed: number; pending: number }[];
  statusBreakdown: { status: string; count: number }[];
  visitTypeBreakdown: { type: string; count: number }[];
  visits: {
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
  }[];
  doctorCount: number;
}

const REPORT_TYPES: {
  range: ReportRange;
  title: string;
  desc: string;
  badge: string;
}[] = [
  { range: 'daily', title: 'Daily Report', desc: "Today's visit activity and follow-up completions.", badge: 'Today' },
  { range: 'weekly', title: 'Weekly Report', desc: 'Week-over-week trends and team summary.', badge: 'This Week' },
  { range: 'monthly', title: 'Monthly Report', desc: 'Monthly KPIs, conversion rates, and rankings.', badge: 'This Month' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [doctors, setDoctors] = useState<FilterDoctor[]>([]);
  const [salesPersons, setSalesPersons] = useState<FilterSalesPerson[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [salesPersonId, setSalesPersonId] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [appliedDoctorId, setAppliedDoctorId] = useState('');
  const [appliedSalesPersonId, setAppliedSalesPersonId] = useState('');
  const [appliedCity, setAppliedCity] = useState('');
  const [appliedArea, setAppliedArea] = useState('');
  const [previewRange, setPreviewRange] = useState<ReportRange>('monthly');
  const [previewCustomFrom, setPreviewCustomFrom] = useState('');
  const [previewCustomTo, setPreviewCustomTo] = useState('');
  const [appliedCustomFrom, setAppliedCustomFrom] = useState('');
  const [appliedCustomTo, setAppliedCustomTo] = useState('');

  const buildPreviewParams = (
    range: ReportRange = previewRange,
    doctor = appliedDoctorId,
    rep = appliedSalesPersonId,
    from = appliedCustomFrom,
    to = appliedCustomTo,
    selectedCity = appliedCity,
    selectedArea = appliedArea
  ) => {
    const params = new URLSearchParams({ range });
    if (range === 'custom' && from && to) {
      params.set('from', from);
      params.set('to', to);
    }
    if (doctor) params.set('doctorId', doctor);
    if (rep) params.set('salesPersonId', rep);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedArea) params.set('area', selectedArea);
    return params;
  };

  const loadPreview = async (
    range: ReportRange = previewRange,
    doctor = appliedDoctorId,
    rep = appliedSalesPersonId,
    from = appliedCustomFrom,
    to = appliedCustomTo,
    selectedCity = appliedCity,
    selectedArea = appliedArea
  ) => {
    if (range === 'custom' && (!from || !to)) {
      setPreviewRange('custom');
      return;
    }

    setPreviewLoading(true);
    try {
      const params = buildPreviewParams(range, doctor, rep, from, to, selectedCity, selectedArea);
      const res = await fetch(`/api/reports/preview?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || 'Failed to load report preview', 'error');
        return;
      }
      const data = await res.json();
      setPreview(data);
      setPreviewRange(range);
      if (range === 'custom' && from && to) {
        setAppliedCustomFrom(from);
        setAppliedCustomTo(to);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectPreviewRange = (range: ReportRange) => {
    if (range === 'custom') {
      setPreviewRange('custom');
      if (!previewCustomFrom && !previewCustomTo) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setPreviewCustomFrom(monthStart.toISOString().split('T')[0]);
        setPreviewCustomTo(now.toISOString().split('T')[0]);
      }
      return;
    }
    loadPreview(range);
  };

  const applyCustomPreviewRange = () => {
    if (!previewCustomFrom || !previewCustomTo) {
      addToast('Please select both start and end dates', 'error');
      return;
    }
    if (previewCustomFrom > previewCustomTo) {
      addToast('Start date must be before end date', 'error');
      return;
    }
    loadPreview('custom', appliedDoctorId, appliedSalesPersonId, previewCustomFrom, previewCustomTo);
    addToast('Custom date range applied', 'success');
  };

  const exportCurrentPreview = (format: ExportFormat) => {
    if (previewRange === 'custom') {
      if (!appliedCustomFrom || !appliedCustomTo) {
        addToast('Apply a custom date range first', 'error');
        return;
      }
      runExport(format, 'custom', appliedCustomFrom, appliedCustomTo);
      return;
    }
    runExport(format, previewRange);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const user = data.user;
        const canAccess =
          user?.role === 'superAdmin' || (user?.role === 'admin' && user?.hasWriteAccess);
        if (!canAccess) {
          router.replace('/dashboard');
          return;
        }
        fetch('/api/reports/filters')
          .then((r) => r.json())
          .then((filters) => {
            setDoctors(filters.doctors || []);
            setSalesPersons(filters.salesPersons || []);
            setFiltersLoading(false);
          });
        fetch('/api/dropdowns')
          .then((r) => r.json())
          .then((data) => {
            const options = (data.grouped?.city || [])
              .filter((item: { isActive: boolean }) => item.isActive)
              .map((item: { label: string }) => item.label);
            setCities(options);
          });
        loadPreview('monthly');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const activeFilterLabels = useMemo(() => {
    const parts: string[] = [];
    if (appliedDoctorId) {
      const d = doctors.find((x) => x.id === appliedDoctorId);
      if (d) parts.push(`Doctor: ${d.name}`);
    }
    if (appliedSalesPersonId) {
      const s = salesPersons.find((x) => x.id === appliedSalesPersonId);
      if (s) parts.push(`Sales Rep: ${s.name}`);
    }
    if (appliedCity) parts.push(`City: ${appliedCity}`);
    if (appliedArea) parts.push(`Area: ${appliedArea}`);
    return parts;
  }, [appliedDoctorId, appliedSalesPersonId, appliedCity, appliedArea, doctors, salesPersons]);

  const hasPendingFilters =
    doctorId !== appliedDoctorId ||
    salesPersonId !== appliedSalesPersonId ||
    city !== appliedCity ||
    area !== appliedArea;

  const applyFilters = () => {
    setAppliedDoctorId(doctorId);
    setAppliedSalesPersonId(salesPersonId);
    setAppliedCity(city);
    setAppliedArea(area);
    loadPreview(
      previewRange,
      doctorId,
      salesPersonId,
      previewRange === 'custom' ? appliedCustomFrom : undefined,
      previewRange === 'custom' ? appliedCustomTo : undefined,
      city,
      area
    );
    addToast('Filters applied', 'success');
  };

  const clearFilters = () => {
    setDoctorId('');
    setSalesPersonId('');
    setCity('');
    setArea('');
    setAppliedDoctorId('');
    setAppliedSalesPersonId('');
    setAppliedCity('');
    setAppliedArea('');
    loadPreview(
      previewRange,
      '',
      '',
      previewRange === 'custom' ? appliedCustomFrom : undefined,
      previewRange === 'custom' ? appliedCustomTo : undefined,
      '',
      ''
    );
  };

  const buildExportParams = (format: ExportFormat, range: ReportRange, from?: string, to?: string) => {
    const params = new URLSearchParams({ format, range });
    if (range === 'custom' && from && to) {
      params.set('from', from);
      params.set('to', to);
    }
    if (appliedDoctorId) params.set('doctorId', appliedDoctorId);
    if (appliedSalesPersonId) params.set('salesPersonId', appliedSalesPersonId);
    if (appliedCity) params.set('city', appliedCity);
    if (appliedArea) params.set('area', appliedArea);
    return params;
  };

  const runExport = async (
    format: ExportFormat,
    range: ReportRange,
    from?: string,
    to?: string
  ) => {
    const key = `${range}-${format}`;
    setExporting(key);
    try {
      const params = buildExportParams(format, range, from, to);
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || 'Export failed', 'error');
        return;
      }

      const blob = await res.blob();
      const ext = format === 'csv' ? 'csv' : 'html';
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `dsr-report.${ext}`;

      if (format === 'html') {
        const html = await blob.text();
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(htmlBlob);
        const win = window.open(url, '_blank');
        if (win) win.onload = () => setTimeout(() => win.print(), 400);
        downloadBlob(htmlBlob, filename);
      } else {
        downloadBlob(blob, filename);
      }

      addToast(
        format === 'csv' ? 'Excel report downloaded!' : 'PDF report ready — use Save as PDF in print dialog',
        'success'
      );
      setShowCustom(false);
    } finally {
      setExporting(null);
    }
  };

  const handleCustomExport = (format: ExportFormat) => {
    if (!customFrom || !customTo) {
      addToast('Please select both start and end dates', 'error');
      return;
    }
    if (customFrom > customTo) {
      addToast('Start date must be before end date', 'error');
      return;
    }
    runExport(format, 'custom', customFrom, customTo);
  };

  const isExporting = (range: string, format: string) => exporting === `${range}-${format}`;

  return (
    <PageShell wide>
      <PageHeader
        title="Reports"
        subtitle="Export performance reports with doctor, sales rep, city, and area filters"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => runExport('csv', 'monthly')}
              disabled={!!exporting}
            >
              <Download className="h-4 w-4" />
              {isExporting('monthly', 'csv') ? 'Exporting…' : 'Excel (Month)'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => runExport('html', 'monthly')}
              disabled={!!exporting}
            >
              <FileText className="h-4 w-4" />
              {isExporting('monthly', 'html') ? 'Exporting…' : 'PDF (Month)'}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand" />
          <h3 className="text-base font-bold text-slate-900">Report Filters</h3>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Filter by doctor, sales rep, or city. Area options appear after a city is selected.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="input-label" htmlFor="filter-doctor">Doctor</label>
            <select
              id="filter-doctor"
              className="input"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{(d.area || d.city) ? ` · ${d.area || d.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="filter-rep">Sales Rep</label>
            <select
              id="filter-rep"
              className="input"
              value={salesPersonId}
              onChange={(e) => setSalesPersonId(e.target.value)}
            >
              <option value="">All sales reps</option>
              {salesPersons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="filter-city">City</label>
            <select
              id="filter-city"
              className="input"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setArea('');
              }}
            >
              <option value="">All cities</option>
              {cities.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          {city && (
            <div>
              <label className="input-label" htmlFor="filter-area">Area</label>
              <select
                id="filter-area"
                className="input"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">All areas</option>
                {areaOptionsForCity(city).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={applyFilters}
              disabled={!hasPendingFilters}
            >
              Apply Filters
            </button>
            {(appliedDoctorId || appliedSalesPersonId || appliedCity || appliedArea || doctorId || salesPersonId || city || area) && (
              <button type="button" className="btn btn-ghost" onClick={clearFilters} title="Clear filters">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {activeFilterLabels.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active:</span>
            {activeFilterLabels.map((label) => (
              <span key={label} className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/20">
                {label}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* KPI Summary */}
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Report Preview</h3>
            {preview?.periodLabel && !previewLoading && (
              <p className="mt-0.5 text-sm text-slate-500">{preview.periodLabel}</p>
            )}
            {previewRange === 'custom' && !appliedCustomFrom && (
              <p className="mt-0.5 text-sm text-slate-500">Select a date range below</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['daily', 'weekly', 'monthly'] as ReportRange[]).map((range) => (
              <button
                key={range}
                type="button"
                className={`btn btn-sm ${previewRange === range ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => selectPreviewRange(range)}
                disabled={previewLoading}
              >
                {range === 'daily' ? 'Today' : range === 'weekly' ? 'This Week' : 'This Month'}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm inline-flex items-center gap-1.5 ${previewRange === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => selectPreviewRange('custom')}
              disabled={previewLoading}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Custom Range
            </button>
          </div>
        </div>

        {previewRange === 'custom' && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Custom date range
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <label className="input-label" htmlFor="preview-from">From</label>
                <input
                  id="preview-from"
                  type="date"
                  className="input"
                  value={previewCustomFrom}
                  onChange={(e) => setPreviewCustomFrom(e.target.value)}
                />
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="input-label" htmlFor="preview-to">To</label>
                <input
                  id="preview-to"
                  type="date"
                  className="input"
                  value={previewCustomTo}
                  onChange={(e) => setPreviewCustomTo(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyCustomPreviewRange}
                disabled={previewLoading}
              >
                Apply Range
              </button>
            </div>
          </div>
        )}

        {previewLoading || filtersLoading ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {[
              { label: 'Total Visits', value: preview?.kpis.totalVisits || 0, color: 'indigo' },
              { label: 'Completed', value: preview?.kpis.completedVisits || 0, color: 'green' },
              {
                label: 'Pending / Overdue',
                value: `${preview?.kpis.pendingVisits || 0} / ${preview?.kpis.overdueVisits || 0}`,
                color: 'amber',
              },
              {
                label: 'Doctors in Report',
                value: preview?.doctorCount || preview?.kpis.uniqueDoctorsVisited || 0,
                color: 'blue',
              },
            ].map((k) => (
              <div key={k.label} className={`kpi-card ${k.color}`}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{k.label}</div>
                <div className="text-[32px] font-extrabold">{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {!previewLoading && !filtersLoading && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Export preview:
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!!exporting}
              onClick={() => exportCurrentPreview('csv')}
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!!exporting}
              onClick={() => exportCurrentPreview('html')}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        )}
      </Card>

      {!previewLoading && preview && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-base font-bold text-slate-900">Rep Performance</h3>
            {preview.repPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3">Sales Rep</th>
                      <th className="pb-2 pr-3 text-center">Visits</th>
                      <th className="pb-2 pr-3 text-center">Done</th>
                      <th className="pb-2 text-center">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.repPerformance.map((rep) => (
                      <tr key={rep.name} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{rep.name}</td>
                        <td className="py-2.5 pr-3 text-center">{rep.visits}</td>
                        <td className="py-2.5 pr-3 text-center text-emerald-600">{rep.completed}</td>
                        <td className="py-2.5 text-center text-amber-600">{rep.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No visits match the current filters.</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 text-base font-bold text-slate-900">Status Breakdown</h3>
            {preview.statusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {preview.statusBreakdown.map((item) => {
                  const pct =
                    preview.kpis.totalVisits > 0
                      ? Math.round((item.count / preview.kpis.totalVisits) * 100)
                      : 0;
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{item.status}</span>
                        <span className="text-slate-500">{item.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No visits match the current filters.</p>
            )}
          </Card>
        </div>
      )}

      {!previewLoading && preview && preview.visits.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-bold text-slate-900">
            Visits ({preview.visits.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Doctor</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Rep</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {preview.visits.map((visit, index) => (
                  <tr key={`${visit.visitDate}-${visit.doctorName}-${index}`} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{visit.visitDate}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-slate-900">{visit.doctorName}</div>
                      <div className="text-xs text-slate-500">{visit.doctorArea && visit.doctorArea !== '—' ? visit.doctorArea : visit.doctorCity} · {visit.doctorSpeciality}</div>
                    </td>
                    <td className="py-2.5 pr-3">{visit.visitType}</td>
                    <td className="py-2.5 pr-3">{visit.salesPerson}</td>
                    <td className="py-2.5 pr-3">{visit.status}</td>
                    <td className="py-2.5 whitespace-nowrap">{visit.followUpDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Report type cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {REPORT_TYPES.map((r) => (
          <Card key={r.range} hover>
            <div className="mb-3 flex items-start justify-between">
              <div className="font-bold text-base text-slate-900">{r.title}</div>
              <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">{r.badge}</span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">{r.desc}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm flex-1" disabled={!!exporting} onClick={() => runExport('html', r.range)}>
                {isExporting(r.range, 'html') ? '…' : 'PDF'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm flex-1" disabled={!!exporting} onClick={() => runExport('csv', r.range)}>
                {isExporting(r.range, 'csv') ? '…' : 'Excel'}
              </button>
            </div>
          </Card>
        ))}

        <Card className="border-2 border-dashed border-brand/30 bg-gradient-to-br from-indigo-50/50 to-white">
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-brand" />
            <div className="font-bold text-base text-slate-900">Custom Range</div>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            Pick any date range. Active doctor, sales rep, city, and area filters are included.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm w-full"
            onClick={() => {
              if (appliedCustomFrom && appliedCustomTo) {
                setCustomFrom(appliedCustomFrom);
                setCustomTo(appliedCustomTo);
              } else if (previewCustomFrom && previewCustomTo) {
                setCustomFrom(previewCustomFrom);
                setCustomTo(previewCustomTo);
              }
              setShowCustom(true);
            }}
          >
            Choose Date Range →
          </button>
        </Card>
      </div>

      {/* Custom export modal */}
      {showCustom && (
        <div className="modal-overlay" onClick={() => setShowCustom(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-900">
                <CalendarRange className="h-5 w-5 text-brand" />
                Custom Export
              </div>
              <p className="mb-6 text-sm text-slate-500">Select date range — active filters will be included</p>

              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="input-label" htmlFor="custom-from">From</label>
                  <input id="custom-from" type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div>
                  <label className="input-label" htmlFor="custom-to">To</label>
                  <input id="custom-to" type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </div>

              {activeFilterLabels.length > 0 && (
                <div className="mb-4 rounded-xl bg-indigo-50/80 p-4 ring-1 ring-indigo-100">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">Applied filters</div>
                  <div className="flex flex-wrap gap-2">
                    {activeFilterLabels.map((label) => (
                      <span key={label} className="text-sm font-medium text-indigo-800">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowCustom(false)}>Cancel</button>
                <button type="button" className="btn btn-secondary flex-1" disabled={!!exporting} onClick={() => handleCustomExport('csv')}>
                  {exporting === 'custom-csv' ? 'Exporting…' : 'Excel'}
                </button>
                <button type="button" className="btn btn-primary flex-1" disabled={!!exporting} onClick={() => handleCustomExport('html')}>
                  {exporting === 'custom-html' ? 'Exporting…' : 'PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
