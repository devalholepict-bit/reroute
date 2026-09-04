import React, { useState, useEffect } from 'react';
import { runDemoBatch, triggerSimulatorBatch } from '../../services/simulatorService';
import { advancePromiseTime, fetchPromises } from '../../services/promisesService';
import { useDashboard } from '../../context/DashboardContext';
import { CAUSES, CAUSE_LABELS } from '../../utils/constants';
import { Spinner } from '../common/Spinner';

export function SimulatorControls() {
  const {
    isSimulatorRunning,
    setIsSimulatorRunning,
    showToast,
    refreshAll,
    navigateToCase,
  } = useDashboard();

  const [simCause, setSimCause] = useState('');
  const [simCount, setSimCount] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advance Time state
  const [pendingPromises, setPendingPromises] = useState([]);
  const [selectedPromiseCaseId, setSelectedPromiseCaseId] = useState('');
  const [customCaseId, setCustomCaseId] = useState('');
  const [forceStatus, setForceStatus] = useState('');

  // Fetch pending promises for dropdown
  const loadPendingPromises = async () => {
    try {
      const list = await fetchPromises();
      const pending = Array.isArray(list) ? list.filter((p) => p.status === 'pending') : [];
      setPendingPromises(pending);
      if (pending.length > 0 && !selectedPromiseCaseId) {
        setSelectedPromiseCaseId(pending[0].case_id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPendingPromises();
  }, []);

  // 1. Run Demo Batch (5 cases across distinct causes)
  const handleRunDemo = async () => {
    if (isSimulatorRunning) return;
    setIsSimulatorRunning(true);
    try {
      await runDemoBatch(5);
      showToast(
        `Demo batch executed! Created 5 diverse cases across causes.`,
        'success'
      );
      refreshAll();
      loadPendingPromises();
    } catch (err) {
      showToast(err.message || 'Failed to run demo batch', 'error');
    } finally {
      setIsSimulatorRunning(false);
    }
  };

  // 2. Trigger Random / Configured Batch
  const handleTriggerBatch = async () => {
    if (isSimulatorRunning) return;
    setIsSimulatorRunning(true);
    try {
      const result = await triggerSimulatorBatch({ count: simCount, cause: simCause, full: true });
      const count = result.created?.length || 0;
      showToast(`Generated and processed ${count} simulator event(s)!`, 'success');
      refreshAll();
      loadPendingPromises();
    } catch (err) {
      showToast(err.message || 'Failed to trigger batch', 'error');
    } finally {
      setIsSimulatorRunning(false);
    }
  };

  // 3. Advance Time for Promise
  const handleAdvanceTime = async () => {
    const targetCaseId = selectedPromiseCaseId || customCaseId;
    if (!targetCaseId) {
      showToast('Please select or enter a case ID with a pending promise', 'error');
      return;
    }
    if (isSimulatorRunning) return;
    setIsSimulatorRunning(true);
    try {
      const options = {};
      if (forceStatus) options.forceStatus = forceStatus;
      const res = await advancePromiseTime(targetCaseId, options);
      showToast(
        `Promise resolved for case ${targetCaseId}: ${res.resolution || res.event_status}`,
        'success'
      );
      refreshAll();
      loadPendingPromises();
      navigateToCase(targetCaseId);
    } catch (err) {
      showToast(err.message || 'Failed to advance promise time', 'error');
    } finally {
      setIsSimulatorRunning(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-card animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-lg">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Event Simulator & Time Machine</h3>
            <p className="text-xs text-slate-500">
              Generate payment failures, test autonomous AI policies, and resolve time-delayed promises on demand.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSimulatorRunning && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Spinner size="sm" label="" />
              <span>Processing pipeline…</span>
            </div>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            {showAdvanced ? 'Hide Advanced Config' : '⚙️ Advanced Controls'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Section 1: 1-Click Demo Batch (HERO ACTION) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 text-white rounded-2xl p-6 shadow-elevated">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Recommended for Review
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                5 distinct causes
              </span>
            </div>
            <h4 className="text-base font-bold text-white tracking-tight mt-1">
              Autonomous Multi-Scenario Batch
            </h4>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Spawns 5 representative failure scenarios: Insufficient Funds, Card Expired, Bank Timeout, OTP Timeout, Generic Decline.
            </p>
          </div>
          <button
            id="sim-demo-batch-btn"
            onClick={handleRunDemo}
            disabled={isSimulatorRunning}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md disabled:opacity-50 transition-colors"
          >
            {isSimulatorRunning ? <Spinner size="sm" label="Simulating Pipeline…" className="text-white" /> : '🚀 Run Demo Batch (5 Diverse Cases)'}
          </button>
        </div>

        {/* Section 2: Custom Batch Generator */}
        <div className={`lg:col-span-7 flex flex-col justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-6 ${showAdvanced ? 'block' : 'hidden lg:flex'}`}>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              🎲 Custom Batch Generator
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Failure Cause</label>
                <select
                  value={simCause}
                  onChange={(e) => setSimCause(e.target.value)}
                  disabled={isSimulatorRunning}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none disabled:opacity-50 shadow-sm"
                >
                  <option value="">All (Uniform)</option>
                  {CAUSES.map((c) => (
                    <option key={c} value={c}>
                      {CAUSE_LABELS[c] || c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Batch Size (Count)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={simCount}
                  onChange={(e) => setSimCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  disabled={isSimulatorRunning}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none disabled:opacity-50 shadow-sm"
                />
              </div>
            </div>
          </div>

          <button
            id="sim-custom-batch-btn"
            onClick={handleTriggerBatch}
            disabled={isSimulatorRunning}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {isSimulatorRunning ? <Spinner size="sm" label="Triggering…" className="text-white" /> : 'Trigger Configured Batch'}
          </button>
        </div>

        {/* Section 3: Time Machine (Promise Resolver) */}
        {showAdvanced && (
          <div className="lg:col-span-12 flex flex-col justify-between bg-amber-50/50 border border-amber-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200/60">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                ⏳ Promise-to-Pay Time Machine
              </span>
              <span className="text-[11px] font-mono text-amber-800 font-semibold">
                {pendingPromises.length} pending settlement
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Pending Case</label>
                {pendingPromises.length > 0 ? (
                  <select
                    value={selectedPromiseCaseId}
                    onChange={(e) => setSelectedPromiseCaseId(e.target.value)}
                    disabled={isSimulatorRunning}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none font-mono shadow-sm"
                  >
                    {pendingPromises.map((p) => (
                      <option key={p._id || p.case_id} value={p.case_id}>
                        {p.case_id.substring(0, 14)}… ({p.amount ? `₹${(p.amount/100).toFixed(0)}` : ''})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="evt_xxxx or Case ID"
                    value={customCaseId}
                    onChange={(e) => setCustomCaseId(e.target.value)}
                    disabled={isSimulatorRunning}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none font-mono shadow-sm"
                  />
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Simulation Outcome</label>
                <select
                  value={forceStatus}
                  onChange={(e) => setForceStatus(e.target.value)}
                  disabled={isSimulatorRunning}
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none shadow-sm"
                >
                  <option value="">Natural Simulation (60/40)</option>
                  <option value="fulfilled">Force Fulfilled (100% Paid)</option>
                  <option value="missed">Force Missed (Default)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  id="sim-advance-time-btn"
                  onClick={handleAdvanceTime}
                  disabled={isSimulatorRunning || (!selectedPromiseCaseId && !customCaseId)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 shadow-sm transition-colors"
                >
                  {isSimulatorRunning ? <Spinner size="sm" label="Advancing…" className="text-white" /> : '⏩ Fast-Forward Time'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

