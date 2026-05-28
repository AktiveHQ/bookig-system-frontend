import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/shared/BackButton';
import { CheckCircle, CalendarIcon, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const BookingConfirmed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    appointmentName: string;
    date: string;
    time: string;
    total: number;
  } | null;
  const reference = new URLSearchParams(location.search).get('reference');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>(
    reference ? 'sending' : 'idle',
  );

  useEffect(() => {
    if (!reference) return;

    let active = true;
    const verifyPayment = async () => {
      setEmailStatus('sending');
      try {
        const response = await fetch(
          `${API_BASE}/public/paystack/verify?reference=${encodeURIComponent(reference)}`,
          { method: 'POST' },
        );
        if (!response.ok) {
          throw new Error('Payment verification failed');
        }
        if (active) setEmailStatus('sent');
      } catch (error) {
        console.error('[BookingConfirmed] Payment verification failed', error);
        if (active) setEmailStatus('failed');
      }
    };

    void verifyPayment();
    return () => {
      active = false;
    };
  }, [reference]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold">Booking Confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your appointment has been successfully scheduled. A confirmation email with your booking details has been sent to your inbox.
          </p>
          {emailStatus === 'sending' && (
            <p className="mt-2 text-xs text-muted-foreground">
              Finalizing your confirmation email...
            </p>
          )}
          {emailStatus === 'failed' && (
            <p className="mt-2 text-xs text-muted-foreground">
              Your payment was received, but we could not resend the confirmation email yet.
            </p>
          )}
          {reference && (
            <p className="mt-3 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{reference}</span>
            </p>
          )}
          <Button className="mt-6 h-12 rounded-full px-8" onClick={() => navigate('/')}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-3xl mx-auto">
      <BackButton onClick={() => navigate('/')} />

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">Booking Confirmed</h1>

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
          Your appointment has been successfully scheduled. A confirmation email with your booking details has been sent to your inbox.
        </p>
        {emailStatus === 'sending' && (
          <p className="text-xs text-muted-foreground mt-2">
            Finalizing your confirmation email...
          </p>
        )}
        {emailStatus === 'failed' && (
          <p className="text-xs text-muted-foreground mt-2">
            Your payment was received, but we could not resend the confirmation email yet.
          </p>
        )}

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
