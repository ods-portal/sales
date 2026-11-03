'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center">
          {/* Backdrop */}
          <div
            onClick={() => handleClose(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[4px]"
          />

          {/* Dialog */}
          <div className="relative w-full rounded-t-3xl border border-border bg-bg-primary confirm-sheet px-5 pt-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[confirmSlideIn_0.2s_ease-out] md:max-w-[420px] md:rounded-2xl md:px-8 md:py-7">
            <div className="text-lg font-bold mb-2">
              {dialog.title || 'Confirm Action'}
            </div>
            <div className="text-sm text-text-secondary leading-[1.6] mb-6">
              {dialog.message}
            </div>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                className="btn btn-secondary btn-sm min-w-[80px] max-sm:w-full max-sm:justify-center"
                onClick={() => handleClose(false)}
              >
                {dialog.cancelText || 'Cancel'}
              </button>
              <button
                className={`btn btn-sm min-w-[80px] max-sm:w-full max-sm:justify-center ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes confirmSlideIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .btn-danger {
              background: var(--danger) !important;
              color: white !important;
              border: none !important;
            }
            .btn-danger:hover {
              opacity: 0.9;
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
