import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunnelView } from './FunnelView';
import { DashboardProvider } from '../../context/DashboardContext';

// Mock hooks to isolate UI rendering
vi.mock('../../hooks/useMetrics', () => ({
  useMetrics: vi.fn(),
}));

vi.mock('../../hooks/useCases', () => ({
  useCases: vi.fn(),
}));

import { useMetrics } from '../../hooks/useMetrics';
import { useCases } from '../../hooks/useCases';

describe('FunnelView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when metrics and cases are loading and empty', () => {
    useMetrics.mockReturnValue({
      metrics: null,
      metricsLoading: true,
      lastUpdated: null,
    });
    useCases.mockReturnValue({
      cases: [],
      casesLoading: true,
    });

    render(
      <DashboardProvider>
        <FunnelView />
      </DashboardProvider>
    );

    expect(screen.getByText(/Loading live recovery funnel/i)).toBeInTheDocument();
  });

  it('renders KPI metrics and pipeline stages correctly with mocked metrics data', () => {
    useMetrics.mockReturnValue({
      metrics: {
        overall_recovery_rate: 68.5,
        total_amount_recovered: 25490,
        contact_cap_compliance_rate: 98.2,
        summary: {
          total_cases: 50,
          total_recovered: 34,
          unrecovered_cases: 16,
          total_promises: 8,
          pending_promises: 3,
          blocked_cases: 1,
        },
      },
      metricsLoading: false,
      lastUpdated: new Date('2026-08-30T12:00:00Z'),
    });

    useCases.mockReturnValue({
      cases: [
        {
          id: 'evt_test_1',
          payment: { id: 'pay_1', amount: 149900, error_reason: 'insufficient_funds' },
          diagnosis: { cause: 'insufficient_funds' },
          recovery_action: { action: 'delayed_retry', status: 'executed' },
          outcome: { outcome: 'paid_immediately', amount_recovered: 1499 },
          status: 'resolved',
          created_at: new Date().toISOString(),
        },
      ],
      casesLoading: false,
    });

    render(
      <DashboardProvider>
        <FunnelView />
      </DashboardProvider>
    );

    // Assert Header & Live indicator
    expect(screen.getByText(/Recover more from the payments that fail/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-Time Autonomous Recovery/i)).toBeInTheDocument();

    // Assert KPI metrics rendered
    expect(screen.getByText('68.5%')).toBeInTheDocument();
    expect(screen.getByText(/34 of 50 cases salvaged/i)).toBeInTheDocument();
    expect(screen.getByText('98.2%')).toBeInTheDocument();

    // Assert Funnel Visual Cards
    expect(screen.getByText(/Recovery Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Recovery Stream/i)).toBeInTheDocument();
  });
});

