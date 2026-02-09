import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, ArrowRight, Copy, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { appointments, bookings, business } = useData();
  const { logout } = useAuth();
  const bookingLink =
    business?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${business.slug}`
      : '';

  const getAppointmentBookingCount = (id: string) =>
    bookings.filter(b => b.appointmentId === id && b.status === 'confirmed').length;

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

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-2xl mx-auto">
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
                        ₦{apt.price.toLocaleString()} | {apt.duration}mins
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
};

export default Dashboard;
