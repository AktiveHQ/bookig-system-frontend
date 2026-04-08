import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowRight, CalendarIcon } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type PublicBusiness = {
  name: string;
  description?: string;
  address?: string;
  headerImageUrl?: string;
};

type PublicService = {
  id: string;
  name: string;
  description?: string;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
};

type AvailabilitySlot = {
  time: string;
  available: boolean;
};

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://booking-system-backend-h7ho.onrender.com'
).replace(/\/$/, '');

const BusinessPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [businessRes, servicesRes] = await Promise.all([
          fetch(`${API_BASE}/public/businesses/${slug}`),
          fetch(`${API_BASE}/public/businesses/${slug}/services`),
        ]);

        if (!businessRes.ok || !servicesRes.ok) {
          throw new Error('Unable to load business info');
        }

        const businessJson = await businessRes.json();
        const servicesJson = await servicesRes.json();
        const serviceRows = Array.isArray(servicesJson) ? servicesJson : servicesJson?.items ?? [];

        if (!active) return;
        setBusiness({
          name: String(businessJson?.name ?? ''),
          description: businessJson?.description ? String(businessJson.description) : '',
          address: businessJson?.address ? String(businessJson.address) : '',
          headerImageUrl: businessJson?.headerImageUrl ? String(businessJson.headerImageUrl) : '',
        });
        setServices(
          serviceRows.map((row: any) => ({
            id: String(row?.id),
            name: String(row?.name ?? ''),
            description: row?.description ? String(row.description) : '',
            priceAmount: Number(row?.priceAmount ?? 0),
            currency: String(row?.currency ?? 'NGN'),
            durationMinutes: Number(row?.durationMinutes ?? 30),
          }))
        );
      } catch (error) {
        console.error('Failed to load public booking page', error);
        if (active) {
          setBusiness(null);
          setServices([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!selectedService || !selectedDate) {
      setSlots([]);
      return;
    }

    let active = true;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const loadAvailability = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/public/services/${selectedService.id}/availability?date=${dateStr}`
        );
        if (!response.ok) throw new Error('Failed to load availability');
        const json = await response.json();
        const rawSlots = Array.isArray(json?.slots) ? json.slots : [];
        const mapped = rawSlots.map((slot: any) => {
          if (typeof slot === 'string') {
            return { time: slot, available: true };
          }
          return {
            time: String(slot?.startTimeLocal ?? slot?.time ?? ''),
            available: Boolean(slot?.available ?? slot?.isAvailable ?? true),
          };
        });
        if (active) setSlots(mapped.filter((s: AvailabilitySlot) => s.time));
      } catch (error) {
        console.error('Failed to load availability', error);
        if (active) setSlots([]);
      }
    };

    void loadAvailability();
    return () => {
      active = false;
    };
  }, [selectedService, selectedDate]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleContinue = () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    navigate(`/booking/${slug}/confirm`, {
      state: {
        appointmentId: selectedService.id,
        appointmentName: selectedService.name,
        appointmentPrice: selectedService.priceAmount,
        appointmentCurrency: selectedService.currency || 'NGN',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
      },
    });
  };

  const isDateDisabled = (date: Date) => isBefore(date, startOfDay(new Date()));

  const hasData = useMemo(() => Boolean(business && services.length >= 0), [business, services]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
        <p className="text-muted-foreground">Loading booking page...</p>
      </div>
    );
  }

  if (!hasData || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-10 max-w-5xl mx-auto">
      <div className="flex items-start gap-4 mb-8 lg:mb-10">
        <div className="h-16 w-16 rounded-lg bg-accent shrink-0 overflow-hidden">
          {business.headerImageUrl && (
            <img src={business.headerImageUrl} alt={business.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="text-left">
          <h1 className="text-xl font-bold lg:text-2xl">{business.name}</h1>
          <p className="text-sm text-muted-foreground">{business.description}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4 lg:text-xl">Book an appointment</h2>

      <div className="space-y-3 lg:space-y-4">
        {services.map(service => (
          <div key={service.id}>
            <button
              onClick={() => {
                setSelectedService(selectedService?.id === service.id ? null : service);
                setSelectedDate(undefined);
                setSelectedTime(null);
                setSlots([]);
              }}
              className={cn(
                'w-full text-left border rounded-2xl p-4 lg:p-5 transition-colors',
                selectedService?.id === service.id ? 'border-foreground' : 'hover:bg-accent/50'
              )}
            >
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {service.currency || 'NGN'} {service.priceAmount.toLocaleString()} | {service.durationMinutes}mins
              </p>
              {service.description && (
                <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
              )}
            </button>

            {selectedService?.id === service.id && (
              <div className="mt-3 space-y-4 lg:space-y-5">
                <div className="border rounded-2xl p-4 lg:p-5 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Select date</span>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={d => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    disabled={isDateDisabled}
                    className="pointer-events-auto"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium mb-3">Available times</p>
                    {slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available slots for this day</p>
                    ) : (
                      <div className="flex gap-2 flex-wrap lg:gap-3">
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
                  <Button onClick={handleContinue} className="w-full sm:w-auto sm:min-w-44 h-12 rounded-full gap-2 mt-4">
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
