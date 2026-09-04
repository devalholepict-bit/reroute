import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useCases } from '../hooks/useCases';
import { CaseExplorer } from '../components/cases/CaseExplorer';
import { CaseDetailView } from '../components/cases/CaseDetailView';

export function CaseDetailPage() {
  const { selectedCaseId, setSelectedCaseId } = useDashboard();
  const {
    selectedCaseDetail,
    detailLoading,
    detailError,
    refreshDetail,
  } = useCases({ caseId: selectedCaseId, pollingEnabled: false });

  // If a case is selected, render the full deep vertical timeline
  if (selectedCaseId) {
    return (
      <CaseDetailView
        caseDetail={selectedCaseDetail}
        loading={detailLoading}
        error={detailError}
        onBack={() => setSelectedCaseId(null)}
        onRefresh={refreshDetail}
      />
    );
  }

  // Otherwise render the case explorer table
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Case Explorer & Investigation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Click any recovery case below to inspect its exhaustive investigation narrative: root-cause diagnosis, verbatim policy rationale, outreach copy, and financial resolution.
        </p>
      </div>

      <CaseExplorer onSelectCase={(id) => setSelectedCaseId(id)} />
    </div>
  );
}

