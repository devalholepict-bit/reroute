import React from 'react';

/**
 * ErrorState — Consistent, styled error container with retry/back options
 */
export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry = null,
  onBack = null,
  minHeight = 'py-12',
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-rose-200 bg-rose-50/60 p-6 sm:p-8 text-center flex flex-col items-center justify-center ${minHeight} ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 border border-rose-200 text-2xl text-rose-600 mb-3 select-none">
        ⚠️
      </div>
      <h4 className="text-sm font-bold text-rose-900 tracking-tight">{title}</h4>
      <p className="text-xs text-rose-700/80 mt-1 max-w-md leading-relaxed">{message}</p>
      
      <div className="flex items-center gap-2.5 mt-5">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            ← Back
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm transition-colors"
          >
            ↻ Retry
          </button>
        )}
      </div>
    </div>
  );
}

