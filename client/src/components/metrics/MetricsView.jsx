import React from 'react';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricCard } from './MetricCard';
import { RecoveryRateBarChart } from '../../charts/RecoveryRateBarChart';
import { RecoveryAmountBarChart } from '../../charts/RecoveryAmountBarChart';
import { Card } from '../common/Card';
import { LoadingState } from '../common/LoadingState';
import { CauseBadge } from '../common/Badge';
import { formatINR, formatPercent, formatDuration, formatRelativeTime } from '../../utils/formatters';

export function MetricsView() {
  const { metrics, metricsLoading, lastUpdated } = useMetrics();

  if (metricsLoading && !metrics) {
    return <LoadingState message="Loading executive metrics & aggregations…" minHeight="py-24" />;
  }

  const m = metrics || {};
  const summary = m.summary || {};
  const byCauseList = m.recovery_by_cause_list || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── TOP HERO METRICS (DOMINANT TIER) ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Overall Recovery Rate"
          value={formatPercent(m.overall_recovery_rate || 0, 1)}
          subtitle={`${summary.total_recovered || 0} of ${summary.total_cases || 0} total cases successfully salvaged`}
          icon="🎯"
          colorScheme="emerald"
          hero={true}
        />

        <MetricCard
          title="Total Amount Recovered"
          value={m.total_amount_recovered_formatted || formatINR(m.total_amount_recovered || 0)}
          subtitle="Net funds recaptured autonomously via AI orchestration"
          icon="💰"
          colorScheme="emerald"
          hero={true}
        />
      </div>

      {/* ── SECONDARY SUPPORTING METRICS (4 CARDS) ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg. Time to Recovery"
          value={formatDuration(m.average_time_to_recovery || 0)}
          subtitle={`Engine latency: ${m.average_time_to_recovery_ms || 0} ms from failure`}
          icon="⚡"
          colorScheme="sky"
        />

        <MetricCard
          title="Contact-Cap Compliance"
          value={formatPercent(m.contact_cap_compliance_rate ?? 100, 1)}
          subtitle={`${summary.blocked_cases || 0} cases triggered stopping rules`}
          icon="🛡️"
          colorScheme="purple"
        />

        <MetricCard
          title="Promise-to-Paid Conversion"
          value={formatPercent(m.promise_to_paid_conversion_rate || 0, 1)}
          subtitle={`${summary.fulfilled_promises || 0} fulfilled / ${summary.total_promises || 0} promises`}
          icon="🤝"
          colorScheme="amber"
        />

        <MetricCard
          title="Total Cases Processed"
          value={(summary.total_cases || 0).toLocaleString()}
          subtitle={`${summary.unrecovered_cases || 0} in flight / ${summary.pending_promises || 0} pending promises`}
          icon="📊"
          colorScheme="indigo"
        />
      </div>

      {/* ── CHARTS ROW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Recovery Rate by Failure Cause"
          subtitle="Effectiveness of autonomous strategies by failure mode"
          icon="📈"
        >
          <RecoveryRateBarChart data={byCauseList} />
        </Card>

        <Card
          title="Amount Recovered by Cause"
          subtitle="Financial value recaptured grouped by root-cause taxonomy"
          icon="💵"
        >
          <RecoveryAmountBarChart data={byCauseList} />
        </Card>
      </div>

      {/* ── CAUSE BREAKDOWN TABLE ───────────────────────────────────── */}
      <Card
        title="Failure Cause Breakdown"
        subtitle="Volume, recoveries, and recaptured amount by failure taxonomy"
        icon="📋"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400">Failure Cause</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Total</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Recovered</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Rate</th>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byCauseList.map((item) => {
                const inr = item.amount_recovered >= 100 ? item.amount_recovered / 100 : item.amount_recovered;
                return (
                  <tr key={item.cause} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5">
                      <CauseBadge cause={item.cause} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-ui font-body text-slate-600">
                      {item.total_cases.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-ui font-body text-slate-600">
                      {item.recovered_cases.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-ui font-emphasis text-slate-900">
                      {formatPercent(item.recovery_rate, 1)}
                    </td>
                    <td className="py-3.5 px-5 text-right text-ui font-heading text-emerald-700">
                      {formatINR(inr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

