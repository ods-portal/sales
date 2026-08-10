'use client';

import { useEffect, useState } from 'react';
import { Settings, User, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  slug: string;
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile(d.user);
          setName(d.user.name);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { addToast('Name is required', 'error'); return; }
    if (trimmedName === profile?.name) { addToast('No changes to save', 'info'); return; }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.user);
        setName(data.user.name);
        addToast('Profile updated successfully!', 'success');
      } else {
        addToast(data.error || 'Failed to update profile', 'error');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 8) { addToast('Password must be at least 8 characters', 'error'); return; }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        addToast('Password changed successfully!', 'success');
      } else {
        addToast(data.error || 'Failed to change password', 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const roleBadge = profile?.role === 'superAdmin' ? 'brand' : profile?.role === 'admin' ? 'info' : 'neutral';
  const roleLabel = profile?.role === 'superAdmin' ? 'Super Admin' : profile?.role === 'admin' ? 'Admin' : 'Sales Person';

  if (loading) return <div className="skeleton mx-auto h-[400px] max-w-3xl rounded-2xl" />;

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and security"
        icon={<Settings className="h-5 w-5" />}
      />

      <Card className="mb-4">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-4 w-4 text-brand" />
          <CardTitle>Profile</CardTitle>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-200/50">
            {profile?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{profile?.name}</div>
            <div className="text-sm text-slate-500">{profile?.email}</div>
            <Badge variant={roleBadge} className="mt-1.5">{roleLabel}</Badge>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="input-label" htmlFor="name">Full Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="email">Email (read-only)</label>
            <input id="email" className="input opacity-60" value={profile?.email} disabled />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex items-center gap-2">
          <Lock className="h-4 w-4 text-brand" />
          <CardTitle>Change Password</CardTitle>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="input-label" htmlFor="current-pw">Current Password</label>
            <input id="current-pw" type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="new-pw">New Password</label>
            <input id="new-pw" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="input-label" htmlFor="confirm-pw">Confirm New Password</label>
            <input id="confirm-pw" type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={handlePasswordChange} disabled={savingPassword || !currentPassword || !newPassword}>
            {savingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </Card>
    </PageShell>
  );
}
