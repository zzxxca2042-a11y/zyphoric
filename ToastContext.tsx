import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  message: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef<number[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timeoutIds.current = timeoutIds.current.filter((existingId) => existingId !== timeoutId);
    }, 3000);

    timeoutIds.current = [...timeoutIds.current, timeoutId];
  }, []);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(window.clearTimeout);
      timeoutIds.current = [];
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-3 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${
              toast.tone === 'error'
                ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-200'
                : toast.tone === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
                : toast.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
            } max-w-sm rounded-2xl px-4 py-3 text-sm shadow-2xl shadow-slate-900/5`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
