import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BookingConfirmationCard from '@/components/shared/BookingConfirmationCard';
import { CalendarPlus, CheckCircle } from 'lucide-react';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const formatIcsDate = (value: string) =>
  new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const BookingConfirmed = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as {
    appointmentName: string;
    date: string;
    time: string;
    total: number;
    slug?: string;
    bookingId?: number | string;
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
        bookingId: parsed?.bookingId,
      };
    } catch {
      return null;
    }
  });
  const state = routeState ?? storedState;
  const businessSlug = slug || state?.slug;
  const reference = new URLSearchParams(location.search).get('reference');
  const bookingId = new URLSearchParams(location.search).get('bookingId') || storedState?.bookingId;
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>(
    reference ? 'sending' : 'idle',
  );
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarFilename, setCalendarFilename] = useState('aktivehq-booking.ics');

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

  useEffect(() => {
    if (!bookingId) return;

    let active = true;
    const loadBooking = async () => {
      try {
        const response = await fetch(`${API_BASE}/public/bookings/${bookingId}`);
        if (!response.ok) throw new Error('Booking details unavailable');
        const booking = await response.json();
        const business = booking?.business;
        const service = booking?.service;
        const businessName = String(business?.name ?? 'Business');
        const serviceName = String(service?.name ?? state?.appointmentName ?? 'Appointment');
        const locationText = [business?.address, business?.city, business?.country]
          .filter(Boolean)
          .join(', ');
        const title = `${serviceName} with ${businessName}`;
        const details = ['Booking via AktiveHQ', `Booking reference: AKT-${booking.id}`].join('\n');
        const ics = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//AktiveHQ//Booking Calendar//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:aktivehq-booking-${booking.id}@aktivehq`,
          `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
          `DTSTART:${formatIcsDate(booking.startAt)}`,
          `DTEND:${formatIcsDate(booking.endAt)}`,
          `SUMMARY:${escapeIcsText(title)}`,
          `DESCRIPTION:${escapeIcsText(details)}`,
          `LOCATION:${escapeIcsText(locationText)}`,
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        if (active) {
          setCalendarUrl(previousUrl => {
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            return objectUrl;
          });
          setCalendarFilename(`aktivehq-booking-${booking.id}.ics`);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        console.error('[BookingConfirmed] Calendar details failed', error);
      }
    };

    void loadBooking();
    return () => {
      active = false;
    };
  }, [bookingId, state?.appointmentName]);

  useEffect(() => {
    return () => {
      if (calendarUrl) URL.revokeObjectURL(calendarUrl);
    };
  }, [calendarUrl]);

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
          {calendarUrl && (
            <Button
              asChild
              variant="outline"
              className="mt-6 h-12 rounded-full border-[#020c1a]/20 px-8 text-[#020c1a]"
            >
              <a href={calendarUrl} download={calendarFilename}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to Calendar
              </a>
            </Button>
          )}
          <Button 
            className="mt-3 h-12 rounded-full bg-[#020c1a] px-8 text-white hover:bg-[#020c1a]/90" 
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
          {calendarUrl && (
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-full border-[#020c1a]/20 text-[#020c1a] hover:bg-[#020c1a]/[0.03] hover:text-[#020c1a] focus-visible:ring-[#020c1a] sm:col-span-2"
            >
              <a href={calendarUrl} download={calendarFilename}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to Calendar
              </a>
            </Button>
          )}
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
