import { useEffect, useState } from 'react';

type UseCountdownTimerResult = {
  secondsRemaining: number;
  isExpired: boolean;
  formattedTime: string;
  startTimer: (durationMs: number, onExpire?: () => void) => void;
  stopTimer: () => void;
};

export const useCountdownTimer = (): UseCountdownTimerResult => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [onExpireCallback, setOnExpireCallback] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsExpired(true);
      if (onExpireCallback) {
        onExpireCallback();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsExpired(true);
          if (onExpireCallback) {
            onExpireCallback();
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onExpireCallback]);

  const startTimer = (durationMs: number, onExpire?: () => void) => {
    const seconds = Math.ceil(durationMs / 1000);
    setSecondsRemaining(seconds);
    setIsExpired(false);
    if (onExpire) {
      setOnExpireCallback(() => onExpire);
    }
  };

  const stopTimer = () => {
    setSecondsRemaining(0);
    setIsExpired(false);
    setOnExpireCallback(undefined);
  };

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
