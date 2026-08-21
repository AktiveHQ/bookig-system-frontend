import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  isAfter,
  isSameDay,
  parseISO,
  subDays,
} from 'date-fns';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Copy,
  LogOut,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment, Booking } from '@/types';

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const EARNING_BOOKING_STATUSES = ['confirmed', 'completed'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { appointments, bookings, business } = useData();
  const { user, logout } = useAuth();
  const userName = getUserDisplayName(user?.displayName, user?.email);
  const today = format(new Date(), 'yyyy-MM-dd');
  const bookingLink =
    business?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${business.slug}`
      : '';

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const activeBookings = useMemo(
    () => bookings.filter(booking => ACTIVE_BOOKING_STATUSES.includes(booking.status)),
    [bookings],
  );

  const upcomingBookings = useMemo(
    () =>
      activeBookings
        .filter(booking => isUpcomingBooking(booking))
        .map(booking => ({
          ...booking,
          appointment: appointmentsById.get(booking.appointmentId),
        }))
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [activeBookings, appointmentsById],
  );

  const todayUpcomingBookings = upcomingBookings.filter(booking => booking.date === today);
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todayBookings = getBookingsOnDate(activeBookings, today);
  const yesterdayBookings = getBookingsOnDate(activeBookings, yesterday);
  const allEarnings = getBookingEarnings(activeBookings, appointmentsById);
  const todayEarnings = getBookingEarnings(todayBookings, appointmentsById);
  const yesterdayEarnings = getBookingEarnings(yesterdayBookings, appointmentsById);
  const earningsDelta = todayEarnings - yesterdayEarnings;
  const bookingDelta = todayBookings.length - yesterdayBookings.length;
  const workingDayEnded = hasWorkingDayEnded(appointments);
  const earningsDeltaLabel = getDeltaLabel({
    delta: earningsDelta,
    formatter: formatCurrency,
    workingDayEnded,
    suffix: ' from yesterday',
  });
  const bookingsDeltaLabel = getDeltaLabel({
    delta: bookingDelta,
    formatter: value => value.toLocaleString('en-NG'),
    workingDayEnded,
    suffix: ' from yesterday',
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCopyLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast({ title: 'Business link copied', description: 'Share it with clients to receive bookings.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">Hello, {userName}</h1>
              <p className="truncate text-sm text-muted-foreground">Your business is looking good today.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-full border bg-card p-2.5" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6B4EFF]" />
            </button>
            <button className="rounded-full border bg-card p-2.5 lg:hidden" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {bookingLink && (
          <button
            className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left"
            onClick={handleCopyLink}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business link</p>
              <p className="mt-1 truncate text-sm font-medium">{bookingLink}</p>
            </div>
            <Copy className="h-4 w-4 shrink-0 text-primary" />
          </button>
        )}

        <section
          className="w-full rounded-2xl bg-[#111827] p-5 text-left text-white shadow-sm"
        >
          <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Today's Earnings</p>
          </div>
          <p className="mt-7 text-4xl font-extrabold tracking-tight">{formatCurrency(todayEarnings)}</p>
          {earningsDeltaLabel && (
            <p className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              earningsDeltaLabel.tone === 'positive'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-red-500/15 text-red-300'
            }`}>
              {earningsDeltaLabel.text}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <button
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold text-white/85 hover:bg-white/15"
              onClick={() => navigate('/dashboard/transactions?tab=earnings')}
            >
              <span className="truncate">View earnings</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
            <button
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold text-white/85 hover:bg-white/15"
              onClick={() => navigate('/dashboard/transactions?tab=payouts')}
            >
              <span className="truncate">Payout history</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button className="rounded-xl border bg-card p-3 text-left" onClick={() => navigate('/dashboard/analytics')}>
            <p className="text-xs font-medium text-muted-foreground">Total earnings</p>
            <p className="mt-1 text-base font-bold">{formatCurrency(allEarnings)}</p>
          </button>
          <button className="rounded-xl border bg-card p-3 text-left" onClick={() => navigate('/dashboard/analytics')}>
            <p className="text-xs font-medium text-muted-foreground">Total bookings</p>
            <p className="mt-1 text-base font-bold">{activeBookings.length.toLocaleString('en-NG')}</p>
          </button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Today's Bookings"
            value={todayUpcomingBookings.length}
            helper={bookingsDeltaLabel?.text}
            tone={bookingsDeltaLabel?.tone}
            onClick={() => navigate('/dashboard/bookings?filter=upcoming')}
          />
          <SummaryCard
            label="Upcoming Bookings"
            value={upcomingBookings.length}
            helper="Today and future"
            onClick={() => navigate('/dashboard/bookings')}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Upcoming bookings</h2>
            <button
              className="text-sm font-semibold text-primary"
              onClick={() => navigate('/dashboard/bookings?filter=upcoming')}
            >
              View all
            </button>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-5 text-center">
              <p className="font-semibold">No upcoming bookings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Share your business link so clients can book a time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map(booking => (
                <UpcomingBookingCard
                  key={booking.id}
                  booking={booking}
                  appointment={booking.appointment}
                  onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-xl gap-2 bg-card"
              onClick={() => navigate('/dashboard/bookings?filter=upcoming&create=appointment')}
            >
              <Plus className="h-4 w-4" />
              Appointment
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl gap-2 bg-card"
              onClick={() => navigate('/appointments/create')}
            >
              <Plus className="h-4 w-4" />
              Service
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold">Business insights</p>
          <p className="mt-1 text-sm text-muted-foreground">Coming soon...</p>
        </section>
      </main>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  helper,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: number;
  helper?: string;
  tone?: 'positive' | 'negative' | 'neutral';
  onClick: () => void;
}) => (
  <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={onClick}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-extrabold">{value}</p>
    {helper && (
      <p className={`mt-2 text-xs font-medium ${
        tone === 'negative' ? 'text-red-600' : tone === 'positive' ? 'text-emerald-600' : 'text-muted-foreground'
      }`}>
        {helper}
      </p>
    )}
  </button>
);

const UpcomingBookingCard = ({
  appointment,
  booking,
  onClick,
}: {
  appointment?: Appointment;
  booking: Booking & { appointment?: Appointment };
  onClick: () => void;
}) => {
  const serviceName = appointment?.name || booking.appointmentName || 'Service';
  const statusLabel = booking.status === 'pending_payment' ? 'Pending' : 'Paid';

  return (
    <button className="w-full rounded-xl border bg-card p-3 text-left shadow-sm" onClick={onClick}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
          <CalendarDays className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{serviceName}</span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">{booking.clientName || 'Client'}</span>
            </span>
            <span className="shrink-0 text-sm font-bold">{formatCurrency(Number(appointment?.price ?? 0))}</span>
          </span>
          <span className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{formatBookingDay(booking.date)} · {formatTime(booking.time)} · {appointment?.duration ?? 0} mins</span>
            <span className={booking.status === 'pending_payment' ? 'text-blue-600' : 'text-emerald-600'}>
              {statusLabel}
            </span>
          </span>
        </span>
      </div>
    </button>
  );
};

const isUpcomingBooking = (booking: Booking) => {
  const parsed = parseISO(booking.date);
  const today = new Date();
  return isAfter(parsed, today) || isSameDay(parsed, today);
};

const getBookingsOnDate = (bookings: Booking[], date: string) =>
  bookings.filter(booking => booking.date === date);

const getBookingEarnings = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
) =>
  bookings
    .filter(booking => EARNING_BOOKING_STATUSES.includes(booking.status))
    .reduce(
      (sum, booking) =>
        sum + Number(booking.payment?.vendorNetAmount ?? appointmentsById.get(booking.appointmentId)?.price ?? 0),
      0,
    );

const formatCurrency = (value: number) =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`;

const getUserDisplayName = (displayName?: string | null, email?: string | null) => {
  const trimmedName = displayName?.trim();
  if (trimmedName) return trimmedName.split(/\s+/)[0];

  const emailName = email?.split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'there';
};

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const formatBookingDay = (date: string) => {
  if (!date) return '';
  const parsed = parseISO(date);
  if (isSameDay(parsed, new Date())) return 'Today';
  return format(parsed, 'MMM d');
};

const hasWorkingDayEnded = (appointments: Appointment[]) => {
  const latestEnd = appointments.reduce((latest, appointment) => {
    const minutes = getTimeInMinutes(appointment.endTime);
    return Math.max(latest, minutes);
  }, 18 * 60);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= latestEnd;
};

const getTimeInMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const getDeltaLabel = ({
  delta,
  formatter,
  suffix,
  workingDayEnded,
}: {
  delta: number;
  formatter: (value: number) => string;
  suffix: string;
  workingDayEnded: boolean;
}): { text: string; tone: 'positive' | 'negative' } | null => {
  if (delta > 0) {
    return { text: `+${formatter(delta)}${suffix}`, tone: 'positive' };
  }
  if (workingDayEnded && delta < 0) {
    return { text: `-${formatter(Math.abs(delta))}${suffix}`, tone: 'negative' };
  }
  return null;
};

export default Dashboard;
