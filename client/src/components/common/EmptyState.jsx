import React from 'react';

/**
 * EmptyState — Consistent, styled empty list/table placeholder
 */
export function EmptyState({
  title = 'No records found',
  description = 'No matching data found for the current query or filter criteria.',
  icon = '📭',
  action = null,
  minHeight = 'py-16',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${minHeight} ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-2xl mb-3 select-none">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

