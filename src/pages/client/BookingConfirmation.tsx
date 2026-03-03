import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://booking-system-backend-h7ho.onrender.com'
).replace(/\/$/, '');

type BookingState = {
  appointmentId: string;
  appointmentName?: string;
  appointmentPrice?: number;
  appointmentCurrency?: string;
  date: string;
  time: string;
};

const BookingConfirmation = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as BookingState | null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state?.appointmentId || !state?.date || !state?.time) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Booking information not found.</p>
      </div>
    );
  }

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const appointmentPrice = Number(state.appointmentPrice ?? 0);
  const currency = state.appointmentCurrency || 'NGN';
  const total = appointmentPrice;

  const handlePay = async () => {
    setLoading(true);
    try {
      const bookingResponse = await fetch(`${API_BASE}/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: Number(state.appointmentId),
          clientName: fullName,
          clientEmail: email,
          date: state.date,
          startTimeLocal: state.time,
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      const bookingJson = await bookingResponse.json();
      const bookingId = bookingJson?.bookingId;
      if (!bookingId) throw new Error('Booking ID missing');

      const paymentResponse = await fetch(
        `${API_BASE}/public/bookings/${bookingId}/payments/initialize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!paymentResponse.ok) {
        throw new Error('Failed to initialize payment');
      }

      const paymentJson = await paymentResponse.json();
      const authorizationUrl = paymentJson?.authorizationUrl;

      if (!authorizationUrl) {
        throw new Error('Payment URL missing');
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(error);
      toast({
        title: 'Unable to continue payment',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-5xl mx-auto">
      <BackButton />

      <div className="mt-6 space-y-6">
        <h1 className="text-xl font-bold lg:text-2xl">Confirm your booking</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold">{state.appointmentName || 'Selected service'}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(parseISO(state.date), 'EEEE, d MMMM')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(state.time)}</span>
              </div>
              <p className="text-sm font-medium">{currency} {appointmentPrice.toLocaleString()}</p>
            </div>

            <div className="border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-sm">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item</span>
                  <span className="text-muted-foreground">Amount</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>{currency} {appointmentPrice.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{currency} {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4 border rounded-2xl p-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Pay Securely. Powered by Paystack
            </p>

            <Button onClick={handlePay} className="w-full h-12 rounded-full gap-2" disabled={!fullName || !email || loading}>
              {loading ? 'Processing...' : `Pay ${currency} ${total.toLocaleString()}`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
