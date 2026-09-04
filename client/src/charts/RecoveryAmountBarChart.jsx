import React from 'react';
import { CAUSE_LABELS } from '../utils/constants';
import { CAUSE_CHART_COLORS } from './chartTheme';
import { EmptyState } from '../components/common/EmptyState';
import { formatINR } from '../utils/formatters';

/**
 * RecoveryAmountBarChart — Bar chart showing recovery amount (₹) by cause
 */
export function RecoveryAmountBarChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No recovery amount data available"
        description="Run simulator events to populate recovered amount analytics."
        icon="💵"
        minHeight="py-12"
      />
    );
  }

  // Convert paise if amount_recovered >= 100
  const normalizedData = data.map((d) => {
    const rawAmt = d.amount_recovered || 0;
    const inr = rawAmt >= 100 ? rawAmt / 100 : rawAmt;
    return { ...d, inrAmount: inr };
  });

  const maxAmount = Math.max(1000, ...normalizedData.map((d) => d.inrAmount));

  return (
    <div className="w-full space-y-4">
      {normalizedData.map((item) => {
        const causeKey = item.cause || 'generic_decline';
        const label = CAUSE_LABELS[causeKey] || causeKey;
        const colorHex = CAUSE_CHART_COLORS[causeKey] || '#059669';
        const amount = item.inrAmount;
        const barWidth = `${Math.min(100, Math.max(3, (amount / maxAmount) * 100))}%`;

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
              <span className="font-black text-emerald-700 font-mono text-xs">{formatINR(amount)}</span>
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

