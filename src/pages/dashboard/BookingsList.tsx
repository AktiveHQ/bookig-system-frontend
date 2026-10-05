import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { BriefcaseBusiness, CalendarDays, ChevronRight, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import type { Appointment, Booking } from '@/types';
import { cn } from '@/lib/utils';

const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const PAID_STATUSES = ['confirmed', 'completed'];
type BookingFilter = 'upcoming' | 'today' | 'history';
type HistoryPreset = 'today' | 'week' | 'month' | 'custom';
type SortMode = 'date_desc' | 'date_asc' | 'service';

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
  const initialFilter = getInitialFilter(searchParams.get('filter'));
  const initialRange = getInitialHistoryRange(searchParams);
  const [filter, setFilter] = useState<BookingFilter>(initialFilter);
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>(searchParams.get('from') || searchParams.get('to') ? 'custom' : 'month');
  const [historyRange, setHistoryRange] = useState(initialRange);
  const [serviceId, setServiceId] = useState(searchParams.get('serviceId') || 'all');
  const [sortMode, setSortMode] = useState<SortMode>(getInitialSort(searchParams.get('sort')));
  const [showTools, setShowTools] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!business?.slug || appointments.length === 0) return;
    void Promise.all(appointments.map(appointment => refreshBookingsForDate(appointment.id, today)));
    const historyFilters = filter === 'history'
      ? { from: historyRange.from, to: historyRange.to, serviceId }
      : {
          from: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
          to: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        };
    void fetchBookingHistory(historyFilters);
  }, [appointments, business?.slug, fetchBookingHistory, filter, historyRange.from, historyRange.to, refreshBookingsForDate, serviceId, today]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('filter', filter);
    if (filter === 'history') {
      next.set('from', historyRange.from);
      next.set('to', historyRange.to);
      next.set('serviceId', serviceId);
      next.set('sort', sortMode);
    } else {
      next.delete('from');
      next.delete('to');
      next.delete('serviceId');
      next.delete('sort');
    }
    setSearchParams(next, { replace: true });
  }, [filter, historyRange.from, historyRange.to, serviceId, sortMode]);

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
          if (filter === 'history') {
            const inRange = !isBefore(date, parseISO(historyRange.from)) && !isAfter(date, parseISO(historyRange.to));
            return inRange && (serviceId === 'all' || booking.appointmentId === serviceId);
          }
          return isAfter(date, startOfToday()) || isSameDay(date, new Date());
        })
        .sort((a, b) => {
          if (filter === 'history' && sortMode === 'service') {
            const serviceComparison = getServiceName(a).localeCompare(getServiceName(b));
            if (serviceComparison !== 0) return serviceComparison;
          }
          const comparison = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
          if (filter === 'history') return sortMode === 'date_asc' ? comparison : comparison * -1;
          return comparison;
        }),
    [enrichedBookings, filter, historyRange.from, historyRange.to, serviceId, sortMode],
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
            onClick={() => navigate('/dashboard/services')}
          >
            <BriefcaseBusiness className="h-4 w-4" />
            View Services
          </Button>
        </header>

        <section className="flex items-center gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-3 rounded-full border bg-card p-1">
            {(['upcoming', 'today', 'history'] as const).map(item => (
              <button
                key={item}
                className={cn(
                  'h-9 rounded-full text-sm font-medium capitalize',
                  filter === item && 'bg-[#020c1a] text-white',
                )}
                onClick={() => {
                  setFilter(item);
                  setShowTools(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card',
              showTools && 'bg-foreground text-background',
            )}
            onClick={() => setShowTools(value => !value)}
            aria-label={filter === 'history' ? 'Sort and filter history' : 'View calendar'}
          >
            {showTools && filter !== 'history' ? <CalendarDays className="h-5 w-5" /> : <ListFilter className="h-5 w-5" />}
          </button>
        </section>

        {showTools && filter === 'history' ? (
          <HistoryTools
            appointments={appointments}
            historyPreset={historyPreset}
            historyRange={historyRange}
            serviceId={serviceId}
            sortMode={sortMode}
            onPresetChange={preset => {
              setHistoryPreset(preset);
              if (preset !== 'custom') setHistoryRange(getPresetRange(preset));
            }}
            onRangeChange={setHistoryRange}
            onServiceChange={setServiceId}
            onSortChange={setSortMode}
          />
        ) : showTools ? (
          <CalendarPanel groups={calendarGroups} onOpenBooking={id => navigate(`/dashboard/bookings/${id}`)} />
        ) : (
          <section className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-5 text-center">
                <p className="font-semibold">No {filter} bookings</p>
                <p className="mt-1 text-sm text-muted-foreground">{getEmptyMessage(filter)}</p>
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
  const serviceName = appointment?.name || booking.appointmentName || 'Service';
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
            <span>{formatDate(booking.date)} · {formatTime(booking.time)} · {appointment?.duration ?? 0} mins</span>
            <span className={paid ? 'text-emerald-600' : 'text-blue-600'}>
              {paid ? 'Paid' : 'Pending'}
            </span>
          </span>
        </span>
      </div>
    </button>
  );
};

const HistoryTools = ({
  appointments,
  historyPreset,
  historyRange,
  serviceId,
  sortMode,
  onPresetChange,
  onRangeChange,
  onServiceChange,
  onSortChange,
}: {
  appointments: Appointment[];
  historyPreset: HistoryPreset;
  historyRange: { from: string; to: string };
  serviceId: string;
  sortMode: SortMode;
  onPresetChange: (preset: HistoryPreset) => void;
  onRangeChange: (range: { from: string; to: string }) => void;
  onServiceChange: (serviceId: string) => void;
  onSortChange: (sortMode: SortMode) => void;
}) => (
  <section className="space-y-4 rounded-2xl border bg-card p-4">
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Date</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['today', 'Today'],
          ['week', 'This Week'],
          ['month', 'This Month'],
          ['custom', 'Custom'],
        ] as Array<[HistoryPreset, string]>).map(([value, label]) => (
          <button
            key={value}
            className={cn(
              'h-10 rounded-xl border px-3 text-sm font-semibold',
              historyPreset === value ? 'bg-[#020c1a] text-white' : 'text-muted-foreground',
            )}
            onClick={() => onPresetChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {historyPreset === 'custom' && (
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <HistoryDateInput
            label="From"
            value={historyRange.from}
            onChange={from => onRangeChange(normalizeRange(from, historyRange.to))}
          />
          <HistoryDateInput
            label="To"
            value={historyRange.to}
            onChange={to => onRangeChange(normalizeRange(historyRange.from, to))}
          />
        </div>
      )}
    </div>

    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Service</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="All" active={serviceId === 'all'} onClick={() => onServiceChange('all')} />
        {appointments.map(appointment => (
          <FilterChip
            key={appointment.id}
            label={appointment.name || 'Service'}
            active={serviceId === appointment.id}
            onClick={() => onServiceChange(appointment.id)}
          />
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Sort</p>
      <div className="grid grid-cols-3 gap-2">
        <FilterChip label="Newest" active={sortMode === 'date_desc'} onClick={() => onSortChange('date_desc')} />
        <FilterChip label="Oldest" active={sortMode === 'date_asc'} onClick={() => onSortChange('date_asc')} />
        <FilterChip label="Service" active={sortMode === 'service'} onClick={() => onSortChange('service')} />
      </div>
    </div>
  </section>
);

const HistoryDateInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="space-y-1.5">
    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    <input
      type="date"
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
    />
  </label>
);

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    className={cn(
      'h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold',
      active ? 'bg-[#020c1a] text-white' : 'text-muted-foreground',
    )}
    onClick={onClick}
  >
    {label}
  </button>
);

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

const getInitialFilter = (value: string | null): BookingFilter => {
  if (value === 'upcoming' || value === 'history') return value;
  return 'today';
};

const getInitialSort = (value: string | null): SortMode => {
  if (value === 'date_asc' || value === 'service') return value;
  return 'date_desc';
};

const getInitialHistoryRange = (params: URLSearchParams) => {
  const fallback = getPresetRange('month');
  const from = params.get('from') || fallback.from;
  const to = params.get('to') || fallback.to;
  return normalizeRange(from, to);
};

const getPresetRange = (preset: HistoryPreset) => {
  const now = new Date();
  if (preset === 'today') {
    const today = format(now, 'yyyy-MM-dd');
    return { from: today, to: today };
  }
  if (preset === 'week') {
    return {
      from: format(startOfWeek(now), 'yyyy-MM-dd'),
      to: format(endOfWeek(now), 'yyyy-MM-dd'),
    };
  }
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
};

const normalizeRange = (from: string, to: string) => {
  if (!from || !to) return { from, to };
  return parseISO(from) <= parseISO(to) ? { from, to } : { from: to, to: from };
};

const getServiceName = (booking: BookingWithAppointment) =>
  booking.appointment?.name || booking.appointmentName || 'Service';

const getEmptyMessage = (filter: BookingFilter) => {
  if (filter === 'history') return 'No bookings match this history filter.';
  if (filter === 'today') return 'No clients have booked a service today.';
  return 'No upcoming bookings yet.';
};

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
