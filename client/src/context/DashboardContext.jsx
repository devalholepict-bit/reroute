import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DashboardContext = createContext(null);

const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:5001';

export function DashboardProvider({ children }) {
  // Navigation tab state: 'funnel' | 'cases' | 'metrics'
  const [activeTab, setActiveTab] = useState('funnel');

  // Selected case ID for deep-linking into Case Detail
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Simulator Drawer state & in-flight loading lock
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);

  // Global Toast state
  const [toast, setToast] = useState(null);

  // Service health status
  const [serverStatus, setServerStatus] = useState('loading');
  const [dbStatus, setDbStatus] = useState('loading');
  const [mlStatus, setMlStatus] = useState('loading');

  // Trigger counter for force-refreshing components
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const navigateToCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    setActiveTab('cases');
  }, []);

  const refreshAll = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Check health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setServerStatus(data.status === 'ok' ? 'ok' : 'error');
        setDbStatus(data.db === 'connected' ? 'ok' : 'error');
      } catch {
        setServerStatus('error');
        setDbStatus('error');
      }

      try {
        const mlRes = await fetch(`${ML_SERVICE_URL}/health`);
        const mlData = await mlRes.json();
        setMlStatus(mlData.status === 'ok' ? 'ok' : 'error');
      } catch {
        setMlStatus('error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    activeTab,
    setActiveTab,
    selectedCaseId,
    setSelectedCaseId,
    navigateToCase,
    simulatorOpen,
    setSimulatorOpen,
    isSimulatorRunning,
    setIsSimulatorRunning,
    toast,
    showToast,
    hideToast,
    serverStatus,
    dbStatus,
    mlStatus,
    refreshKey,
    refreshAll,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
