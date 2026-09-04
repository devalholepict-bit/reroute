import { useState, useEffect, useCallback } from 'react';
import { fetchCases, fetchCaseById } from '../services/casesService';
import { usePolling } from './usePolling';

/**
 * useCases — hook for listing and filtering recovery cases, and fetching single case details
 *
 * @param {object} [options={}]
 * @param {string} [options.cause='']
 * @param {string} [options.outcome='']
 * @param {string} [options.status='']
 * @param {number} [options.limit=100]
 * @param {string|null} [options.caseId=null]
 * @param {boolean} [options.pollingEnabled=true]
 */
export function useCases({
  cause = '',
  outcome = '',
  status = '',
  limit = 100,
  caseId = null,
  pollingEnabled = true,
} = {}) {
  const [selectedCaseId, setSelectedCaseId] = useState(caseId);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Sync external caseId prop if provided
  useEffect(() => {
    if (caseId !== undefined) {
      setSelectedCaseId(caseId);
    }
  }, [caseId]);

  // Polling fetch for cases list
  const fetchFn = useCallback(() => {
    return fetchCases({ cause, outcome, status, limit });
  }, [cause, outcome, status, limit]);

  const {
    data: cases,
    loading: casesLoading,
    error: casesError,
    refetch: refetchCases,
    lastUpdated,
    isPaused,
  } = usePolling(fetchFn, { enabled: pollingEnabled, deps: [cause, outcome, status, limit] });

  // Fetch full case detail whenever selectedCaseId changes
  const loadCaseDetail = useCallback(async (id) => {
    if (!id) {
      setSelectedCaseDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await fetchCaseById(id);
      setSelectedCaseDetail(data);
    } catch (err) {
      setDetailError(err.message || `Failed to load case ${id}`);
      setSelectedCaseDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    } else {
      setSelectedCaseDetail(null);
      setDetailError(null);
    }
  }, [selectedCaseId, loadCaseDetail]);

  const selectCase = useCallback((id) => {
    setSelectedCaseId(id);
  }, []);

  const clearSelectedCase = useCallback(() => {
    setSelectedCaseId(null);
    setSelectedCaseDetail(null);
    setDetailError(null);
  }, []);

  const refreshDetail = useCallback(() => {
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    }
  }, [selectedCaseId, loadCaseDetail]);

  return {
    cases: cases || [],
    casesLoading,
    casesError,
    refetchCases,
    lastUpdated,
    isPaused,
    selectedCaseId,
    selectedCaseDetail,
    detailLoading,
    detailError,
    selectCase,
    clearSelectedCase,
    refreshDetail,
  };
}
