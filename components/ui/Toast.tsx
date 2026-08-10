'use client';

import { useEffect, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export default function Toast({ toasts, onRemove }: ToastProps) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    toasts.forEach((t) => {
      if (!timers.current.has(t.id)) {
        const timer = setTimeout(() => onRemove(t.id), 4000);
        timers.current.set(t.id, timer);
      }
    });
    // Clean up removed toasts
    timers.current.forEach((_, id) => {
      if (!toasts.find((t) => t.id === id)) {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
      }
    });
  }, [toasts, onRemove]);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <span className="text-base font-bold">{ICONS[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="bg-transparent border-none cursor-pointer text-base leading-none text-current"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
