import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { StatusPill } from '../common/StatusPill';

export function Header() {
  const {
    serverStatus,
    dbStatus,
    mlStatus,
    simulatorOpen,
    setSimulatorOpen,
    isSimulatorRunning,
  } = useDashboard();

  const [showHealthMenu, setShowHealthMenu] = useState(false);

  const allHealthy = serverStatus === 'ok' && dbStatus === 'ok' && mlStatus === 'ok';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <span className="font-editorial text-sm text-emerald-400">R</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[1.125rem] font-editorial text-slate-950 tracking-tight">ReRoute</span>
            <span className="text-label font-emphasis text-slate-400 uppercase tracking-label hidden sm:inline">
              Autonomous Recovery
            </span>
          </div>
        </div>

        {/* Right Section: System Health & Simulator */}
        <div className="flex items-center gap-3">
          {/* Polling Heartbeat Badge */}
          <div className="hidden sm:flex items-center gap-1.5 border border-slate-200/80 rounded-full px-2.5 py-1 bg-slate-50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-label font-ui text-slate-500">Live · 2.5s</span>
          </div>

          {/* Quiet System Health Indicator */}
          <div className="relative">
            <button
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-label font-ui text-slate-600 hover:bg-slate-100 transition-colors"
              title="System Connectivity Status"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  allHealthy ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="hidden md:inline">Services</span>
              <span className="text-micro text-slate-400">▾</span>
            </button>

            {/* Dropdown with all three status pills */}
            {showHealthMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowHealthMenu(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-elevated animate-fade-in space-y-2">
                  <div className="text-label font-emphasis uppercase tracking-label text-slate-400 px-1 mb-1">
                    System Architecture Status
                  </div>
                  <div className="space-y-1.5">
                    <StatusPill label="Server (3001)" status={serverStatus} />
                    <StatusPill label="ML Engine (5001)" status={mlStatus} />
                    <StatusPill label="MongoDB" status={dbStatus} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Simulator Toggle Button */}
          <button
            onClick={() => setSimulatorOpen(!simulatorOpen)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-ui font-emphasis transition-all shadow-sm ${
              simulatorOpen
                ? 'bg-slate-950 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>Simulator</span>
            {isSimulatorRunning && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
