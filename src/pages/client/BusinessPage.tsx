import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowRight, CalendarIcon } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

const BusinessPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { business, appointments, getBookingsForDate } = useData();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  if (!business || business.slug !== slug) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  const businessAppointments = appointments.filter(a => a.businessId === business.id && !a.paused);

  const generateSlots = (apt: Appointment, date: Date) => {
    const dayOfWeek = date.getDay();
    if (!apt.availableDays.includes(dayOfWeek)) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = getBookingsForDate(apt.id, dateStr);

    const slots: { time: string; available: boolean }[] = [];
    const [startH, startM] = apt.startTime.split(':').map(Number);
    const [endH, endM] = apt.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + apt.duration <= endMinutes; m += apt.duration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const isBooked = dayBookings.some(b => b.time === timeStr);
      slots.push({ time: timeStr, available: !isBooked });
    }
    return slots;
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const slots = selectedAppointment && selectedDate
    ? generateSlots(selectedAppointment, selectedDate)
    : [];

  const handleContinue = () => {
    if (!selectedAppointment || !selectedDate || !selectedTime) return;
    navigate(`/booking/${slug}/confirm`, {
      state: {
        appointmentId: selectedAppointment.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
      },
    });
  };

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    if (!selectedAppointment) return false;
    return !selectedAppointment.availableDays.includes(date.getDay());
  };

  return (
    <div className="min-h-screen px-6 py-6 max-w-lg mx-auto">
      {/* Business Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="h-16 w-16 rounded-lg bg-accent shrink-0 overflow-hidden">
          {business.bookingPageImage && (
            <img src={business.bookingPageImage} alt={business.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="text-left">
          <h1 className="text-lg font-bold">{business.name}</h1>
          <p className="text-sm text-muted-foreground">{business.description}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Book an appointment</h2>

      {/* Appointment List */}
      <div className="space-y-3">
        {businessAppointments.map(apt => (
          <div key={apt.id}>
            <button
              onClick={() => {
                setSelectedAppointment(selectedAppointment?.id === apt.id ? null : apt);
                setSelectedDate(undefined);
                setSelectedTime(null);
              }}
              className={cn(
                'w-full text-left border rounded-2xl p-4 transition-colors',
                selectedAppointment?.id === apt.id ? 'border-foreground' : 'hover:bg-accent/50'
              )}
            >
              <h3 className="font-semibold">{apt.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                ₦{apt.price.toLocaleString()} | {apt.duration}mins
              </p>
              {apt.description && (
                <p className="text-sm text-muted-foreground mt-2">{apt.description}</p>
              )}
            </button>

            {/* Date picker (revealed on selection) */}
            {selectedAppointment?.id === apt.id && (
              <div className="mt-3 space-y-4">
                <div className="border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Select date</span>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                    disabled={isDateDisabled}
                    className="pointer-events-auto"
                  />
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium mb-3">Available times</p>
                    {slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">There are no bookings for this day</p>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {slots.map(slot => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={cn(
                              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                              !slot.available && 'opacity-30 cursor-not-allowed bg-accent',
                              slot.available && selectedTime === slot.time && 'bg-foreground text-background',
                              slot.available && selectedTime !== slot.time && 'border hover:bg-accent'
                            )}
                          >
                            {formatTime(slot.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedTime && (
                  <Button onClick={handleContinue} className="w-full h-12 rounded-full gap-2 mt-4">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessPage;
