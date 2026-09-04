import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseDetailView } from './CaseDetailView';
import { DashboardProvider } from '../../context/DashboardContext';

describe('CaseDetailView Component', () => {
  const mockCaseDetail = {
    id: 'evt_case_deep_dive_123',
    event_id: 'evt_case_deep_dive_123',
    status: 'resolved',
    event: {
      id: 'evt_case_deep_dive_123',
      source: 'simulator',
      event: 'payment.failed',
      status: 'resolved',
      created_at: '2026-08-30T10:00:00.000Z',
      payload: {
        payment: {
          id: 'pay_99887766',
          order_id: 'order_554433',
          amount: 1499000, // ₹14,990
          currency: 'INR',
          method: 'card',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Account balance insufficient for transaction debit.',
          error_reason: 'insufficient_funds',
        },
        customer: {
          id: 'cust_vip_42',
          contact: '+919876543210',
          email: 'vip.customer@enterprise.io',
          segment: 'high_value',
        },
      },
    },
    diagnosis: {
      cause: 'insufficient_funds',
      self_recovers_likely: false,
      confidence: 0.885,
      diagnosis_method: 'rules+ml',
      model_version: 'v1',
      created_at: '2026-08-30T10:00:01.000Z',
    },
    recovery_actions: [
      {
        _id: 'ra_101',
        event_id: 'evt_case_deep_dive_123',
        customer_id: 'cust_vip_42',
        payment_id: 'pay_99887766',
        action: 'delayed_retry',
        channel: 'sms',
        timing: 'wait_24_48h',
        reason: 'Low expected success on immediate retry for funds-related declines',
        attempt_number: 1,
        status: 'executed',
        message_sent: 'ReRoute Alert: Your payment of ₹14,990 failed due to insufficient account balance.',
        executed_at: '2026-08-30T10:00:02.000Z',
      },
    ],
    outcomes: [
      {
        _id: 'out_101',
        recovery_action_id: 'ra_101',
        event_id: 'evt_case_deep_dive_123',
        outcome: 'paid_immediately',
        amount_recovered: 1499000,
        created_at: '2026-08-30T10:00:05.000Z',
      },
    ],
    promise: null,
    audit_logs: [
      {
        _id: 'audit_1',
        action: 'delayed_retry',
        channel: 'sms',
        outcome: 'paid_immediately',
        timestamp: '2026-08-30T10:00:02.000Z',
      },
    ],
  };

  it('renders every critical field from /api/cases/:id response without dropping data', () => {
    render(
      <DashboardProvider>
        <CaseDetailView
          caseDetail={mockCaseDetail}
          loading={false}
          error={null}
          onBack={vi.fn()}
          onRefresh={vi.fn()}
        />
      </DashboardProvider>
    );

    // 1. Assert Event ID and Payment Header
    expect(screen.getAllByText(/evt_case_deep_dive_123/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/pay_99887766/i)).toBeInTheDocument();

    // 2. Assert Step 2: Root-Cause AI Diagnosis cause, method, and confidence
    expect(screen.getByText(/Root-Cause Diagnosis/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Insufficient Funds/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/88\.5%/i)).toBeInTheDocument();

    // 3. Assert Step 3: Policy & Verbatim Reason
    expect(screen.getByText(/Autonomous Decision/i)).toBeInTheDocument();
    expect(screen.getByText(/delayed retry/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /"Low expected success on immediate retry for funds-related declines"/i
      )
    ).toBeInTheDocument();

    // 4. Assert Step 5: Outreach Message Sent
    expect(screen.getByText(/Customer Outreach/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /ReRoute Alert: Your payment of ₹14,990 failed due to insufficient account balance\./i
      )
    ).toBeInTheDocument();

    // 5. Assert Step 6 & 7: Outcome & Recovered Amount
    expect(screen.getByText(/Outcome & Recovery/i)).toBeInTheDocument();
    expect(screen.getAllByText(/paid immediately/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹14,990/).length).toBeGreaterThanOrEqual(1);
  });


  it('renders error state when case fails to load', () => {
    render(
      <DashboardProvider>
        <CaseDetailView
          caseDetail={null}
          loading={false}
          error="Failed to load case"
          onBack={vi.fn()}
          onRefresh={vi.fn()}
        />
      </DashboardProvider>
    );

    expect(screen.getByText('Failed to load case')).toBeInTheDocument();
  });
});

