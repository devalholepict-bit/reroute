import React from 'react';
import { useMetrics } from '../../hooks/useMetrics';
import { useCases } from '../../hooks/useCases';
import { useDashboard } from '../../context/DashboardContext';
import { FunnelVisualChart } from '../../charts/FunnelVisualChart';
import { LiveCaseStream } from './LiveCaseStream';
import { Card } from '../common/Card';
import { Spinner } from '../common/Spinner';
import { LoadingState } from '../common/LoadingState';
import { CauseBadge } from '../common/Badge';
import { formatINR, formatPercent, formatRelativeTime } from '../../utils/formatters';
import { runDemoBatch } from '../../services/simulatorService';

export function FunnelView() {
  const { metrics, metricsLoading, lastUpdated: metricsTime } = useMetrics();
  const { cases, casesLoading } = useCases({ limit: 50 });
  const { isSimulatorRunning, setIsSimulatorRunning, showToast, refreshAll } = useDashboard();

  const summary = metrics?.summary || {};
  const totalCases = summary.total_cases || cases.length || 0;
  const recoveredCases = summary.total_recovered || 0;
  const unrecoveredCases = summary.unrecovered_cases || Math.max(0, totalCases - recoveredCases);
  const totalPromises = summary.total_promises || 0;

  // Compute stage volume amounts from cases
  const totalFailedAmount = cases.reduce((sum, c) => {
    const raw = c.payment?.amount || c.payload?.payment?.amount || 0;
    const inr = raw >= 100 ? raw / 100 : raw;
    return sum + inr;
  }, 0);

  const totalRecoveredAmount = metrics?.total_amount_recovered || 0;
  const recoveryRate = metrics?.overall_recovery_rate || 0;
  const complianceRate = metrics?.contact_cap_compliance_rate ?? 100;
  const causeBreakdown = metrics?.recovery_by_cause_list || [];

  // Stages array for Funnel Visual
  const stages = [
    {
      id: 'failed',
      count: totalCases,
      amount: totalFailedAmount || totalRecoveredAmount * 3.5,
    },
    {
      id: 'contacted',
      count: Math.max(0, totalCases - (summary.blocked_cases || 0)),
      amount: totalFailedAmount ? totalFailedAmount * 0.95 : 0,
    },
    {
      id: 'promised',
      count: totalPromises,
      amount: (totalPromises * 1499),
    },
    {
      id: 'recovered',
      count: recoveredCases,
      amount: totalRecoveredAmount,
    },
  ];

  const handleQuickDemo = async () => {
    if (isSimulatorRunning) return;
    setIsSimulatorRunning(true);
    try {
      await runDemoBatch(5);
      showToast('Demo batch executed! 5 diverse cases processed through AI pipeline.', 'success');
      refreshAll();
    } catch (err) {
      showToast(err.message || 'Failed to execute demo batch', 'error');
    } finally {
      setIsSimulatorRunning(false);
    }
  };

  if (metricsLoading && !metrics && cases.length === 0) {
    return <LoadingState message="Loading live recovery funnel…" />;
  }

  return (
    <div className="space-y-16 animate-fade-in">
      {/* ── SECTION 1: EDITORIAL HERO ────────────────────────────── */}
      <section className="relative rounded-3xl bg-white border border-slate-200/80 px-8 pt-10 pb-10 shadow-card sm:px-12 sm:pt-14">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pb-10 border-b border-slate-100">
          <div className="max-w-2xl">
            {/* Live pill — quiet, not decorative */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-label font-emphasis uppercase tracking-label text-slate-500">Real-Time Autonomous Recovery</span>
            </div>

            {/* Hero headline — the biggest statement on the page */}
            <h1 className="text-[2.75rem] sm:text-[3.5rem] font-editorial text-slate-950 tracking-tightest leading-[1.05]">
              Recover more from<br className="hidden sm:block" /> the payments that fail.
            </h1>

            <p className="mt-5 text-body text-slate-500 leading-relaxed max-w-xl">
              Autonomous ML-driven failure taxonomy, dynamic policy selection, and automated multi-channel customer outreach.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleQuickDemo}
              disabled={isSimulatorRunning}
              className="flex items-center gap-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-emphasis text-body px-6 py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSimulatorRunning ? <Spinner size="sm" label="Simulating Pipeline…" className="text-white" /> : (
                <>
                  <span>🚀</span>
                  <span>Run Demo Batch</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Hero KPI Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pt-10 items-start">
          {/* Dominant Hero KPI — recovered amount */}
          <div className="md:col-span-5">
            <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block">
              Total Recovered
            </span>
            <div className="mt-3 text-[3.5rem] sm:text-[4.5rem] font-editorial text-emerald-700 tracking-tightest leading-none">
              {formatINR(totalRecoveredAmount)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center text-caption font-emphasis text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                ✓ {recoveredCases} of {totalCases} cases salvaged
              </span>
            </div>
          </div>

          {/* Secondary KPIs — supporting, not competing */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6 pt-2">
            <div>
              <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block">
                Recovery Rate
              </span>
              <span className="mt-2 text-[1.75rem] font-heading text-slate-900 block tracking-tight">
                {formatPercent(recoveryRate, 1)}
              </span>
              <span className="text-caption text-slate-400 mt-1 block">
                Success conversion
              </span>
            </div>

            <div>
              <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block">
                At-Risk Volume
              </span>
              <span className="mt-2 text-[1.75rem] font-heading text-slate-900 block tracking-tight">
                {formatINR(totalFailedAmount)}
              </span>
              <span className="text-caption text-slate-400 mt-1 block">
                {totalCases} ingested events
              </span>
            </div>

            <div>
              <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block">
                Cap Compliance
              </span>
              <span className="mt-2 text-[1.75rem] font-heading text-slate-900 block tracking-tight">
                {formatPercent(complianceRate, 1)}
              </span>
              <span className="text-caption text-slate-400 mt-1 block">
                Stopping rules enforced
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: RECOVERY PIPELINE ──────────────────────── */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h2 className="text-section font-heading text-slate-900 tracking-tight">
              Recovery Pipeline
            </h2>
            <p className="text-caption text-slate-400 mt-1">
              Live funnel across autonomous stages — Ingestion · Policy Outreach · Promise · Resolution
            </p>
          </div>
          {metricsTime && (
            <div className="text-label font-mono text-slate-400 uppercase tracking-label">
              Polled {formatRelativeTime(metricsTime)}
            </div>
          )}
        </div>

        <Card className="p-6">
          <FunnelVisualChart stages={stages} />
        </Card>
      </section>

      {/* ── SECTION 3: FAILURE-CAUSE INTELLIGENCE ─────────────── */}
      {causeBreakdown.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-section font-heading text-slate-900 tracking-tight">
              Failure-Cause Intelligence
            </h2>
            <p className="text-caption text-slate-400 mt-1">
              AI root-cause breakdown with differentiated recovery outcomes by failure taxonomy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {causeBreakdown.slice(0, 6).map((item) => {
              const inr = item.amount_recovered >= 100 ? item.amount_recovered / 100 : item.amount_recovered;
              return (
                <div
                  key={item.cause}
                  className="rounded-2xl bg-white border border-slate-200/80 px-6 py-5 shadow-card hover:shadow-elevated transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <CauseBadge cause={item.cause} />
                    <span className="text-label font-mono font-emphasis text-slate-500">
                      {item.total_cases} cases
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-[1.875rem] font-heading text-slate-900 tracking-tight">
                      {formatPercent(item.recovery_rate, 1)}
                    </span>
                    <span className="text-caption font-emphasis text-emerald-700">
                      {formatINR(inr)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1 mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-800"
                      style={{ width: `${Math.max(4, Math.min(100, item.recovery_rate))}%` }}
                    />
                  </div>

                  <div className="text-label text-slate-400 mt-2 flex justify-between">
                    <span>{item.recovered_cases} resolved</span>
                    <span>{item.total_cases - item.recovered_cases} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SECTION 4: LIVE CASE STREAM ───────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-section font-heading text-slate-900 tracking-tight">
              Live Recovery Stream
            </h2>
            <p className="text-caption text-slate-400 mt-1">
              Click any case to inspect its AI diagnosis and policy decision rationale
            </p>
          </div>
          {casesLoading && <Spinner size="sm" label="Updating…" />}
        </div>

        <Card bodyClassName="p-0">
          <LiveCaseStream cases={cases} loading={casesLoading} />
        </Card>
      </section>
    </div>
  );
}
