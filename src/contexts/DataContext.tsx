import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Business, Appointment, Booking } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface DataContextType {
  business: Business | null;
  setBusiness: (b: Business) => Promise<boolean>;
  appointments: Appointment[];
  addAppointment: (a: Appointment) => void;
  updateAppointment: (a: Appointment) => void;
  deleteAppointment: (id: string) => void;
  bookings: Booking[];
  addBooking: (b: Booking) => void;
  getBookingsForAppointment: (appointmentId: string) => Booking[];
  getBookingsForDate: (appointmentId: string, date: string) => Booking[];
  hasSetupComplete: boolean;
  setHasSetupComplete: (v: boolean) => void;
  businessLinkCreated: boolean;
  setBusinessLinkCreated: (v: boolean) => void;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const useData = () => useContext(DataContext);

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://booking-system-backend-h7ho.onrender.com'
).replace(/\/$/, '');

const toBusiness = (raw: any): Business => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? ''),
  description: String(raw?.description ?? ''),
  country: String(raw?.country ?? ''),
  city: String(raw?.city ?? ''),
  address: String(raw?.address ?? ''),
  email: String(raw?.contactEmail ?? raw?.email ?? ''),
  phone: raw?.contactPhone ? String(raw.contactPhone) : raw?.phone ? String(raw.phone) : undefined,
  bookingPageImage: raw?.headerImageUrl ? String(raw.headerImageUrl) : raw?.bookingPageImage ? String(raw.bookingPageImage) : undefined,
  feeHandling:
    raw?.feePolicy === 'OWNER_PAYS' || raw?.feeHandling === 'business' ? 'business' : 'customer',
  accountHolderName: String(raw?.accountHolderName ?? ''),
  bankName: String(raw?.bankName ?? ''),
  accountNumber: String(raw?.accountNumber ?? ''),
  slug: String(raw?.slug ?? ''),
});

const toAppointment = (raw: any, fallbackBusinessId = ''): Appointment => ({
  id: String(raw?.id ?? crypto.randomUUID()),
  businessId: String(raw?.businessId ?? raw?.business?.id ?? fallbackBusinessId),
  name: String(raw?.name ?? ''),
  description: String(raw?.description ?? ''),
  price: Number(raw?.priceAmount ?? raw?.price ?? 0),
  currency: String(raw?.currency ?? 'NGN'),
  availableDays: Array.isArray(raw?.availableDays) ? raw.availableDays.map(Number) : [1, 2, 3, 4, 5],
  startTime: String(raw?.startTimeLocal ?? raw?.startTime ?? '09:00'),
  endTime: String(raw?.endTimeLocal ?? raw?.endTime ?? '17:00'),
  duration: Number(raw?.durationMinutes ?? raw?.duration ?? 30),
  maxBookingsPerSlot: Number(raw?.maxBookingsPerSlot ?? 1),
  messageForClients: raw?.messageForClients ? String(raw.messageForClients) : undefined,
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  paused: typeof raw?.paused === 'boolean' ? raw.paused : raw?.isActive === false,
});

const toBooking = (raw: any, appointmentId = '', businessSlug = ''): Booking => ({
  id: String(raw?.id ?? raw?.bookingId ?? crypto.randomUUID()),
  appointmentId: String(raw?.serviceId ?? raw?.appointmentId ?? appointmentId),
  businessSlug: String(raw?.businessSlug ?? businessSlug),
  clientName: String(raw?.clientName ?? ''),
  clientEmail: String(raw?.clientEmail ?? ''),
  date: String(raw?.date ?? ''),
  time: String(raw?.startTimeLocal ?? raw?.time ?? ''),
  status: String(raw?.status ?? 'confirmed').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed',
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
});

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(path: string, init?: RequestInit, authenticated = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (authenticated) {
    const authHeader = await getAuthHeader();
    Object.assign(headers, authHeader);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await response.text();
    throw new Error(
      `Expected JSON from ${path} but got "${contentType}". Check VITE_API_BASE_URL. Body starts with: ${body.slice(0, 80)}`
    );
  }
  return response.json();
}

const toFeePolicy = (feeHandling: Business['feeHandling']) =>
  feeHandling === 'business' ? 'OWNER_PAYS' : 'CLIENT_PAYS';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [business, setBusinessState] = useState<Business | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasSetupComplete, setHasSetupComplete] = useState<boolean>(false);
  const [businessLinkCreated, setBusinessLinkCreated] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setBusinessState(null);
        setAppointments([]);
        setBookings([]);
        setHasSetupComplete(false);
        setBusinessLinkCreated(false);
        return;
      }

      try {
        const meBusinessRaw = await apiFetch('/dashboard/businesses/me');
        const mappedBusiness = toBusiness(meBusinessRaw);
        setBusinessState(mappedBusiness);
        setHasSetupComplete(Boolean(mappedBusiness.id || mappedBusiness.slug));

        const servicesRaw = await apiFetch('/dashboard/services');
        const serviceList = Array.isArray(servicesRaw) ? servicesRaw : servicesRaw?.items ?? [];
        const mappedAppointments = serviceList.map((s: any) => toAppointment(s, mappedBusiness.id));
        setAppointments(mappedAppointments);
        setBusinessLinkCreated(mappedAppointments.length > 0);

        const today = new Date().toISOString().slice(0, 10);
        const bookingsByService = await Promise.all(
          mappedAppointments.map(async apt => {
            try {
              const result = await apiFetch(`/dashboard/services/${apt.id}/bookings?date=${today}`);
              const rows = Array.isArray(result) ? result : result?.items ?? [];
              return rows.map((b: any) => toBooking(b, apt.id, mappedBusiness.slug));
            } catch {
              return [] as Booking[];
            }
          })
        );
        setBookings(bookingsByService.flat());
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      }
    });

    return unsubscribe;
  }, []);

  const setBusiness = async (b: Business): Promise<boolean> => {
    setBusinessState(b);
    setHasSetupComplete(true);

    const createPayload = {
      name: b.name,
      description: b.description,
      contactEmail: b.email,
      feePolicy: toFeePolicy(b.feeHandling),
    };

    const updatePayload = {
      city: b.city,
      address: b.address,
      contactEmail: b.email,
      contactPhone: b.phone,
      headerImageUrl: b.bookingPageImage,
      feePolicy: toFeePolicy(b.feeHandling),
    };

    try {
      if (business?.id) {
        console.log('[BusinessUpdate] PATCH /dashboard/businesses/me payload:', updatePayload);
        await apiFetch('/dashboard/businesses/me', {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        });
      } else {
        console.log('[BusinessSetup] POST /dashboard/businesses payload:', createPayload);
        const created = await apiFetch('/dashboard/businesses', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });

        if (created) {
          setBusinessState(prev => ({ ...(prev || b), ...toBusiness(created) }));
        }

        console.log('[BusinessSetup] PATCH /dashboard/businesses/me payload:', updatePayload);
        await apiFetch('/dashboard/businesses/me', {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to persist business profile', error);
      return false;
    }
  };

  const addAppointment = (a: Appointment) => {
    setAppointments(prev => [...prev, a]);
    setBusinessLinkCreated(true);

    const payload = {
      name: a.name,
      description: a.description,
      priceAmount: a.price,
      currency: a.currency || 'NGN',
      durationMinutes: a.duration,
    };

    void (async () => {
      try {
        const created = await apiFetch('/dashboard/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (created) {
          const mapped = toAppointment(created, a.businessId);
          setAppointments(prev => prev.map(p => (p.id === a.id ? { ...mapped, businessId: a.businessId || mapped.businessId } : p)));
        }
      } catch (error) {
        console.error('Failed to create appointment in backend', error);
      }
    })();
  };

  const updateAppointment = (a: Appointment) => {
    setAppointments(prev => prev.map(p => (p.id === a.id ? a : p)));

    const payload = {
      name: a.name,
      description: a.description,
      priceAmount: a.price,
      currency: a.currency || 'NGN',
      durationMinutes: a.duration,
    };

    void (async () => {
      try {
        await apiFetch(`/dashboard/services/${a.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error('Failed to update appointment in backend', error);
      }
    })();
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(p => p.id !== id));
    setBookings(prev => prev.filter(b => b.appointmentId !== id));

    void (async () => {
      try {
        await apiFetch(`/dashboard/services/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Failed to delete appointment in backend', error);
      }
    })();
  };

  const addBooking = (b: Booking) => {
    setBookings(prev => [...prev, b]);

    void (async () => {
      try {
        const created = await apiFetch(
          '/public/bookings',
          {
            method: 'POST',
            body: JSON.stringify({
              serviceId: Number(b.appointmentId),
              clientName: b.clientName,
              clientEmail: b.clientEmail,
              date: b.date,
              startTimeLocal: b.time,
            }),
          },
          false
        );

        if (created?.bookingId) {
          setBookings(prev =>
            prev.map(row =>
              row.id === b.id
                ? {
                    ...row,
                    id: String(created.bookingId),
                    status: 'confirmed',
                  }
                : row
            )
          );
        }
      } catch (error) {
        console.error('Failed to create booking in backend', error);
      }
    })();
  };

  const getBookingsForAppointment = (appointmentId: string) =>
    bookings.filter(b => b.appointmentId === appointmentId);

  const getBookingsForDate = (appointmentId: string, date: string) =>
    bookings.filter(
      b =>
        b.appointmentId === appointmentId &&
        b.date === date &&
        (b.status === 'confirmed' || b.status === 'completed')
    );

  const value = useMemo(
    () => ({
      business,
      setBusiness,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      bookings,
      addBooking,
      getBookingsForAppointment,
      getBookingsForDate,
      hasSetupComplete,
      setHasSetupComplete,
      businessLinkCreated,
      setBusinessLinkCreated,
    }),
    [business, appointments, bookings, hasSetupComplete, businessLinkCreated]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
