'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pencil, ShieldOff, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  hasWriteAccess: boolean;
  status: string;
  slug: string;
  lastLogin?: string;
  createdAt: string;
}

interface CurrentUser {
  userId?: string;
  role: string;
  hasWriteAccess: boolean;
}

const ROLE_BADGE: Record<string, string> = {
  superAdmin: 'badge badge-indigo',
  admin: 'badge badge-blue',
  salesPerson: 'badge badge-gray',
};
const ROLE_LABEL: Record<string, string> = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  salesPerson: 'Sales Person',
};

export default function UsersPage() {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'salesPerson', password: '' });
  const [adding, setAdding] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) });
    const res = await fetch(`/api/users?${params}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.data || []);
    setTotal(data.totalCount || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser({
            userId: data.user.userId,
            role: data.user.role,
            hasWriteAccess: data.user.hasWriteAccess,
          });
        }
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const canManageTarget = (target: User) => {
    if (!currentUser) return false;
    if (target._id === currentUser.userId) return false;
    if (target.role === 'superAdmin' && currentUser.role !== 'superAdmin') return false;
    return true;
  };

  const toggleWriteAccess = async (userId: string, current: boolean) => {
    setActionUserId(userId);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, hasWriteAccess: !current }),
    });
    if (res.ok) {
      addToast('Write access updated', 'success');
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      addToast(data.error || 'Failed to update', 'error');
    }
    setActionUserId(null);
  };

  const toggleBlock = async (target: User) => {
    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    const label = newStatus === 'suspended' ? 'block' : 'unblock';
    const ok = await confirm({
      title: newStatus === 'suspended' ? 'Block User' : 'Unblock User',
      message:
        newStatus === 'suspended'
          ? `Block ${target.name}? They will not be able to log in until unblocked.`
          : `Unblock ${target.name}? They will be able to log in again.`,
      confirmText: newStatus === 'suspended' ? 'Block User' : 'Unblock User',
      danger: newStatus === 'suspended',
    });
    if (!ok) return;

    setActionUserId(target._id);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: target._id, status: newStatus }),
    });
    if (res.ok) {
      addToast(`User ${label}ed successfully`, 'success');
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      addToast(data.error || `Failed to ${label} user`, 'error');
    }
    setActionUserId(null);
  };

  const openEditEmail = (target: User) => {
    setEditingUser(target);
    setEditEmail(target.email);
    setShowEditEmailModal(true);
  };

  const saveEmail = async () => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      addToast('Email is required', 'error');
      return;
    }

    setSavingEmail(true);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(editingUser._id), email: editEmail.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      addToast('Email updated successfully', 'success');
      setShowEditEmailModal(false);
      setEditingUser(null);
      fetchUsers();
    } else {
      addToast(data.error || 'Failed to update email', 'error');
    }
    setSavingEmail(false);
  };

  const deleteUser = async (target: User) => {
    const ok = await confirm({
      title: 'Delete User',
      message: `Permanently delete ${target.name}? This action cannot be undone.`,
      confirmText: 'Delete User',
      danger: true,
    });
    if (!ok) return;

    setActionUserId(target._id);
    const res = await fetch(`/api/users?userId=${target._id}`, { method: 'DELETE' });
    if (res.ok) {
      addToast('User deleted', 'success');
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      addToast(data.error || 'Failed to delete user', 'error');
    }
    setActionUserId(null);
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      addToast('All fields are required', 'error');
      return;
    }
    setAdding(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (res.ok) {
      addToast('User created!', 'success');
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: 'salesPerson', password: '' });
      fetchUsers();
    } else {
      addToast(data.error || 'Failed to create user', 'error');
    }
    setAdding(false);
  };

  const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-success' : 'bg-[#E5E7EB]'}`}
    >
      <span className={`absolute top-[2px] block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-[14px]' : 'left-[2px]'}`} />
    </button>
  );

  return (
    <PageShell wide>
      <PageHeader
        title="User Management"
        subtitle={`${total} users in system`}
        icon={<UserPlus className="h-5 w-5" />}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        }
      />

      <Card className="mb-4">
        <input
          className="input"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="table-container overflow-x-hidden">
          <table className="data-table w-full text-[11px] [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2 [&_th]:text-[10px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Write</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th className="w-[88px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}>
                        <div className="skeleton h-[14px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const manageable = canManageTarget(u);
                  const busy = actionUserId === u._id;
                  return (
                    <tr key={u._id}>
                      <td className="max-w-[100px] truncate font-medium">{u.name}</td>
                      <td className="max-w-[140px] truncate text-[11px] text-text-secondary" title={u.email}>
                        {u.email}
                      </td>
                      <td>
                        <span className={`${ROLE_BADGE[u.role] || 'badge badge-gray'} !px-2 !py-0.5 !text-[10px]`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          <Toggle
                            checked={u.hasWriteAccess}
                            onChange={() => toggleWriteAccess(u._id, u.hasWriteAccess)}
                            disabled={!manageable || busy}
                          />
                        ) : (
                          <span className="text-[10px] text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`${u.status === 'active' ? 'badge badge-green' : 'badge badge-red'} !px-2 !py-0.5 !text-[10px]`}>
                          {u.status === 'active' ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-text-muted">
                        {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-text-muted">{formatDate(u.createdAt)}</td>
                      <td>
                        {manageable ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand disabled:opacity-50"
                              title="Change email"
                              disabled={busy}
                              onClick={() => openEditEmail(u)}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                              title={u.status === 'active' ? 'Block login' : 'Unblock login'}
                              disabled={busy}
                              onClick={() => toggleBlock(u)}
                            >
                              {u.status === 'active' ? (
                                <ShieldOff className="h-3 w-3 text-amber-600" />
                              ) : (
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                              title="Delete user"
                              disabled={busy}
                              onClick={() => deleteUser(u)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-1 border-t border-border px-4 py-3">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span className="px-3 py-1.5 text-[13px]">
            Page {page} / {totalPages}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next ›
          </button>
        </div>
      </Card>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-7 py-6">
              <div className="text-lg font-bold">Add New User</div>
              <button type="button" onClick={() => setShowAddModal(false)} className="cursor-pointer border-none bg-transparent text-xl text-text-secondary">
                ×
              </button>
            </div>
            <div className="px-7 py-6">
              <div className="mb-3.5">
                <label className="input-label">Full Name *</label>
                <input className="input" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Priya Sharma" />
              </div>
              <div className="mb-3.5">
                <label className="input-label">Email *</label>
                <input type="email" className="input" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="priya@company.com" />
              </div>
              <div className="mb-3.5">
                <label className="input-label">Role</label>
                <select className="input" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="salesPerson">Sales Person</option>
                  <option value="admin">Admin</option>
                  {currentUser?.role === 'superAdmin' && <option value="superAdmin">Super Admin</option>}
                </select>
              </div>
              <div className="mb-5">
                <label className="input-label">Initial Password *</label>
                <input type="password" className="input" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" />
              </div>
              <div className="flex justify-end gap-2.5">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddUser} disabled={adding}>
                  {adding ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditEmailModal && editingUser && (
        <div className="modal-overlay" onClick={() => !savingEmail && setShowEditEmailModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-7 py-6">
              <div>
                <div className="text-lg font-bold">Change Email</div>
                <div className="mt-0.5 text-sm text-slate-500">{editingUser.name}</div>
              </div>
              <button type="button" onClick={() => setShowEditEmailModal(false)} className="cursor-pointer border-none bg-transparent text-xl text-text-secondary">
                ×
              </button>
            </div>
            <div className="px-7 py-6">
              <div className="mb-5">
                <label className="input-label" htmlFor="edit-email">New Email Address</label>
                <input
                  id="edit-email"
                  type="email"
                  className="input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@company.com"
                  disabled={savingEmail}
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditEmailModal(false)} disabled={savingEmail}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={saveEmail} disabled={savingEmail}>
                  {savingEmail ? 'Saving…' : 'Save Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
