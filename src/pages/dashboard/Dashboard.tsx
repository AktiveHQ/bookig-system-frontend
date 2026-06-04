import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Copy,
  Link,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { differenceInMinutes, format, isAfter, isSameDay, parseISO } from 'date-fns';

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'confirmed', 'completed'];

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    appointments,
    bookings,
    business,
    deleteAppointment,
    notifications,
    dismissNotification,
  } = useData();
  const { logout } = useAuth();

  const today = format(new Date(), 'yyyy-MM-dd');
  const bookingLink =
    business?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${business.slug}`
      : '';

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const todayBookings = useMemo(
    () =>
      bookings
        .filter(
          booking =>
            booking.date === today &&
            ACTIVE_BOOKING_STATUSES.includes(booking.status),
        )
        .map(booking => ({
          ...booking,
          appointment: appointmentsById.get(booking.appointmentId),
        }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointmentsById, bookings, today],
  );

  const nextBooking = useMemo(() => {
    const now = new Date();
    return (
      todayBookings.find(booking => {
        const start = parseBookingStart(booking.date, booking.time);
        return start ? start.getTime() >= now.getTime() : false;
      }) ?? todayBookings[0] ?? null
    );
  }, [todayBookings]);

  const remainingTodayBookings = nextBooking
    ? todayBookings.filter(booking => booking.id !== nextBooking.id)
    : todayBookings;

  const totalBookings = bookings.filter(booking =>
    ACTIVE_BOOKING_STATUSES.includes(booking.status),
  ).length;
  const activeServices = appointments.filter(appointment => !appointment.paused).length;
  const activeNotification = notifications?.[0];

  const notificationTone = (type: string) => {
    if (type === 'success') return 'border-green-600/30 bg-green-600/10';
    if (type === 'warning') return 'border-yellow-600/30 bg-yellow-600/10';
    if (type === 'error') return 'border-red-600/30 bg-red-600/10';
    return 'border-muted bg-accent/30';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCopyLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast({ title: 'Link copied', description: 'Share your booking link with clients.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const hasFutureBookings = bookings.some(
      booking =>
        booking.appointmentId === appointmentId &&
        ['pending_payment', 'confirmed'].includes(booking.status) &&
        (isAfter(parseISO(booking.date), new Date()) ||
          isSameDay(parseISO(booking.date), new Date())),
    );

    if (hasFutureBookings) {
      toast({
        title: 'Cannot delete',
        description: 'This service has active bookings today/upcoming.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteAppointment(appointmentId);
      toast({ title: 'Service deleted' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="border-b pb-5">
        <p className="text-xs text-muted-foreground">Business</p>
        <h2 className="mt-1 text-lg font-semibold">{business?.name || 'Your business'}</h2>
        {business?.email && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{business.email}</p>
        )}
      </div>

      <nav className="mt-6 space-y-1">
        <MenuButton icon={<CalendarDays className="h-4 w-4" />} label="Bookings" onClick={() => navigate('/dashboard')} />
        <MenuButton icon={<BriefcaseBusiness className="h-4 w-4" />} label="Services" onClick={() => navigate('/appointments/create')} />
        <MenuButton icon={<Settings className="h-4 w-4" />} label="Business settings" onClick={() => navigate('/business/edit')} />
      </nav>

      <div className="mt-auto pt-6">
        <Button variant="outline" className="w-full justify-start gap-2 rounded-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-background px-5 py-6 lg:block">
        {navContent}
      </aside>

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {activeNotification && (
          <div className={`mb-4 border rounded-2xl p-4 ${notificationTone(activeNotification.type)}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm">{activeNotification.message}</p>
              <button
                aria-label="Close notification"
                className="p-1 rounded-full hover:bg-accent"
                onClick={() => dismissNotification(activeNotification.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h1 className="text-2xl font-bold">Overview</h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="rounded-full border p-2 hover:bg-accent lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 h-[calc(100%-3rem)]">{navContent}</div>
            </SheetContent>
          </Sheet>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Services" value={appointments.length} />
          <Metric label="Active" value={activeServices} />
          <Metric label="Total bookings" value={totalBookings} />
          <Metric label="Today" value={todayBookings.length} />
        </section>

        <section className="mt-5 rounded-2xl border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Today's bookings</h2>
              <p className="text-sm text-muted-foreground">Your operational view for the day.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={handleCopyLink} disabled={!bookingLink}>
              <Copy className="h-4 w-4" />
              Share
            </Button>
          </div>

          {todayBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-5 text-center">
              <p className="font-medium">No bookings today</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your booking link so clients can reserve a time.
              </p>
              <Button
                variant="outline"
                className="mt-4 h-11 rounded-full gap-2"
                onClick={handleCopyLink}
                disabled={!bookingLink}
              >
                <Link className="h-4 w-4" />
                Share booking link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {nextBooking && (
                <BookingCard booking={nextBooking} highlight />
              )}
              {remainingTodayBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Services</h2>
              <p className="text-sm text-muted-foreground">Manage what clients can book.</p>
            </div>
            <Button onClick={() => navigate('/appointments/create')} className="h-10 rounded-full gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl border p-5 text-center">
              <p className="text-sm text-muted-foreground">You have not created any services yet.</p>
              <Button onClick={() => navigate('/appointments/create')} className="mt-4 h-11 rounded-full gap-2">
                Create service <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(appointment => {
                const bookingCount = bookings.filter(
                  booking =>
                    booking.appointmentId === appointment.id &&
                    ACTIVE_BOOKING_STATUSES.includes(booking.status),
                ).length;
                return (
                  <div key={appointment.id} className="rounded-2xl border p-4">
                    <button
                      className="w-full text-left"
                      onClick={() => navigate(`/dashboard/appointment/${appointment.id}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{appointment.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            NGN {Number(appointment.price ?? 0).toLocaleString()} | {appointment.duration}mins
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-foreground px-2.5 py-1 text-xs text-background">
                        {appointment.paused ? 'Paused' : 'Active'}
                      </span>
                      <span className="rounded-full border px-2.5 py-1 text-xs">
                        {bookingCount} bookings
                      </span>
                      <button
                        className="rounded-full border px-2.5 py-1 text-xs text-destructive"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

type BookingWithAppointment = {
  id: string;
  clientName: string;
  appointment?: { name: string; duration: number };
  date: string;
  time: string;
};

const MenuButton = ({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

const BookingCard = ({
  booking,
  highlight = false,
}: {
  booking: BookingWithAppointment;
  highlight?: boolean;
}) => (
  <div className={`rounded-2xl border p-4 ${highlight ? 'bg-accent/40' : ''}`}>
    {highlight && <p className="mb-2 text-xs font-medium text-muted-foreground">Next upcoming</p>}
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-semibold">{booking.clientName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.appointment?.name || 'Service'} | {booking.appointment?.duration ?? 0}mins
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatTime(booking.time)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{getRelativeStart(booking.date, booking.time)}</p>
      </div>
    </div>
  </div>
);

const parseBookingStart = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRelativeStart = (date: string, time: string) => {
  const start = parseBookingStart(date, time);
  if (!start) return '';
  const minutes = differenceInMinutes(start, new Date());
  if (minutes > 60) return `in ${Math.round(minutes / 60)} hrs`;
  if (minutes > 0) return `in ${minutes} mins`;
  if (minutes > -60) return `${Math.abs(minutes)} mins ago`;
  return 'passed';
};

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default Dashboard;
