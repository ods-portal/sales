'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  _id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityLabel?: string;
  createdAt: string;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'badge badge-green',
  UPDATE: 'badge badge-blue',
  DELETE: 'badge badge-red',
  LOGIN: 'badge badge-gray',
  LOGOUT: 'badge badge-gray',
  PERMISSION_CHANGE: 'badge badge-amber',
};

const ACTION_ICONS: Record<string, string> = {
  CREATE: '➕',
  UPDATE: '✏️',
  DELETE: '🗑',
  LOGIN: '🔑',
  LOGOUT: '⎋',
  PERMISSION_CHANGE: '🔐',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(entity && { entity }), ...(action && { action }) });
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    setLogs(data.data || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => fetch_(), 0); return () => clearTimeout(t); }, [page, entity, action]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔍 Audit Trail</h1>
          <p className="page-subtitle">Complete log of all changes made in the system</p>
        </div>
      </div>

      <div className="card card-sm mb-4 flex gap-2.5">
        <select className="input" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          {['User', 'Doctor', 'Visit', 'System'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="input" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PERMISSION_CHANGE'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="card p-0">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((__, j) => <td key={j}><div className="skeleton h-[14px]" /></td>)}</tr>
                ))
              ) : logs.map((log) => (
                <tr key={log._id}>
                  <td className="text-xs text-text-muted whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td>
                    <div className="font-semibold">{log.actorName}</div>
                    <div className="text-[11px] text-text-muted">{log.actorRole}</div>
                  </td>
                  <td>
                    <span className={ACTION_BADGE[log.action] || 'badge badge-gray'}>
                      {ACTION_ICONS[log.action]} {log.action}
                    </span>
                  </td>
                  <td className="text-text-secondary">{log.entity}</td>
                  <td className="text-[13px] text-text-secondary">{log.entityLabel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-1">
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span className="px-3 py-1.5 text-[13px]">Page {page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      </div>
    </div>
  );
}
