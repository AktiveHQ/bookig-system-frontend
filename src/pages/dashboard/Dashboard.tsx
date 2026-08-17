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
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Copy,
  MoreVertical,
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
  const { user } = useAuth();
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

  const todayUpcoming = upcomingBookings.filter(booking => booking.date === today).length;
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todayBookings = getBookingsOnDate(activeBookings, today);
  const yesterdayBookings = getBookingsOnDate(activeBookings, yesterday);
  const todayEarnings = getBookingEarnings(todayBookings, appointmentsById);
  const yesterdayEarnings = getBookingEarnings(yesterdayBookings, appointmentsById);
  const earningsDelta =
    yesterdayEarnings > 0 ? Math.max(todayEarnings - yesterdayEarnings, 0) : 0;
  const bookingDelta =
    yesterdayBookings.length > 0
      ? Math.max(todayBookings.length - yesterdayBookings.length, 0)
      : 0;

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
          <button className="relative rounded-full border bg-card p-2.5" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
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

        <button
          className="w-full rounded-2xl bg-[#111827] p-5 text-left text-white shadow-sm"
          onClick={() => navigate('/dashboard/analytics')}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Today's Earnings</p>
            <MoreVertical className="h-5 w-5 text-white/60" />
          </div>
          <p className="mt-7 text-4xl font-extrabold tracking-tight">{formatCurrency(todayEarnings)}</p>
          <p className="mt-4 inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            Up {formatCurrency(earningsDelta)} from yesterday
          </p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-sm font-medium text-white/75">View all earnings</p>
          </div>
        </button>

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Upcoming Today"
            value={todayUpcoming}
            helper="Today"
            onClick={() => navigate('/dashboard/bookings?filter=upcoming')}
          />
          <SummaryCard
            label="Total Bookings"
            value={activeBookings.length}
            helper={`Up ${bookingDelta} from yesterday`}
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
              className="h-12 rounded-full gap-2 bg-card"
              onClick={() => navigate('/dashboard/bookings?filter=upcoming&create=appointment')}
            >
              <Plus className="h-4 w-4" />
              Appointment
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-full gap-2 bg-card"
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
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  onClick: () => void;
}) => (
  <button className="rounded-xl border bg-card p-4 text-left shadow-sm" onClick={onClick}>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-extrabold">{value}</p>
    <p className="mt-2 text-xs font-medium text-emerald-600">{helper}</p>
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
    .reduce((sum, booking) => sum + Number(appointmentsById.get(booking.appointmentId)?.price ?? 0), 0);

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

export default Dashboard;
