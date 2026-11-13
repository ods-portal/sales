'use client';

import { useCallback, useState } from 'react';
import type { TicketDoctor } from './types';

export interface NewTicketForm {
  doctor: TicketDoctor | null;
  patientId: string;
  reason: string;
  concern: string;
  actionTaken: string;
  assignedTo: string;
  images: string[];
  videos: string[];
}

type RequiredField = 'doctor' | 'patientId' | 'reason' | 'concern';
export type TicketFormErrors = Partial<Record<RequiredField, string>>;

const MAX_PATIENT_ID_LENGTH = 60;
const MIN_CONCERN_LENGTH = 10;

const INITIAL_FORM: NewTicketForm = {
  doctor: null,
  patientId: '',
  reason: '',
  concern: '',
  actionTaken: '',
  assignedTo: '',
  images: [],
  videos: [],
};

/** Each rule reads only its own field, so callers may pass a partial form. */
function validateField(field: RequiredField, form: NewTicketForm): string | undefined {
  switch (field) {
    case 'doctor':
      return form.doctor ? undefined : 'Please select a doctor from the list';
    case 'patientId': {
      const value = form.patientId.trim();
      if (!value) return 'Patient ID is required';
      if (value.length > MAX_PATIENT_ID_LENGTH) return `Patient ID must be under ${MAX_PATIENT_ID_LENGTH} characters`;
      return undefined;
    }
    case 'reason':
      return form.reason ? undefined : 'Please select a reason for support';
    case 'concern': {
      const value = form.concern.trim();
      if (!value) return 'Please describe the doctor concern';
      if (value.length < MIN_CONCERN_LENGTH) return `Please add a little more detail (at least ${MIN_CONCERN_LENGTH} characters)`;
      return undefined;
    }
  }
}

const REQUIRED_FIELDS: RequiredField[] = ['doctor', 'patientId', 'reason', 'concern'];

/** Form state with inline validation: a field shows errors once touched, and re-validates as the user corrects it. */
export function useNewTicketForm() {
  const [form, setForm] = useState<NewTicketForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({});

  const setField = useCallback(<K extends keyof NewTicketForm>(key: K, value: NewTicketForm[K]) => {
    // Functional update: upload callbacks resolve later and must not overwrite fields typed meanwhile
    setForm((prev) => ({ ...prev, [key]: value }));
    if ((REQUIRED_FIELDS as string[]).includes(key)) {
      const field = key as RequiredField;
      const error = touched[field] ? validateField(field, { ...INITIAL_FORM, [key]: value }) : undefined;
      setErrors((e) => ({ ...e, [field]: error }));
    }
  }, [touched]);

  const touch = useCallback((field: RequiredField) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field, form) }));
  }, [form]);

  const validateAll = useCallback((): boolean => {
    const next: TicketFormErrors = {};
    REQUIRED_FIELDS.forEach((f) => { next[f] = validateField(f, form); });
    setErrors(next);
    setTouched({ doctor: true, patientId: true, reason: true, concern: true });
    return REQUIRED_FIELDS.every((f) => !next[f]);
  }, [form]);

  return { form, errors, setField, touch, validateAll };
}
