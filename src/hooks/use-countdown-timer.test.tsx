import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdownTimer } from './use-countdown-timer';

describe('useCountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down to expiry and calls onExpire once', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.startTimer(Date.now() + 3000, onExpire);
    });

    expect(result.current.formattedTime).toBe('00:03');
    expect(result.current.isExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.formattedTime).toBe('00:02');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.formattedTime).toBe('00:00');
    expect(result.current.isExpired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
