import React from 'react';

/**
 * Spinner — Loading spinner with size and label support
 */
export function Spinner({ size = 'md', label = 'Loading…', className = '' }) {
  const sizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className={`flex items-center justify-center gap-2.5 text-slate-500 ${className}`}>
      <svg
        className={`animate-spin ${sizeClass} text-slate-800`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
    </div>
  );
}

export function SkeletonRow({ count = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-200/70 rounded-xl w-full" />
      ))}
    </div>
  );
}

