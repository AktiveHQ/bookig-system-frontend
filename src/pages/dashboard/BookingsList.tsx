import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ArrowLeft, CalendarDays, Search } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAID_BOOKING_STATUSES = ['confirmed', 'completed'];

const BookingsList = () => {
  const navigate = useNavigate();
  const {
    appointments,
    bookings,
    business,
    refreshBookingsForDate,
  } = useData();
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month' | 'range'>('day');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeStart, setRangeStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [serviceFilter, setServiceFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  // Calculate date range based on filter type
  const getDateRange = () => {
    const currentDate = parseISO(selectedDate);
    switch (filterType) {
      case 'day':
        return { start: selectedDate, end: selectedDate };
      case 'week': {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return {
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd'),
        };
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: format(monthStart, 'yyyy-MM-dd'),
          end: format(monthEnd, 'yyyy-MM-dd'),
        };
      }
      case 'range':
        return { start: rangeStart, end: rangeEnd };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const { start: dateRangeStart, end: dateRangeEnd } = getDateRange();

  useEffect(() => {
    if (!business?.slug || appointments.length === 0) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        // For day filter, just refresh that date. For other filters, refresh date range
        if (filterType === 'day') {
          await Promise.all(
            appointments.map(appointment =>
              refreshBookingsForDate(appointment.id, selectedDate),
            ),
          );
        } else {
          // For week/month/range, refresh all dates in the range
          const startDate = parseISO(dateRangeStart);
          const endDate = parseISO(dateRangeEnd);
          let currentDate = startDate;
          const datesToRefresh: string[] = [];
          
          while (currentDate <= endDate) {
            datesToRefresh.push(format(currentDate, 'yyyy-MM-dd'));
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
          }

          await Promise.all(
            appointments.flatMap(appointment =>
              datesToRefresh.map(date => refreshBookingsForDate(appointment.id, date)),
            ),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [appointments, business?.slug, refreshBookingsForDate, selectedDate, filterType, dateRangeStart, dateRangeEnd]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bookings
      .filter(booking => {
        const bookingDate = parseISO(booking.date);
        const rangeStartDate = parseISO(dateRangeStart);
        const rangeEndDate = parseISO(dateRangeEnd);
        return isWithinInterval(bookingDate, {
          start: rangeStartDate,
          end: new Date(rangeEndDate.getTime() + 24 * 60 * 60 * 1000 - 1), // Include end date
        });
      })
      .filter(booking => PAID_BOOKING_STATUSES.includes(booking.status))
      .filter(booking =>
        serviceFilter === 'all' ? true : booking.appointmentId === serviceFilter,
      )
      .filter(booking => {
        if (!normalizedQuery) return true;
        const serviceName = appointmentsById.get(booking.appointmentId)?.name ?? '';
        return [booking.clientName, booking.clientEmail, serviceName]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
      });
  }, [appointmentsById, bookings, query, dateRangeStart, dateRangeEnd, serviceFilter]);

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">{business?.name || 'Dashboard'}</p>
              <h1 className="text-2xl font-bold">Bookings</h1>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-full gap-2"
            onClick={() => navigate('/appointments/create')}
          >
            Add service
          </Button>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-[140px_180px_220px_minmax(0,1fr)]">
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Per Day</SelectItem>
              <SelectItem value="week">Per Week</SelectItem>
              <SelectItem value="month">Per Month</SelectItem>
              <SelectItem value="range">Date Range</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              className="h-11 rounded-xl pl-9"
            />
          </div>

          {filterType === 'range' && (
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={rangeEnd}
                onChange={event => setRangeEnd(event.target.value)}
                className="h-11 rounded-xl pl-9"
                placeholder="To"
              />
            </div>
          )}

          {filterType === 'range' && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search client, email, or service"
                className="h-11 rounded-xl pl-9"
              />
            </div>
          )}

          {filterType !== 'range' && (
            <>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {appointments.map(appointment => (
                    <SelectItem key={appointment.id} value={appointment.id}>
                      {appointment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search client, email, or service"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </>
          )}

          {filterType === 'range' && (
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {appointments.map(appointment => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {appointment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                {dateRangeStart === dateRangeEnd
                  ? `${format(parseISO(dateRangeStart), 'MMM d, yyyy')}`
                  : `${format(parseISO(dateRangeStart), 'MMM d')} - ${format(parseISO(dateRangeEnd), 'MMM d, yyyy')}`}
              </p>
            </div>
            {loading && <p className="text-xs text-muted-foreground">Refreshing...</p>}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                      No paid bookings found for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map(booking => {
                    const appointment = appointmentsById.get(booking.appointmentId);
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.clientName || '-'}</TableCell>
                        <TableCell>{appointment?.name || 'Service'}</TableCell>
                        <TableCell>{booking.date}</TableCell>
                        <TableCell>{formatTime(booking.time)}</TableCell>
                        <TableCell>{booking.clientEmail || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BookingsList;
