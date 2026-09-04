import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

export function Navigation() {
  const { activeTab, setActiveTab } = useDashboard();

  const tabs = [
    {
      id: 'funnel',
      label: 'Live Funnel',
    },
    {
      id: 'cases',
      label: 'Case Explorer',
    },
    {
      id: 'metrics',
      label: 'Metrics & Audit',
    },
  ];

  return (
    <nav className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6">
        <div className="flex gap-6 sm:gap-10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 text-body font-ui transition-all ${
                  isActive
                    ? 'text-slate-950 font-emphasis'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-950 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
