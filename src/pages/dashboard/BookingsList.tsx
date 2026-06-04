import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [serviceFilter, setServiceFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  useEffect(() => {
    if (!business?.slug || appointments.length === 0) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all(
          appointments.map(appointment =>
            refreshBookingsForDate(appointment.id, selectedDate),
          ),
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [appointments, business?.slug, refreshBookingsForDate, selectedDate]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bookings
      .filter(booking => booking.date === selectedDate)
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
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointmentsById, bookings, query, selectedDate, serviceFilter]);

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

        <section className="mt-5 grid gap-3 md:grid-cols-[180px_220px_minmax(0,1fr)]">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              className="h-11 rounded-xl pl-9"
            />
          </div>

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
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-medium">
              {filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'}
            </p>
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
