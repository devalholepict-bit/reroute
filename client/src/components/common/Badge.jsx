import React from 'react';
import {
  CAUSE_LABELS,
  CAUSE_COLORS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  STATUS_COLORS,
  CHANNEL_ICONS,
} from '../../utils/constants';

/**
 * CauseBadge — Standardized color-coded pill for failure causes
 */
export function CauseBadge({ cause, className = '' }) {
  if (!cause) return <span className="text-slate-400 text-xs">—</span>;
  const label = CAUSE_LABELS[cause] || cause;
  const config = CAUSE_COLORS[cause] || {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-tight ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * OutcomeBadge — Standardized color-coded pill for recovery outcomes
 */
export function OutcomeBadge({ outcome, className = '' }) {
  if (!outcome) return <span className="text-slate-400 text-xs font-mono">pending</span>;
  const label = OUTCOME_LABELS[outcome] || outcome;
  const config = OUTCOME_COLORS[outcome] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-tight ${config.badge} ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * StatusBadge — Standardized status pill for event lifecycle
 */
export function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const style = STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${style} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/**
 * ChannelBadge — Standardized channel pill
 */
export function ChannelBadge({ channel, className = '' }) {
  if (!channel) return null;
  const iconText = CHANNEL_ICONS[channel] || channel;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-medium ${className}`}
    >
      {iconText}
    </span>
  );
}

