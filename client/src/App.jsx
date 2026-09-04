import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { Layout } from './components/layout/Layout';
import { LiveFunnelPage } from './pages/LiveFunnelPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { MetricsAuditPage } from './pages/MetricsAuditPage';

function AppContent() {
  const { activeTab } = useDashboard();

  return (
    <Layout>
      {activeTab === 'funnel' && <LiveFunnelPage />}
      {activeTab === 'cases' && <CaseDetailPage />}
      {activeTab === 'metrics' && <MetricsAuditPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}
