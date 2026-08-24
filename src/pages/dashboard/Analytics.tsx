import { useMemo, useState } from 'react';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subWeeks,
  subYears,
} from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import type { Appointment, Booking } from '@/types';
import { formatCurrency, getPaymentSummary } from '@/lib/finance';

const EARNING_STATUSES = ['confirmed', 'completed'];
const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Metric = 'earnings' | 'appointments';
type ChartRow = { label: string; earnings: number; appointments: number };

const Analytics = () => {
  const { appointments, bookings, business } = useData();
  const [metric, setMetric] = useState<Metric>('earnings');
  const [period, setPeriod] = useState<Period>('weekly');
  const feeHandling = business?.feeHandling || 'customer';

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const activeBookings = useMemo(
    () => bookings.filter(booking => ACTIVE_STATUSES.includes(booking.status)),
    [bookings],
  );

  const rows = useMemo(
    () => buildChartRows(period, activeBookings, appointments, appointmentsById, feeHandling),
    [activeBookings, appointments, appointmentsById, feeHandling, period],
  );

  const currentPeriodBookings = useMemo(
    () => getCurrentPeriodBookings(period, activeBookings),
    [activeBookings, period],
  );

  const previousPeriodBookings = useMemo(
    () => getPreviousPeriodBookings(period, activeBookings),
    [activeBookings, period],
  );

  const currentEarnings = getBookingEarnings(currentPeriodBookings, appointmentsById, feeHandling);
  const previousEarnings = getBookingEarnings(previousPeriodBookings, appointmentsById, feeHandling);
  const currentServiceSales = getBookingServiceSales(currentPeriodBookings, appointmentsById, feeHandling);
  const currentFees = getBookingServiceCharges(currentPeriodBookings, appointmentsById, feeHandling);
  const currentAppointments = currentPeriodBookings.length;
  const previousAppointments = previousPeriodBookings.length;

  const primaryValue =
    metric === 'earnings'
      ? formatCurrency(currentEarnings)
      : currentAppointments.toLocaleString('en-NG');
  const increaseValue =
    metric === 'earnings'
      ? `Up ${formatCurrency(Math.max(currentEarnings - previousEarnings, 0))}`
      : `Up ${Math.max(currentAppointments - previousAppointments, 0)} appointments`;

  const breakdown = useMemo(
    () =>
      appointments
        .map(appointment => {
          const serviceBookings = currentPeriodBookings.filter(
            booking => booking.appointmentId === appointment.id,
          );
          const earning = getBookingEarnings(serviceBookings, appointmentsById, feeHandling);
          const count = serviceBookings.length;
          return {
            id: appointment.id,
            name: appointment.name,
            value: metric === 'earnings' ? earning : count,
            helper: 'Comparison coming soon',
          };
        })
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [appointments, appointmentsById, currentPeriodBookings, feeHandling, metric],
  );

  const maxBreakdown = Math.max(...breakdown.map(item => item.value), 1);

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </header>

        <div className="grid h-11 grid-cols-2 rounded-full border bg-card p-1">
          <SegmentButton active={metric === 'earnings'} onClick={() => setMetric('earnings')}>
            Earnings
          </SegmentButton>
          <SegmentButton active={metric === 'appointments'} onClick={() => setMetric('appointments')}>
            Appointments
          </SegmentButton>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(item => (
            <button
              key={item}
              className={cn(
                'h-9 shrink-0 rounded-full border px-4 text-sm capitalize',
                period === item ? 'border-[#020c1a] bg-[#020c1a] text-white' : 'bg-card text-muted-foreground',
              )}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <p className="text-4xl font-extrabold tracking-tight">{primaryValue}</p>
          <p className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            {increaseValue}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{getComparisonLabel(period)}</p>
          {metric === 'earnings' && (
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-muted-foreground">Gross bookings</p>
                <p className="mt-1 font-semibold">{formatCurrency(currentServiceSales)}</p>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-muted-foreground">Fees</p>
                <p className="mt-1 font-semibold">{formatCurrency(currentFees)}</p>
              </div>
            </div>
          )}

          <div className="mt-5 max-h-72 overflow-y-auto pr-1">
            <div className={cn('h-48', period === 'monthly' && 'h-56')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis hide />
                  <Bar
                    dataKey={metric === 'earnings' ? 'earnings' : 'appointments'}
                    radius={[8, 8, 0, 0]}
                    fill="hsl(var(--primary))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">
            {metric === 'earnings' ? 'Earnings by service' : 'Appointments by service'}
          </h2>
          <div className="space-y-3">
            {breakdown.length === 0 ? (
              <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
                No data yet.
              </div>
            ) : (
              breakdown.map(item => (
                <div key={item.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="font-semibold">
                      {metric === 'earnings' ? formatCurrency(item.value) : item.value.toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max((item.value / maxBreakdown) * 100, 6)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{item.helper}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold">Fees this period</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(currentFees)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            5% of {formatCurrency(currentServiceSales)} in service sales
          </p>
        </section>
      </main>
    </div>
  );
};

const SegmentButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) => (
  <button
    className={cn(
      'rounded-full text-sm font-semibold transition-colors',
      active ? 'bg-[#020c1a] text-white shadow-sm' : 'text-muted-foreground',
    )}
    onClick={onClick}
  >
    {children}
  </button>
);

const buildChartRows = (
  period: Period,
  bookings: Booking[],
  appointments: Appointment[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: 'customer' | 'business',
): ChartRow[] => {
  if (period === 'daily') {
    const todayBookings = filterBookingsBetween(bookings, startOfDay(new Date()), endOfDay(new Date()));
    const ranges = getWorkHourRanges(appointments);
    return ranges.map(range => {
      const rangeBookings = todayBookings.filter(booking => {
        const minutes = getTimeInMinutes(booking.time);
        return minutes >= range.start && minutes < range.end;
      });
      return createChartRow(range.label, rangeBookings, appointmentsById, feeHandling);
    });
  }

  if (period === 'weekly') {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    return Array.from({ length: 5 }, (_, index) => {
      const rangeStart = new Date(monthStart);
      rangeStart.setDate(index * 7 + 1);
      const rangeEnd = new Date(monthStart);
      rangeEnd.setDate(Math.min((index + 1) * 7, monthEnd.getDate()));
      rangeEnd.setHours(23, 59, 59, 999);
      return createChartRow(
        `Wk ${index + 1}`,
        filterBookingsBetween(bookings, rangeStart, rangeEnd),
        appointmentsById,
        feeHandling,
      );
    });
  }

  if (period === 'monthly') {
    const year = new Date().getFullYear();
    return MONTH_LABELS.map((label, monthIndex) => {
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = endOfMonth(monthStart);
      return createChartRow(label, filterBookingsBetween(bookings, monthStart, monthEnd), appointmentsById, feeHandling);
    });
  }

  const currentYear = new Date().getFullYear();
  const latestBookingYear = bookings.reduce((latest, booking) => {
    const year = parseBookingDateTime(booking).getFullYear();
    return Number.isNaN(year) ? latest : Math.max(latest, year);
  }, currentYear);

  return Array.from({ length: latestBookingYear - currentYear + 1 }, (_, index) => {
    const year = currentYear + index;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = endOfYear(yearStart);
    return createChartRow(String(year), filterBookingsBetween(bookings, yearStart, yearEnd), appointmentsById, feeHandling);
  });
};

const createChartRow = (
  label: string,
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: 'customer' | 'business',
): ChartRow => ({
  label,
  earnings: getBookingEarnings(bookings, appointmentsById, feeHandling),
  appointments: bookings.length,
});

const getCurrentPeriodBookings = (period: Period, bookings: Booking[]) => {
  const now = new Date();
  if (period === 'daily') return filterBookingsBetween(bookings, startOfDay(now), endOfDay(now));
  if (period === 'weekly') return filterBookingsBetween(bookings, startOfWeek(now), endOfWeek(now));
  if (period === 'monthly') return filterBookingsBetween(bookings, startOfYear(now), endOfYear(now));
  return filterBookingsBetween(bookings, startOfYear(now), endOfYear(now));
};

const getPreviousPeriodBookings = (period: Period, bookings: Booking[]) => {
  const now = new Date();
  if (period === 'daily') {
    const yesterday = subDays(now, 1);
    return filterBookingsBetween(bookings, startOfDay(yesterday), endOfDay(yesterday));
  }
  if (period === 'weekly') {
    const previousWeek = subWeeks(now, 1);
    return filterBookingsBetween(bookings, startOfWeek(previousWeek), endOfWeek(previousWeek));
  }
  if (period === 'monthly') {
    const previousYear = subYears(now, 1);
    return filterBookingsBetween(bookings, startOfYear(previousYear), endOfYear(previousYear));
  }
  const previousYear = subYears(now, 1);
  return filterBookingsBetween(bookings, startOfYear(previousYear), endOfYear(previousYear));
};

const filterBookingsBetween = (bookings: Booking[], start: Date, end: Date) =>
  bookings.filter(booking => {
    const bookingDate = parseBookingDateTime(booking);
    if (Number.isNaN(bookingDate.getTime())) return false;
    return isWithinInterval(bookingDate, { start, end });
  });

const getWorkHourRanges = (appointments: Appointment[]) => {
  const starts = appointments.map(appointment => getTimeInMinutes(appointment.startTime)).filter(Number.isFinite);
  const ends = appointments.map(appointment => getTimeInMinutes(appointment.endTime)).filter(Number.isFinite);
  const start = starts.length ? Math.min(...starts) : 8 * 60;
  const rawEnd = ends.length ? Math.max(...ends) : 18 * 60;
  const end = rawEnd > start ? rawEnd : start + 10 * 60;
  const total = Math.max(end - start, 5 * 60);
  const size = Math.ceil(total / 5 / 30) * 30;

  return Array.from({ length: 5 }, (_, index) => {
    const rangeStart = start + index * size;
    const rangeEnd = index === 4 ? end : Math.min(start + (index + 1) * size, end);
    return {
      start: rangeStart,
      end: rangeEnd + (index === 4 ? 1 : 0),
      label: `${formatHour(rangeStart)}-${formatHour(rangeEnd)}`,
    };
  });
};

const parseBookingDateTime = (booking: Booking) => {
  const parsed = parseISO(`${booking.date}T${booking.time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? parseISO(booking.date) : parsed;
};

const getTimeInMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const formatHour = (minutes: number) => {
  const hour = Math.floor(minutes / 60) % 24;
  const displayHour = hour % 12 || 12;
  return String(displayHour);
};

const getBookingEarnings = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: 'customer' | 'business',
) =>
  bookings
    .filter(booking => EARNING_STATUSES.includes(booking.status))
    .reduce((sum, booking) => {
      const appointment = appointmentsById.get(booking.appointmentId);
      return sum + getPaymentSummary(booking, appointment, feeHandling).vendorNet;
    }, 0);

const getComparisonLabel = (period: Period) => {
  if (period === 'daily') return 'vs yesterday';
  if (period === 'weekly') return 'vs previous week';
  if (period === 'monthly') return 'vs previous year';
  return 'vs previous year';
};

const getBookingServiceSales = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: 'customer' | 'business',
) =>
  bookings
    .filter(booking => EARNING_STATUSES.includes(booking.status))
    .reduce((sum, booking) => {
      const appointment = appointmentsById.get(booking.appointmentId);
      return sum + getPaymentSummary(booking, appointment, feeHandling).servicePrice;
    }, 0);

const getBookingServiceCharges = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: 'customer' | 'business',
) =>
  bookings
    .filter(booking => EARNING_STATUSES.includes(booking.status))
    .reduce((sum, booking) => {
      const appointment = appointmentsById.get(booking.appointmentId);
      const summary = getPaymentSummary(booking, appointment, feeHandling);
      return sum + (summary.feePayer === 'business' ? summary.serviceCharge : 0);
    }, 0);

const legacyFormatCurrency = (value: number) =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`;

export default Analytics;
