import React, { useState, useMemo } from 'react';
import { useCases } from '../../hooks/useCases';
import { CauseBadge, OutcomeBadge, ChannelBadge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { CAUSES, CAUSE_LABELS, OUTCOMES, OUTCOME_LABELS } from '../../utils/constants';
import { formatINR, formatRelativeTime } from '../../utils/formatters';

export function CaseExplorer({ onSelectCase }) {
  const [filterCause, setFilterCause] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { cases, casesLoading } = useCases({
    cause: filterCause,
    outcome: filterOutcome,
    status: filterStatus,
    limit: 100,
  });

  // Client-side instant text search
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase().trim();
    return cases.filter((c) => {
      const caseId = (c.id || c.event_id || '').toLowerCase();
      const paymentId = (c.payment?.id || c.payload?.payment?.id || '').toLowerCase();
      const email = (c.customer?.email || '').toLowerCase();
      const contact = (c.customer?.contact || '').toLowerCase();
      const cause = (c.diagnosis?.cause || c.payment?.error_reason || '').toLowerCase();
      return (
        caseId.includes(q) ||
        paymentId.includes(q) ||
        email.includes(q) ||
        contact.includes(q) ||
        cause.includes(q)
      );
    });
  }, [cases, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Search Cases
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ID, email, phone, cause…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 pl-9 text-ui text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none transition-all shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-caption text-slate-400 select-none">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-caption text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Cause Filter */}
          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Failure Cause
            </label>
            <select
              value={filterCause}
              onChange={(e) => setFilterCause(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none transition-all shadow-sm"
            >
              <option value="">All Causes ({CAUSES.length})</option>
              {CAUSES.map((c) => (
                <option key={c} value={c}>
                  {CAUSE_LABELS[c] || c}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Outcome
            </label>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none transition-all shadow-sm"
            >
              <option value="">All Outcomes</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABELS[o] || o}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-label font-emphasis uppercase tracking-label text-slate-400 block mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-ui text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none transition-all shadow-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending_diagnosis">Pending Diagnosis</option>
              <option value="diagnosed">Diagnosed</option>
              <option value="policy_applied">Policy Applied</option>
              <option value="executed">Executed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {(filterCause || filterOutcome || filterStatus || searchQuery) && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-caption text-slate-500">
              <strong className="text-slate-900 font-emphasis">{filteredCases.length}</strong> matching cases
            </span>
            <button
              onClick={() => {
                setFilterCause('');
                setFilterOutcome('');
                setFilterStatus('');
                setSearchQuery('');
              }}
              className="text-ui font-emphasis text-slate-500 hover:text-slate-900 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Case Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400">Amount</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Failure Cause</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Decision</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Customer</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400">Outcome</th>
                <th className="py-3.5 px-4 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Time</th>
                <th className="py-3.5 px-5 text-label font-emphasis uppercase tracking-label text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => {
                const caseId = c.id || c.event_id;
                const rawAmount = c.payment?.amount || c.payload?.payment?.amount || 0;
                const inrAmount = rawAmount >= 100 ? rawAmount / 100 : rawAmount;
                const cause = c.diagnosis?.cause || c.payment?.error_reason;
                const action = c.recovery_action?.action;
                const channel = c.recovery_action?.channel;
                const outcome = c.outcome?.outcome;

                return (
                  <tr
                    key={caseId}
                    onClick={() => onSelectCase(caseId)}
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
                          {action ? action.replace(/_/g, ' ') : '—'}
                        </span>
                        {channel && <ChannelBadge channel={channel} />}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-ui font-body text-slate-700">
                        {c.customer?.email || c.customer?.contact || c.customer?.id || 'Guest'}
                      </div>
                      <div className="font-mono text-label text-slate-400 mt-0.5">
                        {caseId.substring(0, 14)}…
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
                          onSelectCase(caseId);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 group-hover:bg-slate-950 group-hover:text-white px-3 py-1.5 text-ui font-emphasis text-slate-700 transition-all duration-150"
                      >
                        <span>Investigate</span>
                        <span className="text-slate-400 group-hover:text-emerald-400">→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {casesLoading && filteredCases.length === 0 && (
          <LoadingState message="Loading recovery cases…" minHeight="py-16" />
        )}

        {!casesLoading && filteredCases.length === 0 && (
          <EmptyState
            title="No matching recovery cases"
            description="No recovery cases match the current filter or search criteria."
            icon="🔍"
            minHeight="py-16"
          />
        )}
      </div>
    </div>
  );
}
