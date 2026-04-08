import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Business, Appointment, Booking, Notification } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface DataContextType {
  business: Business | null;
  setBusiness: (b: Business) => Promise<boolean>;
  notifications: Notification[];
  dismissNotification: (id: number) => Promise<void>;
  appointments: Appointment[];
  addAppointment: (a: Appointment) => void;
  updateAppointment: (a: Appointment) => void;
  deleteAppointment: (id: string) => Promise<void>;
  setAppointmentPaused: (id: string, paused: boolean) => Promise<void>;
  refreshBookingsForDate: (appointmentId: string, date: string) => Promise<void>;
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
  headerImageUrl: raw?.headerImageUrl ? String(raw.headerImageUrl) : raw?.bookingPageImage ? String(raw.bookingPageImage) : undefined,
  idVerificationType: raw?.idVerificationType ? String(raw.idVerificationType) as any : null,
  idDocumentData: raw?.idDocumentData ? String(raw.idDocumentData) : null,
  cacDocumentData: raw?.cacDocumentData ? String(raw.cacDocumentData) : null,
  verificationStatus: raw?.verificationStatus ? String(raw.verificationStatus) as any : null,
  verificationComment: raw?.verificationComment ? String(raw.verificationComment) : null,
  feeHandling:
    raw?.feePolicy === 'OWNER_PAYS' || raw?.feeHandling === 'business' ? 'business' : 'customer',
  accountHolderName: String(raw?.accountHolderName ?? ''),
  bankName: String(raw?.bankName ?? ''),
  accountNumber: String(raw?.accountNumber ?? ''),
  slug: String(raw?.bookingSlug ?? raw?.slug ?? ''),
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
  paused:
    typeof raw?.paused === 'boolean'
      ? raw.paused
      : String(raw?.status ?? '').toUpperCase() === 'INACTIVE' || raw?.isActive === false,
});

const toBooking = (raw: any, appointmentId = '', businessSlug = ''): Booking => ({
  id: String(raw?.id ?? raw?.bookingId ?? crypto.randomUUID()),
  appointmentId: String(raw?.serviceId ?? raw?.appointmentId ?? appointmentId),
  businessSlug: String(raw?.businessSlug ?? businessSlug),
  clientName: String(raw?.clientName ?? ''),
  clientEmail: String(raw?.clientEmail ?? ''),
  date: (() => {
    const startAt = raw?.startAt ? new Date(String(raw.startAt)) : null;
    if (startAt && !Number.isNaN(startAt.getTime())) {
      return startAt.toISOString().slice(0, 10);
    }
    return String(raw?.date ?? '');
  })(),
  time: (() => {
    const startAt = raw?.startAt ? new Date(String(raw.startAt)) : null;
    if (startAt && !Number.isNaN(startAt.getTime())) {
      const hh = startAt.getUTCHours().toString().padStart(2, '0');
      const mm = startAt.getUTCMinutes().toString().padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return String(raw?.startTimeLocal ?? raw?.time ?? '');
  })(),
  status: (() => {
    const s = String(raw?.status ?? '').toUpperCase();
    if (s === 'PENDING_PAYMENT') return 'pending_payment';
    if (s === 'CONFIRMED') return 'confirmed';
    if (s === 'CANCELLED') return 'cancelled';
    if (s === 'EXPIRED') return 'expired';
    const legacy = String(raw?.status ?? 'confirmed').toLowerCase();
    if (legacy === 'cancelled') return 'cancelled';
    return 'confirmed';
  })(),
  createdAt: String(raw?.createdAt ?? raw?.startAt ?? new Date().toISOString()),
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
    const contentType = response.headers.get('content-type') || '';
    let bodySnippet = '';
    try {
      const text = await response.text();
      bodySnippet = text ? text.slice(0, 1200) : '';
    } catch {
      // ignore
    }
    throw new Error(
      `API ${response.status}: ${path}${bodySnippet ? `\n${contentType || 'text/plain'}\n${bodySnippet}` : ''}`,
    );
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

const getClientTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const toFeePolicy = (feeHandling: Business['feeHandling']) =>
  feeHandling === 'business' ? 'OWNER_PAYS' : 'CLIENT_PAYS';

const isNotFoundError = (error: unknown) =>
  error instanceof Error && error.message.startsWith('API 404:');

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [business, setBusinessState] = useState<Business | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasSetupComplete, setHasSetupComplete] = useState<boolean>(false);
  const [businessLinkCreated, setBusinessLinkCreated] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setBusinessState(null);
        setNotifications([]);
        setAppointments([]);
        setBookings([]);
        setHasSetupComplete(false);
        setBusinessLinkCreated(false);
        return;
      }

      try {
        let mappedBusiness: Business | null = null;
        try {
          const meBusinessRaw = await apiFetch('/dashboard/businesses/me');
          mappedBusiness = toBusiness(meBusinessRaw);
          setBusinessState(mappedBusiness);
          setHasSetupComplete(Boolean(mappedBusiness.id || mappedBusiness.slug));
        } catch (error) {
          if (isNotFoundError(error)) {
            setBusinessState(null);
            setHasSetupComplete(false);
            setAppointments([]);
            setBookings([]);
            setBusinessLinkCreated(false);
          } else {
            throw error;
          }
        }

        if (!mappedBusiness) {
          return;
        }

        const servicesRaw = await apiFetch('/dashboard/services');
        const serviceList = Array.isArray(servicesRaw) ? servicesRaw : servicesRaw?.items ?? [];
        const mappedAppointments = serviceList.map((s: any) => toAppointment(s, mappedBusiness.id));
        setAppointments(mappedAppointments);
        setBusinessLinkCreated(mappedAppointments.length > 0);

        // Hydrate saved availability rules so owner dashboard reflects actual hours/days.
        try {
          const availabilityByServiceId = await Promise.all(
            mappedAppointments.map(async (apt) => {
              try {
                const result = await apiFetch(`/dashboard/services/${apt.id}/availability`);
                const rules = Array.isArray(result?.rules) ? result.rules : [];
                const first = rules[0];
                if (!first) return null;
                return {
                  id: apt.id,
                  availableDays: Array.isArray(first.daysOfWeek)
                    ? first.daysOfWeek.map(Number)
                    : apt.availableDays,
                  startTime: typeof first.startTimeLocal === 'string' ? first.startTimeLocal : apt.startTime,
                  endTime: typeof first.endTimeLocal === 'string' ? first.endTimeLocal : apt.endTime,
                };
              } catch {
                return null;
              }
            })
          );

          const byId = new Map(
            availabilityByServiceId.filter(Boolean).map((row: any) => [row.id, row])
          );
          if (byId.size > 0) {
            setAppointments(prev =>
              prev.map(apt => {
                const update = byId.get(apt.id);
                if (!update) return apt;
                return {
                  ...apt,
                  availableDays: update.availableDays,
                  startTime: update.startTime,
                  endTime: update.endTime,
                };
              })
            );
          }
        } catch {
          // ignore
        }

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

        try {
          const notifRaw = await apiFetch('/dashboard/notifications');
          const notifRows = Array.isArray(notifRaw) ? notifRaw : notifRaw?.items ?? [];
          setNotifications(
            notifRows.map((row: any) => ({
              id: Number(row?.id),
              type: (row?.type || 'info') as any,
              message: String(row?.message ?? ''),
              createdAt: String(row?.createdAt ?? new Date().toISOString()),
              businessId: row?.businessId ?? null,
            }))
          );
        } catch (error) {
          console.error('Failed to load notifications', error);
          setNotifications([]);
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      }
    });

    return unsubscribe;
  }, []);

  const setBusiness = async (b: Business): Promise<boolean> => {
    const hasPersistedBusinessId =
      Boolean(business?.id) && /^\d+$/.test(String(business?.id || ''));

    const createPayload = {
      name: b.name,
      description: b.description,
      contactEmail: b.email,
      country: b.country || null,
      feePolicy: toFeePolicy(b.feeHandling),
    };

    const updatePayload = {
      country: b.country || null,
      city: b.city,
      address: b.address,
      contactEmail: b.email,
      contactPhone: b.phone,
      headerImageUrl: b.headerImageUrl,
      idVerificationType: b.idVerificationType ?? null,
      idDocumentData: b.idDocumentData ?? null,
      cacDocumentData: b.cacDocumentData ?? null,
      bankName: b.bankName || null,
      accountNumber: b.accountNumber || null,
      accountHolderName: b.accountHolderName || null,
      feePolicy: toFeePolicy(b.feeHandling),
    };

    try {
      if (hasPersistedBusinessId) {
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

      try {
        const meBusinessRaw = await apiFetch('/dashboard/businesses/me');
        const mapped = toBusiness(meBusinessRaw);
        setBusinessState(mapped);
        setHasSetupComplete(Boolean(mapped.id || mapped.slug));
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
      }
      return true;
    } catch (error) {
      // If we hit a stale local state (no business in DB), retry by creating.
      if (isNotFoundError(error)) {
        try {
          console.log('[BusinessSetup] Retry POST /dashboard/businesses payload:', createPayload);
          await apiFetch('/dashboard/businesses', {
            method: 'POST',
            body: JSON.stringify(createPayload),
          });
          console.log('[BusinessSetup] Retry PATCH /dashboard/businesses/me payload:', updatePayload);
          await apiFetch('/dashboard/businesses/me', {
            method: 'PATCH',
            body: JSON.stringify(updatePayload),
          });

          const meBusinessRaw = await apiFetch('/dashboard/businesses/me');
          const mapped = toBusiness(meBusinessRaw);
          setBusinessState(mapped);
          setHasSetupComplete(Boolean(mapped.id || mapped.slug));
          return true;
        } catch (retryError) {
          console.error('Failed to persist business profile (retry)', retryError);
          return false;
        }
      }
      console.error('Failed to persist business profile', error);
      return false;
    }
  };

  const dismissNotification = async (id: number) => {
    try {
      await apiFetch(`/dashboard/notifications/${id}/dismiss`, { method: 'PATCH' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification', error);
    }
  };

  const addAppointment = (a: Appointment) => {
    setAppointments(prev => [...prev, a]);
    setBusinessLinkCreated(true);

    const payload = {
      name: a.name,
      description: a.description,
      priceAmount: a.price,
      durationMinutes: a.duration,
      maxBookingsPerSlot: a.maxBookingsPerSlot,
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

          try {
            await apiFetch(`/dashboard/services/${mapped.id}/availability`, {
              method: 'PATCH',
              body: JSON.stringify({
                daysOfWeek: a.availableDays,
                startTimeLocal: a.startTime,
                endTimeLocal: a.endTime,
                timezone: getClientTimeZone(),
              }),
            });
          } catch (error) {
            console.error('Failed to save availability rules', error);
          }
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
      durationMinutes: a.duration,
      maxBookingsPerSlot: a.maxBookingsPerSlot,
    };

    void (async () => {
      try {
        await apiFetch(`/dashboard/services/${a.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        try {
          await apiFetch(`/dashboard/services/${a.id}/availability`, {
            method: 'PATCH',
            body: JSON.stringify({
              daysOfWeek: a.availableDays,
              startTimeLocal: a.startTime,
              endTimeLocal: a.endTime,
              timezone: getClientTimeZone(),
            }),
          });
        } catch (error) {
          console.error('Failed to save availability rules', error);
        }
      } catch (error) {
        console.error('Failed to update appointment in backend', error);
      }
    })();
  };

  const setAppointmentPaused = async (id: string, paused: boolean) => {
    const previous = appointments;
    setAppointments(prev => prev.map(p => (p.id === id ? { ...p, paused } : p)));
    try {
      await apiFetch(`/dashboard/services/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: paused ? 'INACTIVE' : 'ACTIVE' }),
      });
    } catch (error) {
      setAppointments(previous);
      console.error('Failed to update appointment status in backend', error);
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    const previousAppointments = appointments;
    const previousBookings = bookings;
    setAppointments(prev => prev.filter(p => p.id !== id));
    setBookings(prev => prev.filter(b => b.appointmentId !== id));

    try {
      await apiFetch(`/dashboard/services/${id}`, { method: 'DELETE' });
    } catch (error) {
      setAppointments(previousAppointments);
      setBookings(previousBookings);
      console.error('Failed to delete appointment in backend', error);
      throw error;
    }
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
                    status: 'pending_payment',
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

  const refreshBookingsForDate = useCallback(
    async (appointmentId: string, date: string) => {
      if (!business?.slug) return;
      const result = await apiFetch(`/dashboard/services/${appointmentId}/bookings?date=${date}`);
      const rows = Array.isArray(result) ? result : result?.items ?? [];
      const mapped = rows.map((b: any) => toBooking(b, appointmentId, business.slug));

      setBookings(prev => {
        const next = new Map<string, Booking>();
        for (const row of prev) next.set(row.id, row);
        for (const row of mapped) next.set(row.id, row);
        return Array.from(next.values());
      });
    },
    [business?.slug]
  );

  const getBookingsForAppointment = (appointmentId: string) =>
    bookings.filter(b => b.appointmentId === appointmentId);

  const getBookingsForDate = (appointmentId: string, date: string) =>
    bookings.filter(
      b =>
        b.appointmentId === appointmentId &&
        b.date === date &&
        (b.status === 'pending_payment' || b.status === 'confirmed' || b.status === 'completed')
    );

  const value = useMemo(
    () => ({
      business,
      setBusiness,
      notifications,
      dismissNotification,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      setAppointmentPaused,
      refreshBookingsForDate,
      bookings,
      addBooking,
      getBookingsForAppointment,
      getBookingsForDate,
      hasSetupComplete,
      setHasSetupComplete,
      businessLinkCreated,
      setBusinessLinkCreated,
    }),
    [
      business,
      notifications,
      appointments,
      bookings,
      hasSetupComplete,
      businessLinkCreated,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
