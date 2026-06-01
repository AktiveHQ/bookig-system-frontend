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
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const getOrCreateSessionId = () => {
  const key = 'akhq:bookingSessionId';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

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
          `${API_BASE}/public/services/${selectedService.id}/availability?date=${dateStr}`,
          {
            headers: {
              'X-Session-ID': getOrCreateSessionId(),
            },
          }
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
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[#EFEFEF]">
        <p className="text-muted-foreground">Loading booking page...</p>
      </div>
    );
  }

  if (!hasData || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[#EFEFEF]">
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFEFEF] px-6 py-16 sm:px-10 lg:px-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7">
          <div className="h-24 w-32 overflow-hidden rounded-sm bg-background">
          {business.headerImageUrl && (
            <img src={business.headerImageUrl} alt={business.name} className="h-full w-full object-cover" />
          )}
          </div>
          <div className="mt-7 text-left">
            <h1 className="text-lg font-bold text-foreground">{business.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{business.address}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-base font-medium text-foreground">Book an appointment</h2>
        </div>

      <div className="space-y-3">
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
                'w-full rounded-xl border border-border bg-background p-4 text-left transition-colors shadow-[1px_2px_2px_rgba(0,0,0,0.25)]',
                selectedService?.id === service.id ? 'border-foreground' : 'hover:bg-white/80'
              )}
            >
              <h3 className="text-sm font-medium text-foreground">{service.name}</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {service.currency || 'NGN'} {service.priceAmount.toLocaleString()} <span className="mx-2">|</span> {service.durationMinutes}mins
              </p>
              {service.description && (
                <p className="mt-3 line-clamp-3 text-xs leading-snug text-muted-foreground">{service.description}</p>
              )}
            </button>

            {selectedService?.id === service.id && (
              <div className="mt-3 space-y-4 lg:space-y-5">
                <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 shadow-[1px_2px_2px_rgba(0,0,0,0.25)]">
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
    </div>
  );
};

export default BusinessPage;
