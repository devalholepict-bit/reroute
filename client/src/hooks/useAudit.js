import { useState, useCallback } from 'react';
import { fetchAuditLogs } from '../services/auditService';
import { usePolling } from './usePolling';

/**
 * useAudit — hook for querying and filtering audit logs
 *
 * @param {object} [options={}]
 * @param {string} [options.cause='']
 * @param {string} [options.outcome='']
 * @param {string} [options.payment_id='']
 * @param {string} [options.customer_id='']
 * @param {number} [options.limit=100]
 * @param {boolean} [options.pollingEnabled=true]
 */
export function useAudit({
  cause = '',
  outcome = '',
  payment_id = '',
  customer_id = '',
  limit = 100,
  pollingEnabled = true,
} = {}) {
  const fetchFn = useCallback(() => {
    return fetchAuditLogs({ cause, outcome, payment_id, customer_id, limit });
  }, [cause, outcome, payment_id, customer_id, limit]);

  const {
    data: auditLogs,
    loading: auditLoading,
    error: auditError,
    refetch: refetchAudit,
    lastUpdated,
    isPaused,
  } = usePolling(fetchFn, {
    enabled: pollingEnabled,
    deps: [cause, outcome, payment_id, customer_id, limit],
  });

  return {
    auditLogs: auditLogs || [],
    auditLoading,
    auditError,
    refetchAudit,
    lastUpdated,
    isPaused,
  };
}
