import React, { useState } from 'react';
import { CaseTimeline } from './CaseTimeline';
import { advancePromiseTime } from '../../services/promisesService';
import { useDashboard } from '../../context/DashboardContext';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { CauseBadge, OutcomeBadge, StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/formatters';

export function CaseDetailView({
  caseDetail,
  loading = false,
  error = null,
  onBack,
  onRefresh,
}) {
  const { showToast, refreshAll } = useDashboard();
  const [advancingPromise, setAdvancingPromise] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleAdvancePromise = async (caseId) => {
    setAdvancingPromise(true);
    try {
      const res = await advancePromiseTime(caseId);
      showToast(`Promise resolved: ${res.resolution || res.event_status}`, 'success');
      refreshAll();
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to advance promise time', 'error');
    } finally {
      setAdvancingPromise(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading case investigation narrative…" minHeight="py-20" />;
  }

  if (error || !caseDetail) {
    return (
      <ErrorState
        title={error || 'Case Details Not Found'}
        message="The requested case ID could not be loaded or was not found in the database."
        onBack={onBack}
        minHeight="py-16"
      />
    );
  }

  const caseId = caseDetail.id || caseDetail.event_id;
  const event = caseDetail.event || {};
  const payment = event.payload?.payment || caseDetail.payment || {};
  const rawAmt = payment.amount || 0;
  const inr = rawAmt >= 100 ? rawAmt / 100 : rawAmt;
  const cause = caseDetail.diagnosis?.cause || payment.error_reason;
  const outcome = caseDetail.outcomes?.[0]?.outcome || caseDetail.outcome?.outcome;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-ui font-emphasis text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <span>←</span>
            <span>All Cases</span>
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-body font-heading text-slate-900">
                {caseId}
              </h2>
              <StatusBadge status={event.status || caseDetail.status} />
            </div>
            <div className="text-caption text-slate-500 flex items-center gap-2 mt-1">
              <span><strong className="text-slate-800 font-emphasis">{formatINR(inr)}</strong></span>
              <span className="text-slate-300">·</span>
              <CauseBadge cause={cause} />
              {outcome && (
                <>
                  <span className="text-slate-300">·</span>
                  <OutcomeBadge outcome={outcome} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-ui font-emphasis text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {showRawJson ? 'Hide JSON' : '🔍 Raw JSON'}
          </button>

          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-ui font-emphasis text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Raw JSON Debug view if toggled */}
      {showRawJson && (
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 shadow-elevated text-white animate-fade-in">
          <div className="flex justify-between items-center mb-3 text-label font-mono text-slate-400 border-b border-slate-800 pb-2">
            <span>Payload Inspector: GET /api/cases/{caseId}</span>
            <button
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(caseDetail, null, 2))}
              className="text-emerald-400 hover:underline font-emphasis text-ui"
            >
              Copy JSON
            </button>
          </div>
          <pre className="max-h-80 overflow-auto font-mono text-label text-emerald-400 leading-relaxed">
            {JSON.stringify(caseDetail, null, 2)}
          </pre>
        </div>
      )}

      {/* Narrative Lifecycle Investigation */}
      <CaseTimeline
        caseData={caseDetail}
        onAdvancePromise={handleAdvancePromise}
        advancingPromise={advancingPromise}
      />
    </div>
  );
}
