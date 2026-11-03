'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import PageShell from '@/components/ui/PageShell';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface TransferCounts {
  doctorCount: number;
  visitCount: number;
}

export default function TransferSalesDataPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [ready, setReady] = useState(false);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [fromUserId, setFromUserId] = useState('');
  const [copyDoctors, setCopyDoctors] = useState(false);
  const [copyVisits, setCopyVisits] = useState(false);
  const [loadedCounts, setLoadedCounts] = useState<{ userId: string; data: TransferCounts | null } | null>(null);
  const counts = loadedCounts?.userId === fromUserId ? loadedCounts.data : null;
  const countsLoading = Boolean(fromUserId) && loadedCounts?.userId !== fromUserId;
  const [transferring, setTransferring] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        const user = data.user;
        const canAccess =
          user?.role === 'superAdmin' || (user?.role === 'admin' && user?.hasWriteAccess);
        if (!canAccess) {
          router.replace('/dashboard');
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    fetch('/api/users?role=salesPerson&limit=200')
      .then((response) => response.json())
      .then((data) => setSalesPersons(data.data || []))
      .catch(() => addToast('Could not load sales persons', 'error'));
  }, [ready, addToast]);

  useEffect(() => {
    if (!fromUserId) return;
    fetch(`/api/users/transfer?from=${fromUserId}`)
      .then((response) => response.json())
      .then((data) => setLoadedCounts({ userId: fromUserId, data: data.data || null }))
      .catch(() => setLoadedCounts({ userId: fromUserId, data: null }));
  }, [fromUserId]);

  const destinationOptions = useMemo(
    () => salesPersons.filter((person) => person._id !== fromUserId && person.status === 'active'),
    [salesPersons, fromUserId]
  );
  const sourceOptions = useMemo(
    () => salesPersons.filter((person) => person._id !== toUserId),
    [salesPersons, toUserId]
  );
  const destination = salesPersons.find((person) => person._id === toUserId);
  const source = salesPersons.find((person) => person._id === fromUserId);

  const handleTransfer = async () => {
    if (!toUserId || !fromUserId) {
      setFormError('Select who receives the data, then whose data to copy');
      return;
    }
    if (toUserId === fromUserId) {
      setFormError('Choose two different sales persons');
      return;
    }
    if (!copyDoctors && !copyVisits) {
      setFormError('Select doctors, visits, or both');
      return;
    }

    const parts = [
      copyDoctors ? `all doctors (${counts?.doctorCount ?? 0})` : '',
      copyVisits ? `all visits (${counts?.visitCount ?? 0})` : '',
    ].filter(Boolean);
    const ok = await confirm({
      title: 'Copy sales data',
      message: `Create ${parts.join(' and ')} for ${destination?.name} from ${source?.name}? The original records stay with ${source?.name}. The new records use the same details and belong to ${destination?.name}.`,
      confirmText: 'Copy data',
    });
    if (!ok) return;

    setTransferring(true);
    setFormError('');
    try {
      const response = await fetch('/api/users/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId,
          fromUserId,
          doctors: copyDoctors,
          visits: copyVisits,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        addToast(data.error || 'Transfer failed', 'error');
        return;
      }
      const copied = data.data || {};
      addToast(
        `Copied ${copied.doctorsCopied || 0} doctors and ${copied.visitsCopied || 0} visits to ${copied.destinationName}`,
        'success'
      );
      setCopyDoctors(false);
      setCopyVisits(false);
    } finally {
      setTransferring(false);
    }
  };

  if (!ready) {
    return (
      <PageShell>
        <div className="skeleton h-40 rounded-2xl" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Transfer Sales Data"
        subtitle="Copy a sales person's doctors and visits to another sales person"
        icon={<ArrowRightLeft className="h-5 w-5" />}
      />

      <Card className="mt-6 max-w-2xl">
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          New records are created for the receiving sales person, with the same details, as if they entered them.
          The original sales person keeps their existing doctors and visits.
        </p>

        <div className="mb-4">
          <label className="input-label" htmlFor="transfer-to">
            Copy data to
          </label>
          <select
            id="transfer-to"
            className="input"
            value={toUserId}
            onChange={(event) => {
              const next = event.target.value;
              setToUserId(next);
              if (next === fromUserId) setFromUserId('');
              setFormError('');
            }}
            disabled={transferring}
          >
            <option value="">Select the sales person who should receive the data</option>
            {destinationOptions.map((person) => (
              <option key={person._id} value={person._id}>
                {person.name} · {person.email}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-muted">Active sales persons only</p>
        </div>

        <div className="mb-4">
          <label className="input-label" htmlFor="transfer-from">
            Copy data from
          </label>
          <select
            id="transfer-from"
            className="input"
            value={fromUserId}
            onChange={(event) => {
              setFromUserId(event.target.value);
              setFormError('');
            }}
            disabled={transferring || !toUserId}
          >
            <option value="">Select the sales person whose data should be copied</option>
            {sourceOptions.map((person) => (
              <option key={person._id} value={person._id}>
                {person.name} · {person.email}
                {person.status !== 'active' ? ' · blocked' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-muted">Choose the receiver first</p>
        </div>

        <fieldset className="mb-4" disabled={transferring || !fromUserId}>
          <legend className="input-label">What to copy</legend>
          <label className="mb-2 flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={copyDoctors}
              onChange={(event) => {
                setCopyDoctors(event.target.checked);
                setFormError('');
              }}
            />
            All doctors
            {counts && !countsLoading ? ` (${counts.doctorCount})` : ''}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={copyVisits}
              onChange={(event) => {
                setCopyVisits(event.target.checked);
                setFormError('');
              }}
            />
            All visits
            {counts && !countsLoading ? ` (${counts.visitCount})` : ''}
          </label>
          <p className="mt-1 text-xs text-text-muted">
            Select one or both. When both are selected, copied visits are linked to the copied doctors.
          </p>
        </fieldset>

        {formError && <p className="mb-4 text-sm text-danger">{formError}</p>}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleTransfer}
          disabled={transferring || !toUserId || !fromUserId}
        >
          {transferring ? 'Copying…' : 'Copy data'}
        </button>
      </Card>
    </PageShell>
  );
}
