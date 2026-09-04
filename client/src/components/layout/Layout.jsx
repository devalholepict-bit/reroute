import React from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Toast } from '../common/Toast';
import { SimulatorControls } from '../simulator/SimulatorControls';
import { useDashboard } from '../../context/DashboardContext';

export function Layout({ children }) {
  const { simulatorOpen, dbStatus, serverStatus } = useDashboard();

  return (
    <div className="min-h-screen bg-[#fafaf7] text-slate-900 antialiased selection:bg-slate-900 selection:text-white flex flex-col font-sans">
      <Header />

      {/* Degraded mode non-blocking banner if database is disconnected */}
      {dbStatus === 'error' && serverStatus === 'ok' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-caption font-emphasis text-amber-900 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Database connection is temporarily unavailable. Dashboard is operating in degraded mode.</span>
        </div>
      )}

      {/* Offline banner if server is unreachable */}
      {serverStatus === 'error' && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-caption font-emphasis text-rose-900 flex items-center justify-center gap-2">
          <span>🚨</span>
          <span>Backend server is unreachable. Please verify server connectivity on port 3001.</span>
        </div>
      )}

      <Navigation />

      {/* Simulator Controls banner/drawer if toggled */}
      {simulatorOpen && (
        <div className="border-b border-slate-200/80 bg-white/95 shadow-sm transition-all animate-fade-in">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <SimulatorControls />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      {/* Global Toast */}
      <Toast />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-caption font-ui text-slate-500">ReRoute · Autonomous AI Payment Failure Recovery</span>
          <span className="text-label font-mono text-slate-400 uppercase tracking-label">Precision Orchestration</span>
        </div>
      </footer>
    </div>
  );
}

