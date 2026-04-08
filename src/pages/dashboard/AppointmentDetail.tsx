import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import BackButton from '@/components/shared/BackButton';
import WelcomeBackNote from '@/components/shared/WelcomeBackNote';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO, isAfter } from 'date-fns';
import { Pencil, Trash2, Pause, Play } from 'lucide-react';

const AppointmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appointments, bookings, deleteAppointment, setAppointmentPaused, getBookingsForDate, refreshBookingsForDate } = useData();
  const appointment = appointments.find(a => a.id === id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const availabilityRef = useRef<HTMLDivElement>(null);

  const allBookings = bookings.filter(
    b => b.appointmentId === id && (b.status === 'pending_payment' || b.status === 'confirmed')
  );
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = getBookingsForDate(id!, dateStr);
  const sortedDayBookings = [...dayBookings].sort((a, b) => a.time.localeCompare(b.time));

  const isToday = isSameDay(selectedDate, new Date());

  const hasFutureBookings = allBookings.some(
    b => isAfter(parseISO(b.date), new Date()) || isSameDay(parseISO(b.date), new Date())
  );

  useEffect(() => {
    if (window.innerWidth < 768 && availabilityRef.current) {
      availabilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!id) return;
    void refreshBookingsForDate(id, dateStr);
  }, [id, dateStr, refreshBookingsForDate]);

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Appointment not found.</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (hasFutureBookings) {
      toast({
        title: 'Cannot delete',
        description: 'This appointment has active bookings. Wait until all booked days have passed.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteAppointment(appointment.id);
      toast({ title: 'Appointment deleted' });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePause = async () => {
    const nextPaused = !appointment.paused;
    try {
      await setAppointmentPaused(appointment.id, Boolean(nextPaused));
      toast({ title: nextPaused ? 'Appointment paused' : 'Appointment resumed' });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = () => {
    if (hasFutureBookings) {
      toast({
        title: 'Cannot edit',
        description: 'This appointment has active bookings. Wait until all booked days have passed.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Edit functionality', description: 'Edit form coming soon.' });
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const appointmentPrice = Number(appointment.price ?? 0);

  return (
    <div className="min-h-screen px-6 py-6 max-w-4xl mx-auto">
      <BackButton />
      <WelcomeBackNote />

      <div className="mt-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{appointment.name}</h1>
            <p className="text-sm text-muted-foreground">
              NGN {appointmentPrice.toLocaleString()} | {appointment.duration}mins
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-2xl p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={d => d && setSelectedDate(d)}
            className="pointer-events-auto"
          />
        </div>

        <div ref={availabilityRef} className="border rounded-2xl p-4">
          <h3 className="font-semibold mb-4">{isToday ? "Today's Availability" : "Day's Availability"}</h3>

          {sortedDayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client for {isToday ? 'today' : 'this day'}</p>
          ) : (
            <div className="space-y-2">
              {sortedDayBookings.map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl text-sm border">
                  <span className="font-medium">{booking.clientName}</span>
                  <span className="text-muted-foreground">{formatTime(booking.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6 flex-wrap">
        <Button variant="outline" className="gap-2 rounded-full" onClick={handleEdit} disabled={hasFutureBookings}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" className="gap-2 rounded-full" onClick={handlePause}>
          {appointment.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {appointment.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="destructive" className="gap-2 rounded-full" onClick={handleDelete} disabled={hasFutureBookings}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
      {hasFutureBookings && (
        <p className="text-xs text-muted-foreground mt-2">
          Edit and delete are disabled while there are active bookings on upcoming days.
        </p>
      )}
    </div>
  );
};

export default AppointmentDetail;
