import React from 'react';

/**
 * StatusPill — Health & connection indicator pill for services
 */
export function StatusPill({ label, status, detail }) {
  const isOk = status === 'ok' || status === 'connected';
  const isErr = status === 'error' || status === 'disconnected';

  const dotColor = isOk ? 'bg-emerald-500' : isErr ? 'bg-rose-500' : 'bg-amber-400 animate-pulse';
  const text = isOk ? 'Connected' : isErr ? 'Disconnected' : 'Checking…';

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200 px-2.5 py-1 text-[11px]">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="font-medium text-slate-500">{label}:</span>
      <span className={`font-semibold ${isOk ? 'text-emerald-700' : isErr ? 'text-rose-700' : 'text-amber-700'}`}>
        {detail || text}
      </span>
    </div>
  );
}

