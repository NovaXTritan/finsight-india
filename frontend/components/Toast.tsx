'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-primary-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
};

const borderColors: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-primary-500',
  warning: 'border-l-yellow-500',
};

let addToast: (type: ToastType, message: string, duration?: number) => void;

export function toast(type: ToastType, message: string, duration?: number) {
  addToast?.(type, message, duration);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 bg-[var(--bg-raised)] border border-[var(--border-primary)] border-l-2 ${borderColors[t.type]} rounded-lg shadow-lg animate-slide-up`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <p className="text-sm text-[var(--text-primary)] flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
