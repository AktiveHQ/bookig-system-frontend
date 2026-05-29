import { useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useCountdownTimer } from '@/hooks/use-countdown-timer';

type TimeslotCountdownProps = {
  lockDurationMs: number;
  isActive: boolean;
  onExpire?: () => void;
};

export const TimeslotCountdown = ({
  lockDurationMs,
  isActive,
  onExpire,
}: TimeslotCountdownProps) => {
  const { formattedTime, isExpired, startTimer } = useCountdownTimer();

  useEffect(() => {
    if (isActive) {
      startTimer(lockDurationMs, onExpire);
    }
  }, [isActive, lockDurationMs, startTimer, onExpire]);

  if (!isActive || isExpired) {
    return null;
  }

  const isLowTime = Math.floor(lockDurationMs / 1000) - (Math.floor(lockDurationMs / 1000) - (60 * 2)) > 0;

  return (
    <div
      className={`border rounded-lg p-4 flex items-center gap-3 ${
        isLowTime ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
      }`}
    >
      <Clock className={`h-5 w-5 ${isLowTime ? 'text-red-600' : 'text-blue-600'}`} />
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isLowTime ? 'text-red-900' : 'text-blue-900'}`}>
          Timeslot reserved for {formattedTime}
        </p>
        <p className={`text-xs ${isLowTime ? 'text-red-700' : 'text-blue-700'}`}>
          Complete your payment before the time expires
        </p>
      </div>
      <div className={`text-lg font-mono font-bold ${isLowTime ? 'text-red-600' : 'text-blue-600'}`}>
        {formattedTime}
      </div>
    </div>
  );
};

export const TimeslotExpiredAlert = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-red-900">Timeslot reservation expired</p>
        <p className="text-sm text-red-700 mt-1">
          Your timeslot reservation has expired. Please select a new time to continue.
        </p>
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 underline"
        >
          Back to slot selection
        </button>
      </div>
    </div>
  );
};
