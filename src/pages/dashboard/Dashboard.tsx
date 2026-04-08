import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';
import { Plus, LogOut, ArrowRight, Copy, Link, Trash2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isAfter, isSameDay, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { appointments, bookings, business, deleteAppointment, notifications, dismissNotification } = useData();
  const { logout } = useAuth();
  const bookingLink =
    business?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${business.slug}`
      : '';
  const today = format(new Date(), 'yyyy-MM-dd');

  const getAppointmentBookingCount = (id: string) =>
    bookings.filter(b => b.appointmentId === id && b.status === 'confirmed').length;

  const getTodayBookingCount = (id: string) =>
    bookings.filter(b => b.appointmentId === id && b.status === 'confirmed' && b.date === today).length;

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
      b =>
        b.appointmentId === appointmentId &&
        b.status === 'confirmed' &&
        (isAfter(parseISO(b.date), new Date()) || isSameDay(parseISO(b.date), new Date()))
    );

    if (hasFutureBookings) {
      toast({
        title: 'Cannot delete',
        description: 'This appointment has active bookings today/upcoming.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteAppointment(appointmentId);
      toast({ title: 'Appointment deleted' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const activeNotification = notifications?.[0];
  const notificationTone = (type: string) => {
    if (type === 'success') return 'border-green-600/30 bg-green-600/10';
    if (type === 'warning') return 'border-yellow-600/30 bg-yellow-600/10';
    if (type === 'error') return 'border-red-600/30 bg-red-600/10';
    return 'border-muted bg-accent/30';
  };

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-2xl mx-auto">
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Appointments</h1>
            <p className="text-sm text-muted-foreground">Manage your services and availability</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-accent" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link className="h-4 w-4 text-muted-foreground" />
                Shareable booking link
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyLink}
                disabled={!bookingLink}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            {bookingLink ? (
              <p className="mt-2 text-sm text-muted-foreground break-all">{bookingLink}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Set up your business profile to generate a booking link.
              </p>
            )}
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(business ? '/business/edit' : '/setup')}
              >
                {business ? 'Edit business profile' : 'Complete setup'}
              </Button>
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-6">You haven't created any appointments yet.</p>
            <Button onClick={() => navigate('/appointments/create')} className="h-12 rounded-full gap-2 px-8">
              Create Appointment <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="space-y-3">
              {appointments.map(apt => {
                const count = getAppointmentBookingCount(apt.id);
                const appointmentPrice = Number(apt.price ?? 0);
                return (
                  <button
                    key={apt.id}
                    onClick={() => navigate(`/dashboard/appointment/${apt.id}`)}
                    className="w-full text-left border rounded-2xl p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{apt.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          NGN {appointmentPrice.toLocaleString()} | {apt.duration}mins
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-foreground text-background">{apt.name}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full border">Bookings</span>
                      <span className="text-xs px-2.5 py-1 rounded-full border">Today</span>
                      <span className="text-xs px-2.5 py-1 rounded-full border">{count} Booked</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {appointments.length > 0 && (
          <button
            onClick={() => navigate('/appointments/create')}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
            aria-label="Create appointment"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    );
  }

  const activeAppointments = appointments.filter(a => !a.paused).length;
  const totalConfirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:px-6 lg:px-10 max-w-7xl mx-auto">
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

      <WelcomeBackNote />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage services, bookings, and links in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/appointments/create')} className="h-10 rounded-full gap-2 hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            New
          </Button>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-accent" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total services</p>
          <p className="text-2xl font-semibold mt-1">{appointments.length}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Active services</p>
          <p className="text-2xl font-semibold mt-1">{activeAppointments}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Confirmed bookings</p>
          <p className="text-2xl font-semibold mt-1">{totalConfirmedBookings}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Bookings today</p>
          <p className="text-2xl font-semibold mt-1">
            {bookings.filter(b => b.status === 'confirmed' && b.date === today).length}
          </p>
        </div>
      </div>

      <div className="mb-6 border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link className="h-4 w-4 text-muted-foreground" />
            Shareable booking link
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyLink} disabled={!bookingLink}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
        {bookingLink ? (
          <p className="mt-2 text-sm text-muted-foreground break-all">{bookingLink}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your business profile to generate a booking link.
          </p>
        )}
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => navigate(business ? '/business/edit' : '/setup')}>
            {business ? 'Edit business profile' : 'Complete setup'}
          </Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground mb-6">You haven't created any appointments yet.</p>
          <Button onClick={() => navigate('/appointments/create')} className="h-12 rounded-full gap-2 px-8">
            Create Appointment <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex-1">
          <div className="border rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map(apt => {
                  const count = getAppointmentBookingCount(apt.id);
                  const todayCount = getTodayBookingCount(apt.id);
                  const appointmentPrice = Number(apt.price ?? 0);
                  const daySummary = apt.availableDays.map(d => DAYS[d]).join(', ');
                  return (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{apt.name}</TableCell>
                      <TableCell>NGN {appointmentPrice.toLocaleString()}</TableCell>
                      <TableCell>{apt.duration} mins</TableCell>
                      <TableCell className="max-w-52 truncate" title={`${daySummary} | ${apt.startTime}-${apt.endTime}`}>
                        {daySummary} | {apt.startTime}-{apt.endTime}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${apt.paused ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background'}`}>
                          {apt.paused ? 'Paused' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>{todayCount}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full"
                            onClick={() => navigate(`/dashboard/appointment/${apt.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 rounded-full gap-1"
                            onClick={() => handleDeleteAppointment(apt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
