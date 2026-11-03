'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { hasWriteAccess } from '@/lib/utils';

interface DropdownItem {
  _id: string;
  group: string;
  label: string;
  value: string;
  order: number;
  isSystem: boolean;
  isActive: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  visitType: 'Visit Types',
  visitMeetingMode: 'Visit Meeting Modes',
  visitNextAction: 'Visit Next Actions',
  visitResponsiblePerson: 'Visit Responsible Persons',
  speciality: 'Doctor Specialities',
  doctorCategory: 'Doctor Categories',
  doctorStatus: 'Doctor Statuses',
  yesNo: 'Yes/No (System)',
  patientVolume: 'Patient Volume',
  currentAlignerBrand: 'Current Aligner Brands',
  otherOrthoSystem: 'Other Ortho Systems',
  decisionMaker: 'Decision Maker',
  potentialRating: 'Potential Rating',
  decisionStage: 'Decision Stage',
  preferredCommunication: 'Preferred Communication',
  reasonForNotSwitching: 'Reason for Not Switching',
  city: 'Cities',
  state: 'States',
};

export default function DropdownsPage() {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [grouped, setGrouped] = useState<Record<string, DropdownItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchDropdowns = async () => {
    const res = await fetch('/api/dropdowns');
    const data = await res.json();
    const fetched = data.grouped || {};
    
    // Ensure all groups exist in the state, even if empty in the database
    const completeGrouped: Record<string, DropdownItem[]> = {};
    Object.keys(GROUP_LABELS).forEach(key => {
      completeGrouped[key] = fetched[key] || [];
    });
    
    setGrouped(completeGrouped);
    if (!activeGroup) {
      setActiveGroup(Object.keys(GROUP_LABELS)[0]);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    const t = setTimeout(() => fetchDropdowns(), 0);
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setCurrentUser(d.user); });
    return () => clearTimeout(t);
  }, []);

  const canEdit = hasWriteAccess(currentUser);

  const handleAdd = async () => {
    if (!newLabel || !newValue || !activeGroup) return;
    setAdding(true);
    const res = await fetch('/api/dropdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: activeGroup, label: newLabel, value: newValue }),
    });
    if (res.ok) {
      addToast('Option added!', 'success');
      setNewLabel(''); setNewValue('');
      fetchDropdowns();
    } else {
      const d = await res.json();
      addToast(d.error || 'Failed to add option', 'error');
    }
    setAdding(false);
  };

  const startEdit = (item: DropdownItem) => {
    setEditingId(item._id);
    setEditLabel(item.label);
    setEditValue(item.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim() || !editValue.trim()) return;
    setSavingEdit(true);
    const res = await fetch('/api/dropdowns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, label: editLabel.trim(), value: editValue.trim() }),
    });
    if (res.ok) {
      addToast('Option updated', 'success');
      cancelEdit();
      fetchDropdowns();
    } else {
      const data = await res.json();
      addToast(data.error || 'Failed to update option', 'error');
    }
    setSavingEdit(false);
  };

  const handleDelete = async (id: string, label: string) => {
    const ok = await confirm({ title: 'Delete Option', message: `Are you sure you want to delete "${label}"?`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    const res = await fetch(`/api/dropdowns?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      addToast('Option deleted', 'success');
      fetchDropdowns();
    } else {
      addToast('Failed to delete option', 'error');
    }
  };

  const currentItems = grouped[activeGroup] || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Dropdown Manager</h1>
          <p className="page-subtitle">
            {currentUser && !canEdit
              ? 'View configurable options. You need write access to add, edit, or delete them.'
              : 'Manage configurable options used across the application'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton h-[300px]" /></div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          
          <div className="card p-3">
            <div className="text-[12px] font-bold text-text-muted uppercase tracking-[0.5px] mb-2 px-1">Groups</div>
            {Object.keys(grouped).map((g) => (
              <button
                key={g}
                onClick={() => { setActiveGroup(g); cancelEdit(); }}
                className={`flex items-center justify-between w-full py-2.5 px-3 rounded-lg border-none text-[13px] text-left transition-all mb-0.5 cursor-pointer ${activeGroup === g ? 'bg-brand-light text-brand font-semibold' : 'bg-transparent text-text-primary font-normal'}`}
              >
                <span>{GROUP_LABELS[g] || g}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeGroup === g ? 'bg-brand text-white' : 'bg-border text-text-muted'}`}>
                  {grouped[g].length}
                </span>
              </button>
            ))}
          </div>

          {/* Options Panel */}
          <div>
            <div className="card mb-3">
              <div className="font-bold text-base mb-4">
                {GROUP_LABELS[activeGroup] || activeGroup}
                {currentItems.some((i) => i.isSystem) && (
                  <span className="badge badge-gray ml-2 text-[11px]">Contains system defaults</span>
                )}
              </div>

              {/* Add new */}
              {canEdit && activeGroup && (currentItems.length === 0 || !currentItems.every((i) => i.isSystem)) && (
                <div className="flex gap-2.5 mb-4 p-3 bg-bg-secondary rounded-xl">
                  <input
                    className="input flex-1"
                    placeholder="Label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                  <input
                    className="input flex-1"
                    placeholder="Value (slug)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAdd}
                    disabled={adding || !newLabel || !newValue}
                  >
                    {adding ? '...' : '+ Add'}
                  </button>
                </div>
              )}

              {/* Items */}
              <div className="flex flex-col gap-1.5">
                {currentItems.map((item) => {
                  const isEditing = editingId === item._id;
                  return (
                    <div
                      key={item._id}
                      className={`flex flex-wrap items-center gap-3 py-3 px-3.5 rounded-xl border border-border ${item.isSystem ? 'bg-bg-secondary' : 'bg-white'}`}
                    >
                      {isEditing ? (
                        <>
                          <input
                            className="input min-w-[140px] flex-1"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            aria-label="Edit label"
                          />
                          <input
                            className="input min-w-[140px] flex-1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            aria-label="Edit value"
                          />
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveEdit}
                              disabled={savingEdit || !editLabel.trim() || !editValue.trim()}
                            >
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[14px]">{item.label}</div>
                            <div className="text-[12px] text-text-muted font-mono">{item.value}</div>
                          </div>
                          {item.isSystem ? (
                            <span className="badge badge-gray shrink-0" title="System defaults cannot be modified">🔒 System Default</span>
                          ) : canEdit && (
                            <div className="flex shrink-0 gap-2">
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(item)}>
                                Edit
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item._id, item.label)}>
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
