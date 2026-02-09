import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Business, Appointment, Booking } from '@/types';

interface DataContextType {
  business: Business | null;
  setBusiness: (b: Business) => void;
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [business, setBusinessState] = useState<Business | null>(() => {
    const stored = localStorage.getItem('booking_business');
    return stored ? JSON.parse(stored) : null;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const stored = localStorage.getItem('booking_appointments');
    return stored ? JSON.parse(stored) : [];
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const stored = localStorage.getItem('booking_bookings');
    return stored ? JSON.parse(stored) : [];
  });

  const [hasSetupComplete, setHasSetupComplete] = useState<boolean>(() => {
    return localStorage.getItem('booking_setup_complete') === 'true';
  });

  const [businessLinkCreated, setBusinessLinkCreated] = useState<boolean>(() => {
    return localStorage.getItem('booking_link_created') === 'true';
  });

  useEffect(() => {
    if (business) localStorage.setItem('booking_business', JSON.stringify(business));
  }, [business]);

  useEffect(() => {
    localStorage.setItem('booking_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('booking_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('booking_setup_complete', String(hasSetupComplete));
  }, [hasSetupComplete]);

  useEffect(() => {
    localStorage.setItem('booking_link_created', String(businessLinkCreated));
  }, [businessLinkCreated]);

  const setBusiness = (b: Business) => setBusinessState(b);

  const addAppointment = (a: Appointment) => setAppointments(prev => [...prev, a]);

  const updateAppointment = (a: Appointment) =>
    setAppointments(prev => prev.map(p => (p.id === a.id ? a : p)));

  const deleteAppointment = (id: string) =>
    setAppointments(prev => prev.filter(p => p.id !== id));

  const addBooking = (b: Booking) => setBookings(prev => [...prev, b]);

  const getBookingsForAppointment = (appointmentId: string) =>
    bookings.filter(b => b.appointmentId === appointmentId);

  const getBookingsForDate = (appointmentId: string, date: string) =>
    bookings.filter(b => b.appointmentId === appointmentId && b.date === date && b.status === 'confirmed');

  return (
    <DataContext.Provider
      value={{
        business, setBusiness,
        appointments, addAppointment, updateAppointment, deleteAppointment,
        bookings, addBooking,
        getBookingsForAppointment, getBookingsForDate,
        hasSetupComplete, setHasSetupComplete,
        businessLinkCreated, setBusinessLinkCreated,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
