import React from 'react';
import { formatINR, formatPercent } from '../../utils/formatters';

export function FunnelStageCard({
  title,
  count,
  amount,
  rate,
  rateLabel = 'Conversion',
  icon,
  accentColor = 'indigo',
  description,
}) {
  const colorMap = {
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-400 from-rose-500 to-rose-600',
    sky: 'border-sky-500/30 bg-sky-500/5 text-sky-400 from-sky-500 to-sky-600',
    indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 from-indigo-500 to-indigo-600',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 from-emerald-500 to-emerald-600',
  };

  const selectedTheme = colorMap[accentColor] || colorMap.indigo;

  return (
    <div
      className={`rounded-xl border bg-slate-900/80 p-5 shadow-lg backdrop-blur-md transition-all hover:border-slate-700 ${selectedTheme.split(' ')[0]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-label font-emphasis uppercase tracking-label text-slate-400">
          {title}
        </span>
        <span className="text-lg opacity-70">{icon}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[1.75rem] font-heading text-white tracking-tight">
          {Number(count || 0).toLocaleString()}
        </span>
        <span className="text-label text-slate-400">cases</span>
      </div>

      {description && <p className="text-caption text-slate-500 mt-1">{description}</p>}

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-label text-slate-500">Volume</div>
          <div className="text-ui font-emphasis text-slate-200">{formatINR(amount || 0)}</div>
        </div>

        {rate !== undefined && (
          <div className="text-right">
            <div className="text-label text-slate-500">{rateLabel}</div>
            <div className={`text-ui font-emphasis ${selectedTheme.split(' ')[2]}`}>
              {formatPercent(rate, 1)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
