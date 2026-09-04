import React from 'react';
import { formatINR, formatPercent } from '../utils/formatters';

/**
 * FunnelVisualChart — Visual flowchart diagram of the 4 recovery stages:
 * Failed → Contacted → Promised → Recovered
 */
export function FunnelVisualChart({ stages = [] }) {
  if (!stages || stages.length === 0) return null;

  const failedStage = stages.find((s) => s.id === 'failed') || { count: 0, amount: 0 };
  const contactedStage = stages.find((s) => s.id === 'contacted') || { count: 0, amount: 0 };
  const promisedStage = stages.find((s) => s.id === 'promised') || { count: 0, amount: 0 };
  const recoveredStage = stages.find((s) => s.id === 'recovered') || { count: 0, amount: 0 };

  const totalCount = Math.max(1, failedStage.count);

  const steps = [
    {
      id: 'failed',
      label: '1. Failed Ingested',
      subtitle: 'Failure Events',
      count: failedStage.count,
      amount: failedStage.amount,
      barColor: 'bg-rose-500',
      badgeColor: 'text-rose-800 bg-rose-50 border-rose-200',
      icon: '🚨',
      percentage: 100,
    },
    {
      id: 'contacted',
      label: '2. Contacted',
      subtitle: 'Policy Dispatched',
      count: contactedStage.count,
      amount: contactedStage.amount,
      barColor: 'bg-sky-500',
      badgeColor: 'text-sky-800 bg-sky-50 border-sky-200',
      icon: '📡',
      percentage: totalCount > 0 ? Math.min(100, (contactedStage.count / totalCount) * 100) : 0,
    },
    {
      id: 'promised',
      label: '3. Promised',
      subtitle: 'Pay Commitment',
      count: promisedStage.count,
      amount: promisedStage.amount,
      barColor: 'bg-amber-500',
      badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
      icon: '🤝',
      percentage: totalCount > 0 ? Math.min(100, (promisedStage.count / totalCount) * 100) : 0,
    },
    {
      id: 'recovered',
      label: '4. Recovered',
      subtitle: 'Funds Salvaged',
      count: recoveredStage.count,
      amount: recoveredStage.amount,
      barColor: 'bg-emerald-500',
      badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      icon: '💰',
      percentage: totalCount > 0 ? Math.min(100, (recoveredStage.count / totalCount) * 100) : 0,
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex flex-col">
            {/* Stage Card */}
            <div className="flex-1 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-card flex flex-col justify-between hover:shadow-elevated transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {step.label}
                  </span>
                  <span className="text-base select-none">{step.icon}</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {step.count.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">cases</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{step.subtitle}</div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span className="text-slate-400 text-[11px]">Volume</span>
                  <span className="font-bold text-slate-800">{formatINR(step.amount)}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${step.barColor} transition-all duration-300`}
                    style={{ width: `${Math.max(4, step.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Conversion</span>
                  <span className="font-semibold text-slate-700">{formatPercent(step.percentage, 1)}</span>
                </div>
              </div>
            </div>

            {/* Connecting Chevron Arrow for Desktop */}
            {idx < steps.length - 1 && (
              <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

