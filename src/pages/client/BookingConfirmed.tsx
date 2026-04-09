import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/shared/BackButton';
import { CheckCircle, CalendarIcon, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const BookingConfirmed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    appointmentName: string;
    date: string;
    time: string;
    total: number;
  } | null;

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">No booking information.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-3xl mx-auto">
      <BackButton onClick={() => navigate('/')} />

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">Booking confirmed!</h1>

        <div className="border rounded-2xl p-5 w-full space-y-3 mt-6 text-left lg:p-6">
          <h3 className="font-semibold">{state.appointmentName}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(parseISO(state.date), 'EEEE, d MMMM')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(state.time)}</span>
          </div>
        </div>

        <CheckCircle className="h-12 w-12 text-green-600 mt-6" />

        <p className="text-sm text-muted-foreground mt-4">
          A confirmation has been sent to your email.
        </p>

        <div className="w-full grid gap-3 mt-8 sm:grid-cols-2">
          <Button variant="outline" className="w-full h-12 rounded-full">
            Add to calendar
          </Button>
          <Button className="w-full h-12 rounded-full" onClick={() => navigate('/')}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
