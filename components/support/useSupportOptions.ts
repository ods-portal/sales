'use client';

import { useEffect, useState } from 'react';
import { SUPPORT_REASON_GROUP, SUPPORT_STATUS_GROUP } from '@/lib/supportConstants';
import type { SupportEmployee } from './types';

interface SupportOptions {
  reasons: string[];
  statuses: string[];
  employees: SupportEmployee[];
  loading: boolean;
  error: string | null;
}

interface DropdownRow {
  group: string;
  label: string;
}

/** Loads admin-managed support dropdowns and the support employee list. */
export function useSupportOptions(): SupportOptions {
  const [state, setState] = useState<SupportOptions>({
    reasons: [],
    statuses: [],
    employees: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [dropdownRes, employeeRes] = await Promise.all([
          fetch('/api/dropdowns', { signal: controller.signal }),
          fetch('/api/support/employees', { signal: controller.signal }),
        ]);
        if (!dropdownRes.ok || !employeeRes.ok) throw new Error('Failed to load support options');
        const dropdowns = await dropdownRes.json();
        const employees = await employeeRes.json();
        const rows: DropdownRow[] = Array.isArray(dropdowns.data) ? dropdowns.data : [];
        setState({
          reasons: rows.filter((r) => r.group === SUPPORT_REASON_GROUP).map((r) => r.label),
          statuses: rows.filter((r) => r.group === SUPPORT_STATUS_GROUP).map((r) => r.label),
          employees: Array.isArray(employees.data) ? employees.data : [],
          loading: false,
          error: null,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setState((s) => ({ ...s, loading: false, error: 'Could not load form options. Please refresh.' }));
      }
    };
    load();
    return () => controller.abort();
  }, []);

  return state;
}
