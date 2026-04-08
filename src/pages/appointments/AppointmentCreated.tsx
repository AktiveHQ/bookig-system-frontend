import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AppointmentCreated = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appointments, business } = useData();
  const appointment = appointments.find(a => a.id === id);
  const isFirstAppointment = (location.state as any)?.isFirstAppointment;
  const businessLink = business ? `${window.location.origin}/booking/${business.slug}` : '';

  const copyLink = async () => {
    if (!businessLink) return;
    try {
      await navigator.clipboard.writeText(businessLink);
      toast({ title: 'Link copied!' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
      <CheckCircle className="h-16 w-16 text-green-600 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Appointment created</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {appointment?.name ? `"${appointment.name}" is ready to book.` : 'Your appointment is ready to book.'}
      </p>

      {businessLink && (
        <div className="w-full mb-6">
          <div
            className="flex items-center gap-2 bg-accent rounded-xl px-4 py-3 cursor-pointer hover:bg-accent/80"
            onClick={copyLink}
            role="button"
            tabIndex={0}
          >
            <span className="text-sm truncate flex-1 text-left font-mono">{businessLink}</span>
            <Copy className="h-4 w-4 shrink-0" />
          </div>
          {isFirstAppointment && (
            <p className="text-xs text-muted-foreground mt-2 text-left">
              This is your public booking link. Share it with clients.
            </p>
          )}
        </div>
      )}

      <div className="w-full space-y-3">
        <Button
          className="w-full h-12 rounded-full gap-2"
          onClick={() => navigate(`/booking/${business?.slug}`)}
          disabled={!business?.slug}
        >
          View booking page <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 rounded-full gap-2"
          onClick={() => navigate('/appointments/create')}
        >
          Create another appointment <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-full" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default AppointmentCreated;
