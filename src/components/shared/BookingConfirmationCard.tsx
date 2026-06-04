import { CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingConfirmationCardProps {
  appointmentName: string;
  date: string;
  time: string;
  className?: string;
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const BookingConfirmationCard = ({
  appointmentName,
  date,
  time,
  className,
}: BookingConfirmationCardProps) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-green-600/20 bg-gradient-to-br from-green-50/50 to-background p-5 shadow-sm',
        'sm:p-6',
        className,
      )}
    >
      {/* Checkmark indicator */}
      <div className="absolute -top-3 -right-3 rounded-full bg-green-600 p-2 shadow-md">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>

      <div className="space-y-4 pr-4">
        {/* Service name */}
        <div>
          <h3 className="text-base font-semibold text-foreground">{appointmentName}</h3>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-600/10 p-2">
            <CalendarIcon className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground">
              {date ? format(parseISO(date), 'EEEE, d MMMM') : 'Date confirmed'}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-600/10 p-2">
            <Clock className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-sm font-medium text-foreground">
              {time ? formatTime(time) : 'Time confirmed'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationCard;
