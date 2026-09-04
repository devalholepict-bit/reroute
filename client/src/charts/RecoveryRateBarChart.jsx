import React from 'react';
import { CAUSE_LABELS } from '../utils/constants';
import { CAUSE_CHART_COLORS } from './chartTheme';
import { EmptyState } from '../components/common/EmptyState';
import { formatPercent } from '../utils/formatters';

/**
 * RecoveryRateBarChart — Bar chart showing recovery rate % by cause
 */
export function RecoveryRateBarChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No cause metrics recorded yet"
        description="Run simulator events to populate recovery rate analytics by cause."
        icon="📊"
        minHeight="py-12"
      />
    );
  }

  // Find max recovery rate for scaling (at least 10% to prevent div by zero)
  const maxRate = Math.max(10, ...data.map((d) => d.recovery_rate || 0));

  return (
    <div className="w-full space-y-4">
      {data.map((item) => {
        const causeKey = item.cause || 'generic_decline';
        const label = CAUSE_LABELS[causeKey] || causeKey;
        const colorHex = CAUSE_CHART_COLORS[causeKey] || '#64748b';
        const rate = item.recovery_rate || 0;
        const total = item.total_cases || 0;
        const recovered = item.recovered_cases || 0;
        const barWidth = `${Math.min(100, Math.max(4, (rate / maxRate) * 100))}%`;

        return (
          <div key={causeKey} className="group flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 group-hover:text-slate-950 transition-colors flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: colorHex }}
                />
                {label}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-slate-400 text-[11px] font-mono">
                  {recovered}/{total} resolved
                </span>
                <span className="font-black text-slate-900 font-mono text-xs">{formatPercent(rate, 1)}</span>
              </div>
            </div>

            {/* Bar Track */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: barWidth,
                  backgroundColor: colorHex,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

