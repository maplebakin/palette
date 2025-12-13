/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const NotificationContext = createContext({ notify: () => {} });

const toneStyles = {
  info: 'bg-slate-900 text-white border-slate-800',
  success: 'bg-emerald-600 text-white border-emerald-500',
  warn: 'bg-amber-500 text-white border-amber-400',
  error: 'bg-rose-600 text-white border-rose-500',
};

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, tone = 'info', duration = 2600) => {
    if (!message) return;
    const canUUID = typeof crypto !== 'undefined' && crypto.randomUUID;
    const id = canUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const toast = { id, message, tone };
    setToasts((prev) => [...prev, toast].slice(-4));
    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-72" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-3 py-2 shadow-lg text-sm font-semibold ${toneStyles[toast.tone] ?? toneStyles.info}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
