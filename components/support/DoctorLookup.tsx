'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import TicketField, { FIELD_INPUT_CLASS } from './TicketField';
import type { TicketDoctor } from './types';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;

type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

interface DoctorLookupProps {
  value: TicketDoctor | null;
  onChange: (doctor: TicketDoctor | null) => void;
  error?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export default function DoctorLookup({ value, onChange, error, autoFocus, onBlur }: DoctorLookupProps) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<TicketDoctor[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value) setQuery(value.name);
  }

  useEffect(() => {
    const term = query.trim();
    if (value && query === value.name) return;
    if (term.length < MIN_QUERY_LENGTH) {
      const t = setTimeout(() => { setResults([]); setStatus('idle'); }, 0);
      return () => clearTimeout(t);
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setStatus('loading');
      setOpen(true);
      try {
        const res = await fetch(`/api/doctors?search=${encodeURIComponent(term)}&limit=${RESULT_LIMIT}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Doctor search failed (${res.status})`);
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data : []);
        setActiveIndex(-1);
        setStatus('done');
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setResults([]);
        setStatus('error');
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (doctor: TicketDoctor) => {
    onChange(doctor);
    setQuery(doctor.name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setStatus('idle');
  };

  const showPanel = open && status !== 'idle';

  return (
    <TicketField
      label="Doctor Name"
      htmlFor={inputId}
      required
      error={error}
      hint="All doctors registered in the app are searchable."
    >
      <div ref={containerRef} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={inputId}
          className={cn(FIELD_INPUT_CLASS, '!pl-10 !pr-10', error && 'border-danger')}
          value={query}
          placeholder="Search doctor by name, city or clinic..."
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            aria-label="Clear doctor"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showPanel && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            {status === 'loading' && <p className="px-4 py-3 text-[13px] text-slate-500">Searching doctors...</p>}
            {status === 'error' && <p className="px-4 py-3 text-[13px] text-danger">Could not search doctors. Please try again.</p>}
            {status === 'done' && results.length === 0 && (
              <p className="px-4 py-3 text-[13px] text-slate-500">No doctors found. Try a different name or city.</p>
            )}
            {status === 'done' && results.length > 0 && (
              <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto">
                {results.map((d, i) => (
                  <li
                    key={d._id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => { e.preventDefault(); select(d); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'cursor-pointer border-b border-border px-4 py-2.5 last:border-0 transition-colors',
                      i === activeIndex ? 'bg-brand-light' : 'hover:bg-bg-secondary'
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-500">
                      {[d.speciality, d.area || d.city, d.clinicName].filter(Boolean).join(' · ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </TicketField>
  );
}
