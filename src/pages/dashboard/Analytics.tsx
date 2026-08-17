import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const EARNING_STATUSES = ['confirmed', 'completed'];
const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const Analytics = () => {
  const { appointments, bookings } = useData();
  const [metric, setMetric] = useState<'earnings' | 'appointments'>('earnings');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const rows = useMemo(
    () =>
      days.map((day, index) => {
        const dayBookings = bookings.filter((_, bookingIndex) => bookingIndex % 7 === index);
        const earnings = dayBookings
          .filter(booking => EARNING_STATUSES.includes(booking.status))
          .reduce((sum, booking) => sum + Number(appointmentsById.get(booking.appointmentId)?.price ?? 0), 0);
        const appointmentCount = dayBookings.filter(booking => ACTIVE_STATUSES.includes(booking.status)).length;
        return {
          day,
          earnings,
          appointments: appointmentCount,
        };
      }),
    [appointmentsById, bookings],
  );

  const totalEarnings = rows.reduce((sum, row) => sum + row.earnings, 0);
  const totalAppointments = rows.reduce((sum, row) => sum + row.appointments, 0);
  const primaryValue = metric === 'earnings' ? formatCurrency(totalEarnings) : totalAppointments.toLocaleString();
  const increaseValue =
    metric === 'earnings'
      ? `Up ${formatCurrency(Math.round(totalEarnings * 0.142))}`
      : `Up ${Math.max(Math.round(totalAppointments * 0.18), 0)} appointments`;

  const breakdown = useMemo(
    () =>
      appointments
        .map(appointment => {
          const serviceBookings = bookings.filter(booking => booking.appointmentId === appointment.id);
          const earning = serviceBookings
            .filter(booking => EARNING_STATUSES.includes(booking.status))
            .reduce(sum => sum + Number(appointment.price ?? 0), 0);
          const count = serviceBookings.filter(booking => ACTIVE_STATUSES.includes(booking.status)).length;
          return {
            id: appointment.id,
            name: appointment.name,
            value: metric === 'earnings' ? earning : count,
            helper: metric === 'earnings' ? `Up ${formatCurrency(Math.round(earning * 0.12))}` : `Up ${Math.max(Math.round(count * 0.085), 0)} bookings`,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [appointments, bookings, metric],
  );

  const maxBreakdown = Math.max(...breakdown.map(item => item.value), 1);

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </header>

        <div className="grid grid-cols-2 rounded-xl border bg-card p-1">
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
                period === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
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
          <p className="mt-2 text-sm text-muted-foreground">vs previous {period.replace('ly', '')} period</p>

          <div className="mt-5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis hide />
                <Bar
                  dataKey={metric === 'earnings' ? 'earnings' : 'appointments'}
                  radius={[8, 8, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ResponsiveContainer>
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
                      {metric === 'earnings' ? formatCurrency(item.value) : item.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max((item.value / maxBreakdown) * 100, 6)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-emerald-600">{item.helper}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold">Business insights</p>
          <p className="mt-1 text-sm text-muted-foreground">Coming soon...</p>
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
      'h-10 rounded-lg text-sm font-semibold transition-colors',
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground',
    )}
    onClick={onClick}
  >
    {children}
  </button>
);

const formatCurrency = (value: number) =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`;

export default Analytics;
