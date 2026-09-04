import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

/**
 * Toast — Notification banner for simulator batches & operations
 */
export function Toast() {
  const { toast, hideToast } = useDashboard();
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  const style = isSuccess
    ? 'border-emerald-200 bg-white text-emerald-900 shadow-elevated'
    : isError
    ? 'border-rose-200 bg-white text-rose-900 shadow-elevated'
    : 'border-slate-200 bg-white text-slate-900 shadow-elevated';

  const icon = isSuccess ? '✅' : isError ? '❌' : 'ℹ️';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${style}`}
      >
        <span className="text-sm select-none">{icon}</span>
        <p className="text-xs font-semibold max-w-sm leading-snug">{toast.message}</p>
        <button
          onClick={hideToast}
          className="ml-2 text-slate-400 hover:text-slate-700 transition-colors text-xs font-bold p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

