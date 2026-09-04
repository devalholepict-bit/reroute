import React, { useState } from 'react';
import { useAudit } from '../../hooks/useAudit';
import { useDashboard } from '../../context/DashboardContext';
import { CauseBadge, OutcomeBadge, ChannelBadge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { CAUSES, CAUSE_LABELS, OUTCOMES, OUTCOME_LABELS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

export function AuditLogView() {
  const { navigateToCase } = useDashboard();
  const [filterCause, setFilterCause] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [paymentIdQuery, setPaymentIdQuery] = useState('');
  const [selectedLogJson, setSelectedLogJson] = useState(null);

  const { auditLogs, auditLoading } = useAudit({
    cause: filterCause,
    outcome: filterOutcome,
    payment_id: paymentIdQuery,
    limit: 100,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Payment / Case ID
            </label>
            <input
              type="text"
              placeholder="pay_xxx or evt_xxx"
              value={paymentIdQuery}
              onChange={(e) => setPaymentIdQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none font-mono shadow-sm"
            />
          </div>

          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Failure Cause
            </label>
            <select
              value={filterCause}
              onChange={(e) => setFilterCause(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none shadow-sm"
            >
              <option value="">All Causes</option>
              {CAUSES.map((c) => (
                <option key={c} value={c}>
                  {CAUSE_LABELS[c] || c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Outcome
            </label>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none shadow-sm"
            >
              <option value="">All Outcomes</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABELS[o] || o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filterCause || filterOutcome || paymentIdQuery) && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-caption text-slate-500">
              <strong className="text-slate-900 font-emphasis">{auditLogs.length}</strong> audit entries
            </span>
            <button
              onClick={() => {
                setFilterCause('');
                setFilterOutcome('');
                setPaymentIdQuery('');
              }}
              className="text-ui font-emphasis text-slate-500 hover:text-slate-900 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* JSON inspect modal */}
      {selectedLogJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-slate-950 text-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-label font-mono text-slate-300">
              <span>Audit Log: {selectedLogJson._id}</span>
              <button
                onClick={() => setSelectedLogJson(null)}
                className="text-slate-400 hover:text-white font-emphasis text-body p-1"
              >
                ✕
              </button>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-label text-emerald-400 border border-slate-800 leading-relaxed">
              {JSON.stringify(selectedLogJson, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400">Timestamp</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Payment / Event ID</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Customer</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Action</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Cause</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Transition</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Outcome</th>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => {
                const paymentId = log.payment_id || log.event_id || '—';
                return (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-4 px-5 font-mono text-label text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.timestamp || log.created_at)}
                    </td>

                    <td className="py-4 px-4 font-mono text-label">
                      <button
                        onClick={() => navigateToCase(paymentId)}
                        className="text-slate-700 font-emphasis hover:text-emerald-700 hover:underline truncate max-w-[140px] block"
                        title={paymentId}
                      >
                        {paymentId.substring(0, 16)}…
                      </button>
                    </td>

                    <td className="py-4 px-4 font-mono text-label text-slate-500">
                      {log.customer_id ? log.customer_id.substring(0, 14) + '…' : '—'}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ui font-emphasis text-slate-800 capitalize">
                          {log.action || log.event || 'Action'}
                        </span>
                        {log.channel && <ChannelBadge channel={log.channel} />}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <CauseBadge cause={log.cause} />
                    </td>

                    <td className="py-4 px-4 font-mono text-label whitespace-nowrap">
                      {log.previous_status && log.new_status ? (
                        <span>
                          <span className="text-slate-400">{log.previous_status}</span>
                          <span className="text-slate-300 mx-1">→</span>
                          <strong className="text-emerald-700 font-emphasis">{log.new_status}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <OutcomeBadge outcome={log.outcome} />
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLogJson(log)}
                        className="rounded-lg bg-slate-100 hover:bg-slate-950 hover:text-white px-2.5 py-1 text-label font-mono font-emphasis text-slate-600 transition-colors"
                      >
                        JSON
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {auditLoading && auditLogs.length === 0 && (
          <LoadingState message="Loading audit trail…" minHeight="py-16" />
        )}

        {!auditLoading && auditLogs.length === 0 && (
          <EmptyState
            title="No audit logs found"
            description="No audit logs matched the current filter criteria."
            icon="📋"
            minHeight="py-16"
          />
        )}
      </div>
    </div>
  );
}
