import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/shared/BackButton';
import { CheckCircle, CalendarIcon, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://booking-system-backend-h7ho.onrender.com'
).replace(/\/$/, '');

const BookingConfirmed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const state = location.state as {
    appointmentName: string;
    date: string;
    time: string;
    total: number;
    currency?: string;
  } | null;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booking, setBooking] = useState<null | {
    bookingId: number;
    appointmentName: string;
    date: string;
    time: string;
    startAt?: string;
    endAt?: string;
    status: string;
    total: number;
    currency: string;
  }>(null);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const bookingIdFromQuery = Number(searchParams.get('bookingId') || '');

  useEffect(() => {
    if (state) {
      setBooking({
        bookingId: 0,
        appointmentName: state.appointmentName,
        date: state.date,
        time: state.time,
        status: 'CONFIRMED',
        total: Number(state.total ?? 0),
        currency: String(state.currency ?? 'NGN'),
      });
      return;
    }

    const stored = (() => {
      try {
        const raw = sessionStorage.getItem('akhq:lastBooking');
        return raw ? (JSON.parse(raw) as any) : null;
      } catch {
        return null;
      }
    })();

    const bookingId =
      Number.isFinite(bookingIdFromQuery) && bookingIdFromQuery > 0
        ? bookingIdFromQuery
        : Number(stored?.bookingId ?? 0);

    const expectedSlug = String(slug ?? '');
    const storedSlug = stored?.slug ? String(stored.slug) : '';
    if (storedSlug && expectedSlug && storedSlug !== expectedSlug) {
      // ignore stored data from a different booking page
    }

    if (!bookingId) {
      setErrorMessage('No booking information.');
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/bookings/${bookingId}`);
        if (!res.ok) throw new Error('Unable to load booking status');
        const json = await res.json();
        if (!active) return;

        const status = String(json?.status ?? 'PENDING_PAYMENT');
        const startAt = String(json?.startAt ?? '');
        const endAt = String(json?.endAt ?? '');

        const dt = startAt ? new Date(startAt) : null;
        const date = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : '';
        const time =
          dt && !Number.isNaN(dt.getTime())
            ? `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`
            : '';

        setBooking({
          bookingId,
          appointmentName: String(json?.service?.name ?? stored?.appointmentName ?? 'Service'),
          date: date || String(stored?.date ?? ''),
          time: time || String(stored?.time ?? ''),
          startAt,
          endAt,
          status,
          total: Number(stored?.amountToCharge ?? 0),
          currency: String(stored?.currency ?? json?.service?.currency ?? 'NGN'),
        });

        if (status === 'CONFIRMED') {
          setLoading(false);
          return;
        }
        if (status === 'CANCELLED' || status === 'EXPIRED') {
          setLoading(false);
          setErrorMessage('Payment was not completed. Please try again.');
          return;
        }
      } catch (error) {
        if (!active) return;
        setLoading(false);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load booking status');
        return;
      }

      setTimeout(() => {
        if (active) void poll();
      }, 2000);
    };

    void poll();
    return () => {
      active = false;
    };
  }, [bookingIdFromQuery, location.state, slug]);

  const shown = booking;
  if (!shown && (loading || !errorMessage)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading confirmation...</p>
      </div>
    );
  }

  if (errorMessage && !shown) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const displayDate = shown?.date ? format(parseISO(shown.date), 'EEEE, d MMMM') : '';
  const displayTime = shown?.time ? formatTime(shown.time) : '';
  const isConfirmed = String(shown?.status ?? '').toUpperCase() === 'CONFIRMED';

  const downloadIcs = () => {
    if (!shown?.startAt || !shown?.endAt) return;
    const dtStart = new Date(shown.startAt);
    const dtEnd = new Date(shown.endAt);
    if (Number.isNaN(dtStart.getTime()) || Number.isNaN(dtEnd.getTime())) return;

    const formatUtc = (d: Date) =>
      `${d.getUTCFullYear()}${(d.getUTCMonth() + 1).toString().padStart(2, '0')}${d
        .getUTCDate()
        .toString()
        .padStart(2, '0')}T${d.getUTCHours().toString().padStart(2, '0')}${d
        .getUTCMinutes()
        .toString()
        .padStart(2, '0')}00Z`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AktiveHQ//Booking//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:akhq-${shown.bookingId}@aktivehq`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART:${formatUtc(dtStart)}`,
      `DTEND:${formatUtc(dtEnd)}`,
      `SUMMARY:${shown.appointmentName}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booking.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const donePath = slug ? `/booking/${slug}` : '/';

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-3xl mx-auto">
      <BackButton onClick={() => navigate('/')} />

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">
          {isConfirmed ? 'Booking confirmed!' : 'Processing payment...'}
        </h1>

        <div className="border rounded-2xl p-5 w-full space-y-3 mt-6 text-left lg:p-6">
          <h3 className="font-semibold">{shown?.appointmentName ?? 'Service'}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{displayDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{displayTime}</span>
          </div>
        </div>

        {isConfirmed && <CheckCircle className="h-12 w-12 text-green-600 mt-6" />}

        <p className="text-sm text-muted-foreground mt-4">
          {isConfirmed ? 'A confirmation has been sent to your email.' : 'Please wait while we confirm your payment.'}
        </p>

        <div className="w-full grid gap-3 mt-8 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full"
            onClick={downloadIcs}
            disabled={!isConfirmed}
          >
            Add to calendar
          </Button>
          <Button className="w-full h-12 rounded-full" onClick={() => navigate(donePath)}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
