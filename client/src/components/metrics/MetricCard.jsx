import React from 'react';

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  colorScheme = 'indigo',
  hero = false,
}) {
  const valueColors = {
    indigo: 'text-slate-900',
    emerald: 'text-emerald-700',
    sky: 'text-sky-700',
    purple: 'text-slate-900',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
  };

  const valColor = valueColors[colorScheme] || 'text-slate-900';

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white px-7 py-6 shadow-card transition-all hover:shadow-elevated ${hero ? 'ring-1 ring-slate-900/5' : ''}`}>
      {/* Title label — quiet, tracked, purposeful */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-label font-emphasis uppercase tracking-label text-slate-400">
          {title}
        </span>
        {icon && <span className="text-lg select-none opacity-60">{icon}</span>}
      </div>

      {/* Value — the dominant element */}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${hero ? 'text-[2.75rem] sm:text-[3.25rem]' : 'text-[2rem] sm:text-[2.375rem]'} font-editorial tracking-tight leading-none ${valColor}`}>
          {value}
        </span>
        {badge}
      </div>

      {/* Subtitle — clearly subordinate */}
      {subtitle && (
        <p className="mt-3 text-caption text-slate-400 leading-relaxed">
          {trend && <span className="font-emphasis text-emerald-600 mr-1">{trend}</span>}
          {subtitle}
        </p>
      )}
    </div>
  );
}
