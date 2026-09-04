import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { CauseBadge, OutcomeBadge, ChannelBadge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { formatINR, formatRelativeTime } from '../../utils/formatters';

export function LiveCaseStream({ cases = [], loading = false }) {
  const { navigateToCase } = useDashboard();

  if (loading && cases.length === 0) {
    return <LoadingState message="Loading live case stream…" minHeight="py-12" />;
  }

  if (cases.length === 0) {
    return (
      <EmptyState
        title="No recovery cases observed yet"
        description="Run a Demo Batch to begin autonomous AI recovery processing."
        icon="📡"
        minHeight="py-12"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-slate-100 bg-slate-50/70">
          <tr>
            <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400">Amount</th>
            <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Failure Cause</th>
            <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Decision</th>
            <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Outcome</th>
            <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Time</th>
            <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Inspect</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.slice(0, 15).map((c) => {
            const caseId = c.id || c.event_id;
            const rawAmount = c.payment?.amount || c.payload?.payment?.amount || 0;
            const inrAmount = rawAmount >= 100 ? rawAmount / 100 : rawAmount;
            const cause = c.diagnosis?.cause || c.payment?.error_reason || 'generic_decline';
            const action = c.recovery_action?.action;
            const channel = c.recovery_action?.channel;
            const outcome = c.outcome?.outcome;

            return (
              <tr
                key={caseId}
                onClick={() => navigateToCase(caseId)}
                className="group cursor-pointer hover:bg-slate-50/90 transition-colors duration-150"
              >
                <td className="py-4 px-5 text-body font-heading text-slate-900 whitespace-nowrap">
                  {formatINR(inrAmount)}
                </td>

                <td className="py-4 px-4">
                  <CauseBadge cause={cause} />
                </td>

                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-ui font-emphasis text-slate-800 capitalize">
                      {action ? action.replace(/_/g, ' ') : 'Analyzing…'}
                    </span>
                    {channel && <ChannelBadge channel={channel} />}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <OutcomeBadge outcome={outcome} />
                </td>

                <td className="py-4 px-4 text-right font-mono text-label text-slate-400 whitespace-nowrap">
                  {formatRelativeTime(c.created_at)}
                </td>

                <td className="py-4 px-5 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCase(caseId);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 group-hover:bg-slate-950 group-hover:text-white px-3 py-1.5 text-ui font-emphasis text-slate-700 transition-all duration-150"
                  >
                    <span>Inspect</span>
                    <span className="text-slate-400 group-hover:text-emerald-400">→</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
