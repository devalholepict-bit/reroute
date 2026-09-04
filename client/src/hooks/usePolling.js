import { useState, useEffect, useRef, useCallback } from 'react';
import { POLLING_INTERVAL_MS } from '../utils/constants';

/**
 * usePolling — polls an async fetch function at a steady interval (default 2.5s)
 * Automatically pauses when window/tab is hidden to conserve resources.
 *
 * @param {Function} asyncFn - Async function returning data
 * @param {object} [options={}]
 * @param {number} [options.interval=POLLING_INTERVAL_MS] - Interval in ms (2000-3000ms)
 * @param {boolean} [options.enabled=true] - Whether polling is active
 * @param {Array} [options.deps=[]] - Extra dependencies that should trigger immediate refetch
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function, lastUpdated: Date|null, isPaused: boolean }}
 */
export function usePolling(asyncFn, { interval = POLLING_INTERVAL_MS, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const executeFetch = useCallback(async (isManual = false) => {
    if (inFlightRef.current && !isManual) return;
    inFlightRef.current = true;

    try {
      const result = await asyncFnRef.current();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Error fetching data');
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Window visibility listener to pause polling in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setIsPaused(isHidden);
      if (!isHidden && enabled) {
        executeFetch(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, executeFetch]);

  // Initial fetch and dependency trigger
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      executeFetch(true);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, executeFetch, ...deps]);

  // Periodic interval polling timer
  useEffect(() => {
    if (!enabled || isPaused) return;

    const timer = setInterval(() => {
      executeFetch();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, isPaused, interval, executeFetch]);

  return {
    data,
    loading,
    error,
    refetch: () => executeFetch(true),
    lastUpdated,
    isPaused,
  };
}
