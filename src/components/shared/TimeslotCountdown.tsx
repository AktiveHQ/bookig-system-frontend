import { useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useCountdownTimer } from '@/hooks/use-countdown-timer';

type TimeslotCountdownProps = {
  expiresAt: number;
  isActive: boolean;
  onExpire?: () => void;
};

export const TimeslotCountdown = ({
  expiresAt,
  isActive,
  onExpire,
}: TimeslotCountdownProps) => {
  const { formattedTime, isExpired, secondsRemaining, startTimer } = useCountdownTimer();

  useEffect(() => {
    if (isActive) {
      startTimer(expiresAt, onExpire);
    }
  }, [expiresAt, isActive, onExpire, startTimer]);

  if (!isActive || isExpired) {
    return null;
  }

  const isLowTime = secondsRemaining <= 120;

  return (
    <div
      className={`border rounded-2xl p-4 flex items-center gap-3 ${
        isLowTime ? 'bg-red-50 border-red-200' : 'bg-red-50 border-red-100'
      }`}
    >
      <Clock className="h-5 w-5 text-red-600" />
      <div className="flex-1">
        <p className="text-sm text-red-950">
          We've reserved your timeslot. Please complete checkout within{' '}
          <span className="font-semibold text-red-600">{formattedTime}</span> to secure your booking.
        </p>
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
