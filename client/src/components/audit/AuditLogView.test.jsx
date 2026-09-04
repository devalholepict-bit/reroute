import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogView } from './AuditLogView';
import { DashboardProvider } from '../../context/DashboardContext';

vi.mock('../../hooks/useAudit', () => ({
  useAudit: vi.fn(),
}));

import { useAudit } from '../../hooks/useAudit';

const mockLogs = [
  {
    _id: 'log_1',
    payment_id: 'pay_otp_111',
    customer_id: 'cust_111',
    cause: 'otp_timeout',
    action: 'send_retry_link',
    channel: 'retry_link',
    outcome: 'paid_immediately',
    timestamp: '2026-08-30T11:00:00Z',
  },
  {
    _id: 'log_2',
    payment_id: 'pay_funds_222',
    customer_id: 'cust_222',
    cause: 'insufficient_funds',
    action: 'delayed_retry',
    channel: 'sms',
    outcome: 'promised_to_pay',
    timestamp: '2026-08-30T11:05:00Z',
  },
  {
    _id: 'log_3',
    payment_id: 'pay_card_333',
    customer_id: 'cust_333',
    cause: 'card_expired',
    action: 'customer_update_request',
    channel: 'email',
    outcome: 'no_response',
    timestamp: '2026-08-30T11:10:00Z',
  },
];

describe('AuditLogView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table rows for all logs and updates hook params on filter change', () => {
    useAudit.mockImplementation(({ cause, outcome, payment_id }) => {
      let filtered = [...mockLogs];
      if (cause) filtered = filtered.filter((l) => l.cause === cause);
      if (outcome) filtered = filtered.filter((l) => l.outcome === outcome);
      if (payment_id) filtered = filtered.filter((l) => l.payment_id.includes(payment_id));

      return {
        auditLogs: filtered,
        auditLoading: false,
      };
    });

    render(
      <DashboardProvider>
        <AuditLogView />
      </DashboardProvider>
    );

    // Assert initial render shows all 3 rows
    expect(screen.getByText(/pay_otp_111/i)).toBeInTheDocument();
    expect(screen.getByText(/pay_funds_222/i)).toBeInTheDocument();
    expect(screen.getByText(/pay_card_333/i)).toBeInTheDocument();

    // Select Failure Cause filter (combobox 0)
    const comboboxes = screen.getAllByRole('combobox');
    const causeSelect = comboboxes[0];
    fireEvent.change(causeSelect, { target: { value: 'otp_timeout' } });

    // Assert hook was called with cause filter and re-rendered with filtered row
    expect(screen.getByText(/pay_otp_111/i)).toBeInTheDocument();
    expect(screen.queryByText(/pay_funds_222/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pay_card_333/i)).not.toBeInTheDocument();
  });

  it('filters table by outcome', () => {
    useAudit.mockImplementation(({ cause, outcome, payment_id }) => {
      let filtered = [...mockLogs];
      if (cause) filtered = filtered.filter((l) => l.cause === cause);
      if (outcome) filtered = filtered.filter((l) => l.outcome === outcome);
      if (payment_id) filtered = filtered.filter((l) => l.payment_id.includes(payment_id));

      return {
        auditLogs: filtered,
        auditLoading: false,
      };
    });

    render(
      <DashboardProvider>
        <AuditLogView />
      </DashboardProvider>
    );

    // Select Outcome filter (combobox 1)
    const comboboxes = screen.getAllByRole('combobox');
    const outcomeSelect = comboboxes[1];
    fireEvent.change(outcomeSelect, { target: { value: 'no_response' } });

    expect(screen.getByText(/pay_card_333/i)).toBeInTheDocument();
    expect(screen.queryByText(/pay_otp_111/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pay_funds_222/i)).not.toBeInTheDocument();
  });
});
