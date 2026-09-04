import { useCallback } from 'react';
import { fetchMetrics } from '../services/metricsService';
import { usePolling } from './usePolling';

/**
 * useMetrics — hook for live executive recovery metrics
 *
 * @param {object} [options={}]
 * @param {boolean} [options.pollingEnabled=true]
 * @param {number} [options.interval]
 */
export function useMetrics({ pollingEnabled = true, interval } = {}) {
  const fetchFn = useCallback(() => {
    return fetchMetrics();
  }, []);

  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
    lastUpdated,
    isPaused,
  } = usePolling(fetchFn, { enabled: pollingEnabled, interval });

  return {
    metrics,
    metricsLoading,
    metricsError,
    refetchMetrics,
    lastUpdated,
    isPaused,
  };
}
