import React, { useState } from 'react';
import { MetricsView } from '../components/metrics/MetricsView';
import { AuditLogView } from '../components/audit/AuditLogView';

export function MetricsAuditPage() {
  const [activeSubTab, setActiveSubTab] = useState('metrics'); // 'metrics' | 'audit'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sub-tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[1.5rem] sm:text-[1.875rem] font-heading text-slate-950 tracking-tight">
            {activeSubTab === 'metrics' ? 'Metrics & Analytics' : 'Compliance & Audit Trail'}
          </h1>
          <p className="text-body text-slate-500 mt-1.5">
            {activeSubTab === 'metrics'
              ? 'Real-time aggregated recovery performance, conversion rates, and SLA latency.'
              : 'Immutable chronological event ledger tracking all autonomous AI decisions.'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveSubTab('metrics')}
            className={`rounded-lg px-4 py-2 text-ui font-emphasis transition-all ${
              activeSubTab === 'metrics'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Metrics & Charts
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`rounded-lg px-4 py-2 text-ui font-emphasis transition-all ${
              activeSubTab === 'audit'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {activeSubTab === 'metrics' ? <MetricsView /> : <AuditLogView />}
    </div>
  );
}

