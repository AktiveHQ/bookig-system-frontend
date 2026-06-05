import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/shared/BackButton';
import BookingConfirmationCard from '@/components/shared/BookingConfirmationCard';
import { CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const BookingConfirmed = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as {
    appointmentName: string;
    date: string;
    time: string;
    total: number;
  } | null;
  const [storedState] = useState(() => {
    try {
      const raw = sessionStorage.getItem('akhq:lastBooking');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        appointmentName: String(parsed?.appointmentName ?? 'Selected service'),
        date: String(parsed?.date ?? ''),
        time: String(parsed?.time ?? ''),
        total: Number(parsed?.amountToCharge ?? parsed?.total ?? 0),
        slug: String(parsed?.slug ?? ''),
      };
    } catch {
      return null;
    }
  });
  const state = routeState ?? storedState;
  const businessSlug = slug || state?.slug;
  const reference = new URLSearchParams(location.search).get('reference');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>(
    reference ? 'sending' : 'idle',
  );
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

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

  // Redirect timer - starts at 5 seconds when page loads
  useEffect(() => {
    setRedirectCountdown(5);
  }, []);

  // Countdown effect
  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) return;

    const timer = setTimeout(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) {
          navigate(businessSlug ? `/booking/${businessSlug}` : '/');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate, businessSlug]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-[#020c1a]">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold">Booking Confirmed</h1>
          <p className="mt-2 text-sm text-[#020c1a]/60">
            Your appointment has been successfully scheduled. A confirmation email with your booking details has been sent to your inbox.
          </p>
          {emailStatus === 'sending' && (
            <p className="mt-2 text-xs text-[#020c1a]/60">
              Finalizing your confirmation email...
            </p>
          )}
          {emailStatus === 'failed' && (
            <p className="mt-2 text-xs text-[#020c1a]/60">
              Your payment was received, but we could not resend the confirmation email yet.
            </p>
          )}
          {reference && (
            <p className="mt-3 text-xs text-[#020c1a]/60">
              Reference: <span className="font-mono">{reference}</span>
            </p>
          )}
          {redirectCountdown !== null && (
            <p className="mt-3 text-xs text-[#020c1a]/60">
              Redirecting in {redirectCountdown}s...
            </p>
          )}
          <Button 
            className="mt-6 h-12 rounded-full bg-[#020c1a] px-8 text-white hover:bg-[#020c1a]/90" 
            onClick={() => {
              setRedirectCountdown(null);
              navigate(businessSlug ? `/booking/${businessSlug}` : '/');
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 text-[#020c1a] sm:px-6 lg:px-10 lg:py-10 max-w-3xl mx-auto">
      <BackButton onClick={() => navigate(businessSlug ? `/booking/${businessSlug}` : '/')} />

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-6">Appointment Confirmed!</h1>

        {/* Booking Confirmation Card */}
        <BookingConfirmationCard
          appointmentName={state.appointmentName}
          date={state.date}
          time={state.time}
          className="mb-6 w-full"
        />

        <p className="text-sm font-medium mt-6 mb-2">
          A confirmation has been sent to your email.
        </p>
        {emailStatus === 'sending' && (
          <p className="text-xs text-[#020c1a]/60 mb-2">
            Finalizing your confirmation email...
          </p>
        )}
        {emailStatus === 'failed' && (
          <p className="text-xs text-[#020c1a]/60 mb-2">
            Your payment was received, but we could not resend the confirmation email yet.
          </p>
        )}
        {redirectCountdown !== null && (
          <p className="text-xs text-[#020c1a]/60 mb-6">
            Redirecting in {redirectCountdown}s...
          </p>
        )}

        <div className="w-full grid gap-3 mt-6 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full border-[#020c1a]/20 text-[#020c1a] hover:bg-[#020c1a]/[0.03] hover:text-[#020c1a] focus-visible:ring-[#020c1a]"
            onClick={() => setRedirectCountdown(null)}
          >
            Add to calendar
          </Button>
          <Button 
            className="w-full h-12 rounded-full bg-[#020c1a] text-white hover:bg-[#020c1a]/90" 
            onClick={() => {
              setRedirectCountdown(null);
              navigate(businessSlug ? `/booking/${businessSlug}` : '/');
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
