import React from 'react';
import { CauseBadge, OutcomeBadge, ChannelBadge } from '../common/Badge';
import { formatINR, formatDateTime, formatPercent } from '../../utils/formatters';

export function CaseTimeline({ caseData, onAdvancePromise, advancingPromise = false }) {
  if (!caseData) return null;

  const event = caseData.event || {};
  const payment = event.payload?.payment || caseData.payment || {};
  const subscription = event.payload?.subscription || {};
  const customer = caseData.customer || event.payload?.customer || {};
  const diagnosis = caseData.diagnosis;
  const recoveryActions = caseData.recovery_actions || [];
  const primaryAction = recoveryActions[0] || caseData.recovery_action;
  const outcomes = caseData.outcomes || [];
  const primaryOutcome = outcomes[0] || caseData.outcome;
  const promise = caseData.promise;
  const auditLogs = caseData.audit_logs || [];

  const rawAmount = payment.amount || 0;
  const inrAmount = rawAmount >= 100 ? rawAmount / 100 : rawAmount;
  const confidencePercent = diagnosis?.confidence ? diagnosis.confidence * 100 : null;

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl">

      {/* ── 1. PAYMENT INGESTION ─────────────────────────────────── */}
      <section className="rounded-3xl bg-white border border-slate-200/80 px-8 py-8 shadow-card sm:px-10">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-6 border-b border-slate-100">
          <div>
            <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-3">
              Ingested Transaction
            </span>
            <div className="flex items-baseline gap-4">
              {/* The failed amount — this IS the fact */}
              <span className="text-[3rem] sm:text-[3.75rem] font-editorial text-slate-950 tracking-tightest leading-none">
                {formatINR(inrAmount)}
              </span>
              <span className="text-caption font-emphasis text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-label">
                Failed
              </span>
            </div>
          </div>
          <div className="text-label font-mono text-slate-400">
            {formatDateTime(event.created_at || caseData.created_at)}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
          <div>
            <div className="text-label font-emphasis text-slate-400 uppercase tracking-label mb-1">Payment ID</div>
            <div className="font-mono text-ui font-emphasis text-slate-800 truncate" title={payment.id}>
              {payment.id || '—'}
            </div>
          </div>

          <div>
            <div className="text-label font-emphasis text-slate-400 uppercase tracking-label mb-1">Order ID</div>
            <div className="font-mono text-ui text-slate-600 truncate" title={payment.order_id}>
              {payment.order_id || '—'}
            </div>
          </div>

          <div>
            <div className="text-label font-emphasis text-slate-400 uppercase tracking-label mb-1">Customer</div>
            <div className="text-ui font-emphasis text-slate-800 truncate" title={customer.email || customer.contact}>
              {customer.email || customer.contact || customer.id || 'Guest'}
            </div>
          </div>

          <div>
            <div className="text-label font-emphasis text-slate-400 uppercase tracking-label mb-1">Segment</div>
            <div className="mt-0.5">
              <span className="inline-block px-2 py-0.5 rounded text-label uppercase font-emphasis tracking-label bg-slate-100 text-slate-600 border border-slate-200">
                {customer.segment || 'standard'}
              </span>
            </div>
          </div>
        </div>

        {subscription.id && (
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-5 text-caption text-slate-500">
            <span>Subscription: <strong className="font-mono font-emphasis text-slate-800">{subscription.id}</strong></span>
            <span>Status: <strong className="text-amber-700 capitalize font-emphasis">{subscription.status}</strong></span>
            <span>Retry Attempt: <strong className="font-mono font-emphasis text-slate-800">{subscription.retry_count ?? 0}</strong></span>
          </div>
        )}
      </section>

      {/* ── 2. WHY DID IT FAIL? ──────────────────────────────────── */}
      <section className="rounded-3xl bg-rose-50/50 border border-rose-200/80 px-8 py-8 shadow-card sm:px-10">
        {/* The label — quiet, directional */}
        <span className="text-label font-emphasis uppercase tracking-label text-rose-600 block mb-1">
          Root-Cause Diagnosis
        </span>
        <div className="text-body text-slate-500 mb-4">Why did this transaction fail?</div>

        {/* The answer — dominant. This is the visual centrepiece of the block. */}
        <h2 className="text-[2rem] sm:text-[2.75rem] font-editorial text-slate-950 tracking-tightest leading-tight">
          {diagnosis?.cause ? (
            <span className="capitalize">{diagnosis.cause.replace(/_/g, ' ')}</span>
          ) : (
            <span>{payment.error_reason || 'Unknown Decline'}</span>
          )}
        </h2>

        {/* Supporting metrics — clearly subordinate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-6 border-t border-rose-200/50">
          <div>
            <span className="text-label font-emphasis text-slate-500 uppercase tracking-label block mb-2">Model Confidence</span>
            <span className="text-[1.75rem] font-heading text-slate-900 block">
              {confidencePercent !== null ? formatPercent(confidencePercent, 1) : '—'}
            </span>
            {confidencePercent !== null && (
              <div className="w-full bg-rose-200/60 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-600"
                  style={{ width: `${Math.max(5, confidencePercent)}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <span className="text-label font-emphasis text-slate-500 uppercase tracking-label block mb-2">Self-Recovery</span>
            <div className="mt-1 text-body font-emphasis">
              {diagnosis?.self_recovers_likely ? (
                <span className="text-emerald-700">Likely — Transient</span>
              ) : (
                <span className="text-amber-700">Unlikely — Needs Intervention</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-label font-emphasis text-slate-500 uppercase tracking-label block mb-2">Gateway Code</span>
            <span className="font-mono text-ui font-emphasis text-slate-800 block mt-1">
              {payment.error_code || 'GATEWAY_DECLINE'}
            </span>
          </div>
        </div>

        {payment.error_description && (
          <div className="mt-5 rounded-xl bg-white border border-rose-200/80 px-4 py-3 text-ui text-rose-900 font-mono shadow-sm">
            <span className="text-rose-400 mr-2">&gt;</span>
            {payment.error_description}
          </div>
        )}

        {/* Diagnosis method — far-quieter metadata */}
        <div className="mt-4 text-label font-mono text-slate-400">
          {diagnosis?.diagnosis_method || 'rules+ml'} · {diagnosis?.model_version || 'v1'}
        </div>
      </section>

      {/* ── 3 & 4. WHAT DID REROUTE DECIDE & WHY? ──────────────── */}
      <section className="rounded-3xl bg-slate-950 text-white px-8 py-8 shadow-elevated sm:px-10">
        {/* Label */}
        <span className="text-label font-emphasis uppercase tracking-label text-emerald-400 block mb-1">
          Autonomous Decision
        </span>
        <div className="text-caption text-slate-400 mb-6">
          What action did ReRoute's policy engine dispatch?
        </div>

        {/* The decision — the dominant visual in the dark panel */}
        <div className="pb-6 border-b border-slate-800">
          <h2 className="text-[2rem] sm:text-[2.75rem] font-editorial text-white tracking-tightest leading-tight capitalize">
            {primaryAction?.action ? primaryAction.action.replace(/_/g, ' ') : 'Analyzing Incident…'}
          </h2>
          {primaryAction?.channel && (
            <div className="mt-3">
              <ChannelBadge channel={primaryAction.channel} className="bg-slate-800 text-slate-200 border-slate-700 text-ui px-3 py-1" />
            </div>
          )}

          {/* Strategy metadata — clearly subordinate */}
          <div className="mt-4 flex flex-wrap items-center gap-5 text-label font-mono text-slate-500">
            <span>Strategy: <strong className="text-slate-300 font-emphasis">{primaryAction?.timing || 'immediate'}</strong></span>
            <span>Status: <strong className="text-emerald-400 font-emphasis capitalize">{primaryAction?.status || 'allowed'}</strong></span>
            {primaryAction?.attempt_number && (
              <span>Attempt: <strong className="text-slate-300 font-emphasis">#{primaryAction.attempt_number}</strong></span>
            )}
          </div>
        </div>

        {/* ── 4. Policy Rationale — narrative prose, not a label ── */}
        <div className="mt-6">
          <span className="text-label font-emphasis uppercase tracking-label text-slate-500 block mb-4">
            Policy Engine Rationale
          </span>
          {/* This is the editorial moment — give it real prose size and breathing room */}
          <blockquote className="text-body-lg font-body text-slate-200 leading-[1.75] border-l-[3px] border-emerald-400 pl-5 py-1">
            "{primaryAction?.reason || 'Standard autonomous recovery strategy applied based on ML cause classification.'}"
          </blockquote>

          {primaryAction?.block_reason && (
            <div className="mt-5 rounded-xl bg-rose-950/80 border border-rose-500/50 px-4 py-3 text-caption text-rose-200">
              <strong className="text-rose-300 font-emphasis">Stopping Rule Triggered:</strong>{' '}
              {primaryAction.block_reason}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. CUSTOMER OUTREACH ─────────────────────────────────── */}
      <section className="rounded-3xl bg-white border border-slate-200/80 px-8 py-8 shadow-card sm:px-10">
        <div className="flex items-baseline justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
          <div>
            <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Customer Outreach
            </span>
            <h3 className="text-emphasis font-heading text-slate-900 tracking-tight">
              Dispatched Message Preview
            </h3>
          </div>
          {primaryAction?.executed_at && (
            <span className="text-label font-mono text-slate-400">
              {formatDateTime(primaryAction.executed_at)}
            </span>
          )}
        </div>

        {primaryAction?.message_sent ? (
          <div className="rounded-2xl bg-surface-100 border border-slate-200/80 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-200/60 text-label text-slate-500">
              <span>To: <strong className="font-mono font-emphasis text-slate-700">{customer.contact || customer.email || 'Customer'}</strong></span>
              <span className="text-slate-300">·</span>
              <span>via <strong className="text-slate-700 capitalize font-emphasis">{primaryAction.channel}</strong></span>
            </div>
            <p className="whitespace-pre-wrap text-body-lg leading-[1.75] text-slate-800 font-body">
              {primaryAction.message_sent}
            </p>
          </div>
        ) : (
          <p className="text-body text-slate-400 italic">
            {primaryAction?.status === 'blocked'
              ? 'Outreach was blocked by customer contact cap or stopping rules.'
              : 'No outbound message required for this policy.'}
          </p>
        )}
      </section>

      {/* ── 6 & 7. OUTCOME & FINANCIAL RECOVERY ─────────────────── */}
      <section className="rounded-3xl bg-white border border-slate-200/80 px-8 py-8 shadow-card sm:px-10">
        <div className="flex items-baseline justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
          <div>
            <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Outcome & Recovery
            </span>
            <h3 className="text-emphasis font-heading text-slate-900 tracking-tight">
              Financial Resolution
            </h3>
          </div>
          <OutcomeBadge outcome={primaryOutcome?.outcome} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <div>
            <span className="text-label font-emphasis text-slate-400 uppercase tracking-label block mb-2">Observed Outcome</span>
            <span className="text-emphasis font-heading text-slate-900 capitalize block">
              {primaryOutcome?.outcome ? primaryOutcome.outcome.replace(/_/g, ' ') : 'Pending'}
            </span>
          </div>

          <div>
            <span className="text-label font-emphasis text-slate-400 uppercase tracking-label block mb-2">Amount Recovered</span>
            <span className="text-[1.875rem] font-heading text-emerald-700 block tracking-tight">
              {formatINR(primaryOutcome?.amount_recovered || 0, true)}
            </span>
          </div>

          <div>
            <span className="text-label font-emphasis text-slate-400 uppercase tracking-label block mb-2">Resolution</span>
            <span className="font-mono text-ui font-emphasis text-slate-700 block">
              {formatDateTime(primaryOutcome?.created_at)}
            </span>
          </div>
        </div>
      </section>

      {/* ── PROMISE COMMITMENT ──────────────────────────────────── */}
      {promise && (
        <section className="rounded-3xl bg-amber-50/60 border border-amber-200 px-8 py-8 shadow-card sm:px-10">
          <div className="flex items-baseline justify-between gap-3 mb-6 pb-5 border-b border-amber-200/60">
            <div>
              <span className="text-label font-emphasis uppercase tracking-label text-amber-700 block mb-2">
                Promise-to-Pay
              </span>
              <h3 className="text-emphasis font-heading text-amber-950 tracking-tight">
                Scheduled Payment Commitment
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-label font-emphasis uppercase tracking-label border ${
                promise.status === 'fulfilled'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : promise.status === 'missed'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {promise.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="text-label font-emphasis text-slate-500 uppercase tracking-label mb-2">Promised Amount</div>
              <div className="text-[1.5rem] font-heading text-slate-900">
                {formatINR(promise.amount || inrAmount)}
              </div>
            </div>

            <div>
              <div className="text-label font-emphasis text-slate-500 uppercase tracking-label mb-2">Due Date</div>
              <div className="font-mono text-ui font-emphasis text-slate-800">
                {formatDateTime(promise.due_date)}
              </div>
            </div>

            <div>
              <div className="text-label font-emphasis text-slate-500 uppercase tracking-label mb-2">Status</div>
              <div className="text-ui font-emphasis text-slate-900 capitalize">{promise.status}</div>
            </div>

            <div>
              <div className="text-label font-emphasis text-slate-500 uppercase tracking-label mb-2">Resolved At</div>
              <div className="font-mono text-ui text-slate-700">
                {formatDateTime(promise.resolved_at)}
              </div>
            </div>
          </div>

          {promise.status === 'pending' && onAdvancePromise && (
            <div className="mt-6 pt-5 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-body text-amber-900">
                This promise is pending settlement. Fast-forward to test automatic resolution:
              </span>
              <button
                onClick={() => onAdvancePromise(caseData.id || caseData.event_id)}
                disabled={advancingPromise}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-emphasis text-ui transition-colors shadow-sm disabled:opacity-50"
              >
                {advancingPromise ? 'Advancing Time…' : '⏩ Fast-Forward & Resolve'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── 8. AUDIT TRAIL ──────────────────────────────────────── */}
      <section className="rounded-3xl bg-white border border-slate-200/80 px-8 py-8 shadow-card sm:px-10">
        <div className="flex items-baseline justify-between mb-6 pb-5 border-b border-slate-100">
          <div>
            <span className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Immutable Audit Trail
            </span>
            <h3 className="text-emphasis font-heading text-slate-900 tracking-tight">
              Decision History
              <span className="text-caption font-body text-slate-400 ml-2">({auditLogs.length} entries)</span>
            </h3>
          </div>
        </div>

        {auditLogs.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {auditLogs.map((log, idx) => (
              <div
                key={log._id || idx}
                className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-label text-slate-400">
                    {formatDateTime(log.timestamp || log.created_at)}
                  </span>
                  <span className="text-ui font-emphasis text-slate-800">
                    {log.action || log.event || 'Action'}
                  </span>
                  {log.channel && <ChannelBadge channel={log.channel} />}
                </div>

                <div className="flex items-center gap-2 text-label">
                  {log.previous_status && log.new_status && (
                    <span className="font-mono text-slate-400">
                      {log.previous_status} → <strong className="text-emerald-700 font-emphasis">{log.new_status}</strong>
                    </span>
                  )}
                  {log.outcome && <OutcomeBadge outcome={log.outcome} />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body text-slate-400 italic">
            No individual audit entries indexed for this payment ID yet.
          </p>
        )}
      </section>
    </div>
  );
}
