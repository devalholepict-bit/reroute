import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolling } from './usePolling';

describe('usePolling Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches data on mount and updates state cleanly', async () => {
    const mockData = [{ id: '1', title: 'Case 1' }];
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => usePolling(fetchFn, { interval: 2000 }));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve(); // flush initial executeFetch
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('repeated polling does not duplicate rows when identical data is returned', async () => {
    const staticCasesList = [
      { id: 'case_1', amount: 1000 },
      { id: 'case_2', amount: 2000 },
    ];

    const fetchFn = vi.fn().mockResolvedValue(staticCasesList);

    const { result } = renderHook(() => usePolling(fetchFn, { interval: 1000 }));

    // Initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.data).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance timer to trigger 1st poll
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    // Crucial: dataset length remains exactly 2 (no row duplication)
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual(staticCasesList);

    // Advance timer to trigger 2nd poll
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual(staticCasesList);
  });

  it('pauses polling when enabled is false', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => usePolling(fetchFn, { interval: 1000, enabled: false }));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
