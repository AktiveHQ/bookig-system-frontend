import { useCallback, useEffect, useRef, useState } from 'react';

type UseCountdownTimerResult = {
  secondsRemaining: number;
  isExpired: boolean;
  formattedTime: string;
  startTimer: (expiresAtMs: number, onExpire?: () => void) => void;
  stopTimer: () => void;
};

export const useCountdownTimer = (): UseCountdownTimerResult => {
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef<(() => void) | undefined>();
  const expiredNotifiedRef = useRef(false);

  useEffect(() => {
    if (!expiresAtMs) return;

    const tick = () => {
      const next = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
      setSecondsRemaining(next);
      const expired = next <= 0;
      setIsExpired(expired);
      if (expired && !expiredNotifiedRef.current) {
        expiredNotifiedRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAtMs]);

  const startTimer = useCallback((nextExpiresAtMs: number, onExpire?: () => void) => {
    onExpireRef.current = onExpire;
    expiredNotifiedRef.current = false;
    setExpiresAtMs(nextExpiresAtMs);
  }, []);

  const stopTimer = useCallback(() => {
    onExpireRef.current = undefined;
    expiredNotifiedRef.current = false;
    setExpiresAtMs(null);
    setSecondsRemaining(0);
    setIsExpired(false);
  }, []);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  return {
    secondsRemaining,
    isExpired,
    formattedTime,
    startTimer,
    stopTimer,
  };
};
