import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, format, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, ChevronRight, ListFilter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import type { Appointment, Booking } from '@/types';
import { cn } from '@/lib/utils';

const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const PAID_STATUSES = ['confirmed', 'completed'];

const BookingsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    appointments,
    bookings,
    business,
    fetchBookingHistory,
    refreshBookingsForDate,
  } = useData();
  const initialFilter = searchParams.get('filter') === 'upcoming' ? 'upcoming' : 'today';
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'past'>(initialFilter);
  const [showCalendar, setShowCalendar] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!business?.slug || appointments.length === 0) return;
    void Promise.all(appointments.map(appointment => refreshBookingsForDate(appointment.id, today)));
    void fetchBookingHistory({
      from: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
      to: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    });
  }, [appointments, business?.slug, fetchBookingHistory, refreshBookingsForDate, today]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('filter', filter);
    setSearchParams(next, { replace: true });
  }, [filter]);

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const enrichedBookings = useMemo(
    () =>
      bookings
        .filter(booking => ACTIVE_STATUSES.includes(booking.status))
        .map(booking => ({
          ...booking,
          appointment: appointmentsById.get(booking.appointmentId),
        })),
    [appointmentsById, bookings],
  );

  const filteredBookings = useMemo(
    () =>
      enrichedBookings
        .filter(booking => {
          const date = parseISO(booking.date);
          if (filter === 'today') return isSameDay(date, new Date());
          if (filter === 'past') return isBefore(date, startOfToday());
          return isAfter(date, startOfToday()) || isSameDay(date, new Date());
        })
        .sort((a, b) => {
          const comparison = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
          return filter === 'past' ? comparison * -1 : comparison;
        }),
    [enrichedBookings, filter],
  );

  const calendarGroups = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(new Date(), index);
        const key = format(date, 'yyyy-MM-dd');
        return {
          date,
          bookings: enrichedBookings
            .filter(booking => booking.date === key)
            .sort((a, b) => a.time.localeCompare(b.time)),
        };
      }),
    [enrichedBookings],
  );

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">{enrichedBookings.length} total</p>
          </div>
          <Button
            className="h-10 shrink-0 rounded-full gap-2"
            onClick={() => navigate('/dashboard/bookings?filter=upcoming&create=appointment')}
          >
            <Plus className="h-4 w-4" />
            Appointment
          </Button>
        </header>

        <section className="flex items-center gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-3 rounded-full border bg-card p-1">
            {(['upcoming', 'today', 'past'] as const).map(item => (
              <button
                key={item}
                className={cn(
                  'h-9 rounded-full text-sm font-medium capitalize',
                  filter === item && 'bg-foreground text-background',
                )}
                onClick={() => {
                  setFilter(item);
                  setShowCalendar(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card',
              showCalendar && 'bg-foreground text-background',
            )}
            onClick={() => setShowCalendar(value => !value)}
            aria-label="View calendar"
          >
            {showCalendar ? <CalendarDays className="h-5 w-5" /> : <ListFilter className="h-5 w-5" />}
          </button>
        </section>

        {showCalendar ? (
          <CalendarPanel groups={calendarGroups} onOpenBooking={id => navigate(`/dashboard/bookings/${id}`)} />
        ) : (
          <section className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-5 text-center">
                <p className="font-semibold">No {filter} bookings</p>
                <p className="mt-1 text-sm text-muted-foreground">Bookings will appear here as clients reserve your services.</p>
              </div>
            ) : (
              filteredBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  appointment={booking.appointment}
                  onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                />
              ))
            )}
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Services</h2>
            <button
              className="text-sm text-muted-foreground"
              onClick={() => navigate('/appointments/create')}
            >
              Manage what you offer
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            {appointments.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No services yet.</div>
            ) : (
              appointments.map(appointment => (
                <button
                  key={appointment.id}
                  className="flex w-full items-center justify-between gap-3 border-b px-4 py-4 text-left last:border-b-0 hover:bg-accent/60"
                  onClick={() => navigate(`/dashboard/appointment/${appointment.id}`)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{appointment.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{appointment.duration} mins</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-semibold">
                    {formatCurrency(appointment.price)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

type BookingWithAppointment = Booking & { appointment?: Appointment };

const BookingCard = ({
  appointment,
  booking,
  onClick,
}: {
  appointment?: Appointment;
  booking: BookingWithAppointment;
  onClick: () => void;
}) => {
  const paid = PAID_STATUSES.includes(booking.status);
  return (
    <button className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm" onClick={onClick}>
      <p className="text-sm text-muted-foreground">{formatDate(booking.date)} · {formatTime(booking.time)}</p>
      <div className="mt-5">
        <h3 className="font-bold">{appointment?.name || booking.appointmentName || 'Service'}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{booking.clientName || 'Client'}</p>
      </div>
      <div className="mt-5 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">{formatCurrency(Number(appointment?.price ?? 0))}</p>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', paid ? 'bg-foreground text-background' : 'bg-accent text-primary')}>
            {paid ? 'Paid' : 'Pending'}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{appointment?.duration ?? 0} mins</p>
      </div>
    </button>
  );
};

const CalendarPanel = ({
  groups,
  onOpenBooking,
}: {
  groups: Array<{ date: Date; bookings: BookingWithAppointment[] }>;
  onOpenBooking: (id: string) => void;
}) => (
  <section className="space-y-3">
    {groups.map(group => (
      <div key={group.date.toISOString()} className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-bold">{isSameDay(group.date, new Date()) ? 'Today' : format(group.date, 'EEEE')}</p>
            <p className="text-sm text-muted-foreground">{format(group.date, 'MMM d, yyyy')}</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold">{group.bookings.length}</span>
        </div>
        {group.bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No bookings scheduled.</p>
        ) : (
          <div className="space-y-2">
            {group.bookings.map(booking => (
              <button
                key={booking.id}
                className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left hover:bg-accent/60"
                onClick={() => onOpenBooking(booking.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {booking.appointment?.name || booking.appointmentName || 'Service'}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {booking.clientName || 'Client'} · {formatTime(booking.time)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    ))}
  </section>
);

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const formatCurrency = (value: number) =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`;

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const formatDate = (date: string) => {
  if (!date) return '';
  const parsed = parseISO(date);
  if (isSameDay(parsed, new Date())) return 'Today';
  return format(parsed, 'd MMM');
};

export default BookingsList;
