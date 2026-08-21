import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getIdTokenOrThrow } from '@/lib/get-id-token';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).trim().replace(/\/$/, '');

type DashboardBooking = {
  id: number;
  clientName: string;
  clientEmail: string;
  startAt: string;
  endAt: string;
  status: string;
  service?: {
    name?: string;
    currency?: string;
    priceAmount?: number;
    durationMinutes?: number;
  };
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));

const BookingDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) return;

    let active = true;
    const loadBooking = async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getIdTokenOrThrow();
        const response = await fetch(`${API_BASE}/dashboard/bookings/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Unable to load booking');
        }
        const json = await response.json();
        if (active) setBooking(json);
      } catch (err) {
        console.error('[BookingDetail] load failed', err);
        if (active) setError(err instanceof Error ? err.message : 'Unable to load booking');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBooking();
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading booking...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <Button variant="outline" className="h-10 rounded-xl gap-2" onClick={() => navigate('/dashboard/bookings')}>
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">{error || 'Booking not found.'}</p>
      </div>
    );
  }

  const serviceName = booking.service?.name || 'Service';
  const price = Number(booking.service?.priceAmount ?? 0);
  const currency = booking.service?.currency || 'NGN';

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-3xl">
        <Button variant="outline" className="h-10 rounded-xl gap-2" onClick={() => navigate('/dashboard/bookings')}>
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Button>

        <header className="mt-6 border-b pb-5">
          <p className="text-sm text-muted-foreground">Booking #{booking.id}</p>
          <h1 className="mt-1 text-2xl font-bold">{serviceName}</h1>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Client
            </div>
            <p className="mt-2 font-medium">{booking.clientName || '-'}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
            </div>
            <p className="mt-2 font-medium">{booking.clientEmail || '-'}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Date
            </div>
            <p className="mt-2 font-medium">{formatDate(booking.startAt)}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time
            </div>
            <p className="mt-2 font-medium">{formatTime(booking.startAt)}</p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Payment</p>
          <p className="mt-2 font-medium">
            {currency} {price.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{booking.status}</p>
        </section>
      </main>
    </div>
  );
};

export default BookingDetail;
