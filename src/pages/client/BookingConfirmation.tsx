import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { TimeslotCountdown, TimeslotExpiredAlert } from '@/components/shared/TimeslotCountdown';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

type BookingState = {
  appointmentId: string;
  appointmentName?: string;
  appointmentPrice?: number;
  appointmentCurrency?: string;
  date: string;
  time: string;
};

type TimeslotLock = {
  lockId: string;
  serviceId: string;
  date: string;
  time: string;
  expiresAt: number;
  lockDurationMs: number;
};

type ApiError = Error & { status?: number };

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const message =
        json?.message ||
        json?.error ||
        json?.details ||
        json?.detail;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    } else {
      const text = await response.text();
      if (text.trim()) return text.slice(0, 300);
    }
  } catch {
    // ignore parse errors and use fallback
  }
  return fallback;
};

const getOrCreateSessionId = () => {
  const key = 'akhq:bookingSessionId';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const BookingConfirmation = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as BookingState | null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<null | {
    subtotal: number;
    platformFeeAmount: number;
    amountToCharge: number;
    currency: string;
  }>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [timeslotLock, setTimeslotLock] = useState<TimeslotLock | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockExpired, setLockExpired] = useState(false);

  if (!state?.appointmentId || !state?.date || !state?.time) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Booking information not found.</p>
      </div>
    );
  }

  // Lock timeslot on page load
  useEffect(() => {
    let active = true;
    const lockSlot = async () => {
      setLockLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/public/bookings/${state.appointmentId}/lock-slot`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': getOrCreateSessionId(),
            },
            body: JSON.stringify({
              date: state.date,
              startTimeLocal: state.time,
            }),
          }
        );

        if (!res.ok) {
          const message = await getResponseErrorMessage(res, 'Failed to lock timeslot');
          const apiError: ApiError = new Error(message);
          apiError.status = res.status;
          throw apiError;
        }

        const json = await res.json();
        if (active) {
          const lock: TimeslotLock = {
            lockId: json.lockId,
            serviceId: state.appointmentId,
            date: state.date,
            time: state.time,
            expiresAt: new Date(json.expiresAt).getTime(),
            lockDurationMs: json.lockDurationMs,
          };
          setTimeslotLock(lock);

          try {
            sessionStorage.setItem('akhq:timeslotLock', JSON.stringify(lock));
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.error('Failed to lock timeslot', error);
        const apiError = error as ApiError;

        if (apiError?.status === 409) {
          toast({
            title: 'Slot no longer available',
            description: apiError.message || 'That time was just taken. Please choose another slot.',
            variant: 'destructive',
          });
          setTimeout(() => navigate(-1), 2000);
        } else {
          toast({
            title: 'Unable to reserve timeslot',
            description: apiError?.message || 'Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (active) setLockLoading(false);
      }
    };

    lockSlot();
    return () => {
      active = false;
    };
  }, [state.appointmentId, state.date, state.time, navigate]);

  useEffect(() => {
    let active = true;
    const loadCheckout = async () => {
      setCheckoutLoading(true);
      try {
        const res = await fetch(`${API_BASE}/public/services/${state.appointmentId}/checkout`);
        if (!res.ok) throw new Error('Failed to load checkout');
        const json = await res.json();
        if (!active) return;
        setCheckout({
          subtotal: Number(json?.subtotal ?? 0),
          platformFeeAmount: Number(json?.platformFeeAmount ?? 0),
          amountToCharge: Number(json?.amountToCharge ?? 0),
          currency: String(json?.currency ?? state.appointmentCurrency ?? 'NGN'),
        });
      } catch (error) {
        console.error('Failed to load checkout', error);
        if (active) setCheckout(null);
      } finally {
        if (active) setCheckoutLoading(false);
      }
    };

    void loadCheckout();
    return () => {
      active = false;
    };
  }, [state.appointmentId, state.appointmentCurrency]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const currency = checkout?.currency || state.appointmentCurrency || 'NGN';
  const subtotal = checkout?.subtotal ?? Number(state.appointmentPrice ?? 0);
  const platformFee = checkout?.platformFeeAmount ?? 0;
  const total = checkout?.amountToCharge ?? subtotal;
  const formattedPayAmount = useMemo(() => `${currency} ${Number(total).toLocaleString()}`, [currency, total]);

  const handlePay = async () => {
    if (lockExpired) {
      toast({
        title: 'Timeslot reservation expired',
        description: 'Your timeslot reservation has expired. Please select a new time.',
        variant: 'destructive',
      });
      return;
    }

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
          lockId: timeslotLock?.lockId,
        }),
      });

      if (!bookingResponse.ok) {
        const message = await getResponseErrorMessage(
          bookingResponse,
          'Failed to create booking'
        );
        const apiError: ApiError = new Error(message);
        apiError.status = bookingResponse.status;
        throw apiError;
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
        const message = await getResponseErrorMessage(
          paymentResponse,
          'Failed to initialize payment'
        );
        const apiError: ApiError = new Error(message);
        apiError.status = paymentResponse.status;
        throw apiError;
      }

      const paymentJson = await paymentResponse.json();
      const authorizationUrl = paymentJson?.authorizationUrl;

      if (!authorizationUrl) {
        throw new Error('Payment URL missing');
      }

      try {
        sessionStorage.setItem(
          'akhq:lastBooking',
          JSON.stringify({
            bookingId: Number(bookingId),
            slug,
            appointmentName: state.appointmentName,
            date: state.date,
            time: state.time,
            amountToCharge: Number(paymentJson?.amountToCharge ?? total),
            currency: String(paymentJson?.currency ?? currency),
            lockId: timeslotLock?.lockId,
          })
        );
      } catch {
        // ignore
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(error);
      const apiError = error as ApiError;
      let title = 'Unable to continue payment';
      let description = apiError?.message || 'Please try again.';

      if (apiError?.status === 409) {
        title = 'Slot no longer available';
        description = apiError.message || 'That time was just taken. Please choose another slot.';
      } else if (apiError?.status === 500) {
        title = 'Payment initialization failed';
        description = apiError.message || 'Server error while starting payment. Please try again.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleLockExpire = useCallback(() => {
    setLockExpired(true);
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 text-[#020c1a] sm:px-6 lg:px-10 lg:py-10 max-w-5xl mx-auto">
      <BackButton />

      <div className="mt-6 space-y-6">
        <h1 className="text-xl font-bold text-[#020c1a] lg:text-2xl">Confirm your booking</h1>

        {lockExpired && (
          <TimeslotExpiredAlert onRetry={() => navigate(-1)} />
        )}

        {timeslotLock && !lockExpired && (
          <TimeslotCountdown
            expiresAt={timeslotLock.expiresAt}
            isActive={true}
            onExpire={handleLockExpire}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="border border-[#020c1a]/10 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold">{state.appointmentName || 'Selected service'}</h3>
              <div className="flex items-center gap-2 text-sm text-[#020c1a]/60">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(parseISO(state.date), 'EEEE, d MMMM')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#020c1a]/60">
                <Clock className="h-4 w-4" />
                <span>{formatTime(state.time)}</span>
              </div>
              <p className="text-sm font-medium">{currency} {Number(subtotal).toLocaleString()}</p>
            </div>

            <div className="border border-[#020c1a]/10 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-sm">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#020c1a]/60">Item</span>
                  <span className="text-[#020c1a]/60">Amount</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>{currency} {Number(subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#020c1a]/60">Service charge (5%)</span>
                  <span className="text-[#020c1a]/60">
                    {checkoutLoading ? '...' : `${currency} ${Number(platformFee).toLocaleString()}`}
                  </span>
                </div>
                <div className="border-t border-[#020c1a]/10 pt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{checkoutLoading ? '...' : `${currency} ${Number(total).toLocaleString()}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4 border border-[#020c1a]/10 rounded-2xl p-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl border-[#020c1a]/10 focus-visible:ring-[#020c1a]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl border-[#020c1a]/10 focus-visible:ring-[#020c1a]" />
              </div>
            </div>

            <p className="text-xs text-center text-[#020c1a]/55">
              Pay Securely. Powered by Paystack
            </p>

            <Button
              onClick={handlePay}
              className="w-full h-12 rounded-full gap-2 bg-[#020c1a] text-white hover:bg-[#020c1a]/90"
              disabled={!fullName || !email || loading || checkoutLoading || lockLoading || lockExpired}
            >
              {loading ? 'Processing...' : `Pay ${formattedPayAmount}`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
