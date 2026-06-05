import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BookingConfirmationCard from '@/components/shared/BookingConfirmationCard';
import { CheckCircle } from 'lucide-react';

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

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-[#020c1a]">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold">Booking Confirmed</h1>
          <p className="mt-2 text-sm text-[#020c1a]/60">
            Your appointment has been successfully scheduled. A confirmation email with your booking details has been sent to your inbox.
          </p>
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
          <Button 
            className="mt-6 h-12 rounded-full bg-[#020c1a] px-8 text-white hover:bg-[#020c1a]/90" 
            onClick={() => navigate(businessSlug ? `/booking/${businessSlug}` : '/')}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-12 text-[#020c1a] sm:px-6">
      <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <CheckCircle className="h-14 w-14 text-green-600" />
        <h1 className="mt-6 text-2xl font-bold">Booking confirmed</h1>
        <p className="mt-3 text-sm leading-6 text-[#020c1a]/60">
          Your appointment has been scheduled. A confirmation has been sent to your email.
        </p>

        <BookingConfirmationCard
          appointmentName={state.appointmentName}
          date={state.date}
          time={state.time}
          className="mt-10 w-full border-[#020c1a]"
        />

        {emailStatus === 'failed' && (
          <p className="mt-5 text-xs text-[#020c1a]/60">
            Your payment was received, but we could not resend the confirmation email yet.
          </p>
        )}

        <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full border-[#020c1a]/20 text-[#020c1a] hover:bg-[#020c1a]/[0.03] hover:text-[#020c1a] focus-visible:ring-[#020c1a]"
            onClick={() => navigate(businessSlug ? `/booking/${businessSlug}` : '/')}
          >
            Book another appointment
          </Button>
          <Button 
            className="w-full h-12 rounded-full bg-[#020c1a] text-white hover:bg-[#020c1a]/90" 
            onClick={() => navigate(businessSlug ? `/booking/${businessSlug}` : '/')}
          >
            Done
          </Button>
        </div>
      </main>
    </div>
  );
};

export default BookingConfirmed;
