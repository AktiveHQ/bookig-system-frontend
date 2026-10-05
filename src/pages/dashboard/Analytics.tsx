import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Copy, Share2, Star } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, getPaymentSummary } from '@/lib/finance';
import { cn } from '@/lib/utils';
import type { Appointment, Booking, Business } from '@/types';

const EARNING_STATUSES = ['confirmed', 'completed'];
const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'completed'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];
const CUSTOM_PRESET_OPTIONS: Array<{ value: CustomPreset; label: string }> = [
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'range', label: 'Custom Range' },
];

type Period = 'day' | 'week' | 'month' | 'custom';
type CustomPreset = 'lastMonth' | 'last3Months' | 'range';
type SectionKey = 'performance' | 'services' | 'activity' | 'insights';
type ServiceMetric = 'earnings' | 'bookings';
type ChartRow = { label: string; earnings: number; appointments: number };
type PeriodWindow = { currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date };

type ServicePerformance = {
  id: string;
  name: string;
  earnings: number;
  serviceSales: number;
  fees: number;
  bookings: number;
  previousEarnings: number;
  averageBooking: number;
  percentOfTotal: number;
};

const Analytics = () => {
  const navigate = useNavigate();
  const { appointments, bookings, business } = useData();
  const [period, setPeriod] = useState<Period>('month');
  const [customPreset, setCustomPreset] = useState<CustomPreset>('lastMonth');
  const [expanded, setExpanded] = useState<SectionKey | null>(null);
  const [serviceMetric, setServiceMetric] = useState<ServiceMetric>('earnings');
  const [customRange, setCustomRange] = useState(() => ({
    from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }));
  const feeHandling = business?.feeHandling || 'customer';

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const activeBookings = useMemo(
    () => bookings.filter(booking => ACTIVE_STATUSES.includes(booking.status)),
    [bookings],
  );

  const window = useMemo(() => getPeriodWindow(period, customRange, customPreset), [customPreset, customRange, period]);
  const currentBookings = useMemo(
    () => filterBookingsBetween(activeBookings, window.currentStart, window.currentEnd),
    [activeBookings, window],
  );
  const previousBookings = useMemo(
    () => filterBookingsBetween(activeBookings, window.previousStart, window.previousEnd),
    [activeBookings, window],
  );

  const currentEarningsBookings = useMemo(
    () => currentBookings.filter(booking => EARNING_STATUSES.includes(booking.status)),
    [currentBookings],
  );
  const previousEarningsBookings = useMemo(
    () => previousBookings.filter(booking => EARNING_STATUSES.includes(booking.status)),
    [previousBookings],
  );

  const performance = useMemo(
    () => ({
      earnings: getBookingEarnings(currentEarningsBookings, appointmentsById, feeHandling),
      previousEarnings: getBookingEarnings(previousEarningsBookings, appointmentsById, feeHandling),
      serviceSales: getBookingServiceSales(currentEarningsBookings, appointmentsById, feeHandling),
      fees: getBookingServiceCharges(currentEarningsBookings, appointmentsById, feeHandling),
      bookings: currentEarningsBookings.length,
      previousBookings: previousEarningsBookings.length,
    }),
    [appointmentsById, currentEarningsBookings, feeHandling, previousEarningsBookings],
  );

  const averageBooking = performance.bookings > 0 ? performance.earnings / performance.bookings : 0;
  const earningsComparison = getPercentChange(performance.earnings, performance.previousEarnings);
  const bookingComparison = getPercentChange(currentBookings.length, previousBookings.length);

  const performanceRows = useMemo(
    () => buildChartRows(period, currentBookings, appointments, appointmentsById, feeHandling),
    [appointments, appointmentsById, currentBookings, feeHandling, period],
  );

  const serviceRows = useMemo(
    () =>
      buildServicePerformance(
        appointments,
        currentEarningsBookings,
        previousEarningsBookings,
        appointmentsById,
        feeHandling,
        performance.earnings,
      ),
    [
      appointments,
      appointmentsById,
      currentEarningsBookings,
      feeHandling,
      performance.earnings,
      previousEarningsBookings,
    ],
  );
  const displayedServices = useMemo(
    () => [...serviceRows].sort((a, b) => serviceMetric === 'earnings' ? b.earnings - a.earnings : b.bookings - a.bookings),
    [serviceMetric, serviceRows],
  );
  const topServices = displayedServices.slice(0, 3);
  const maxServiceValue = Math.max(...topServices.map(service => serviceMetric === 'earnings' ? service.earnings : service.bookings), 1);

  const activity = useMemo(() => buildBookingActivity(currentBookings, previousBookings), [currentBookings, previousBookings]);
  const insights = useMemo(
    () => buildInsights(currentEarningsBookings, serviceRows, appointmentsById, feeHandling, period, customPreset, window),
    [appointmentsById, currentEarningsBookings, customPreset, feeHandling, period, serviceRows, window],
  );
  const periodPhrase = getPeriodPhrase(period, customPreset, window);
  const historyUrl = (serviceId = 'all') => {
    const params = new URLSearchParams({
      filter: 'history',
      from: format(window.currentStart, 'yyyy-MM-dd'),
      to: format(window.currentEnd, 'yyyy-MM-dd'),
      serviceId,
    });
    return `/dashboard/bookings?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-4">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Analytics</h1>
          <div className="grid h-11 grid-cols-4 rounded-full border bg-card p-1">
            {PERIOD_OPTIONS.map(item => (
              <button
                key={item.value}
                className={cn(
                  'rounded-full text-sm font-semibold transition-colors',
                  period === item.value ? 'bg-[#020c1a] text-white shadow-sm' : 'text-muted-foreground',
                )}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {CUSTOM_PRESET_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    className={cn(
                      'h-10 rounded-xl border px-3 text-sm font-semibold transition-colors',
                      customPreset === option.value ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
                    )}
                    onClick={() => setCustomPreset(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {customPreset === 'range' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <DateRangeField
                    label="From"
                    value={customRange.from}
                    onChange={from => setCustomRange(range => normalizeCustomRange(from, range.to))}
                  />
                  <DateRangeField
                    label="To"
                    value={customRange.to}
                    onChange={to => setCustomRange(range => normalizeCustomRange(range.from, to))}
                  />
                </div>
              )}
            </div>
          )}
        </header>

        <AnalyticsSection
          title="Performance"
          expanded={expanded === 'performance'}
          onToggle={() => setExpanded(expanded === 'performance' ? null : 'performance')}
          detail={
            <PerformanceDetail
              rows={performanceRows}
              performance={performance}
              comparison={earningsComparison}
              period={period}
              customPreset={customPreset}
              window={window}
            />
          }
        >
          <p className="text-4xl font-extrabold tracking-tight">
            {formatCurrency(performance.earnings)}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Your earnings</p>
          {performance.earnings === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">You have no earnings {periodPhrase}.</p>
          )}
          <ComparisonPill value={earningsComparison} label={getComparisonLabel(period, customPreset)} />
          <div className="mt-5 space-y-2 text-sm">
            <SummaryRow label="Service sales" value={formatCurrency(performance.serviceSales)} />
            <SummaryRow label="Fees" value={`-${formatCurrency(performance.fees)}`} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold">
            <button className="hover:underline" onClick={() => navigate(historyUrl())}>{performance.bookings} Bookings</button>
            <span>{formatCurrency(averageBooking)} Avg. Booking</span>
          </div>
          {performance.earnings === 0 && <ShareLinkActions businessSlug={business?.slug} />}
        </AnalyticsSection>

        <AnalyticsSection
          title={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Top Services</span>
              <button
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold normal-case tracking-normal text-foreground"
                onClick={() => setServiceMetric(value => value === 'earnings' ? 'bookings' : 'earnings')}
              >
                per {serviceMetric === 'earnings' ? 'Earnings' : 'Bookings'}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          }
          expanded={expanded === 'services'}
          onToggle={() => setExpanded(expanded === 'services' ? null : 'services')}
          detail={<ServicesDetail services={displayedServices} metric={serviceMetric} onOpenService={serviceId => navigate(historyUrl(serviceId))} />}
        >
          {topServices.length === 0 ? (
            <EmptyData message={`No services were booked ${periodPhrase}.`} businessSlug={business?.slug} />
          ) : (
            <div className="space-y-5">
              {topServices.map(service => (
                <button key={service.id} className="w-full text-left" onClick={() => navigate(historyUrl(service.id))}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{service.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{service.bookings} bookings</p>
                    </div>
                    <p className="shrink-0 font-bold">{serviceMetric === 'earnings' ? formatCurrency(service.earnings) : service.bookings}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(((serviceMetric === 'earnings' ? service.earnings : service.bookings) / maxServiceValue) * 100, 8)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection
          title="Booking Activity"
          expanded={expanded === 'activity'}
          onToggle={() => setExpanded(expanded === 'activity' ? null : 'activity')}
          detail={<ActivityDetail activity={activity} rows={performanceRows} period={period} customPreset={customPreset} />}
        >
          <div className="grid grid-cols-2 gap-4">
            <SummaryMetric label="Busiest Day" value={activity.busiestDay} />
            <SummaryMetric label="Busiest Time" value={activity.busiestTime} />
          </div>
          <div className="mt-5">
            <button className="text-3xl font-extrabold hover:underline" onClick={() => navigate(historyUrl())}>{currentBookings.length}</button>
            <p className="text-sm text-muted-foreground">Total appointments</p>
            <ComparisonPill value={bookingComparison} label={getComparisonLabel(period, customPreset)} />
            {currentBookings.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No appointments were booked {periodPhrase}.</p>}
          </div>
        </AnalyticsSection>

        <AnalyticsSection
          title="Business Insights"
          expanded={expanded === 'insights'}
          onToggle={() => setExpanded(expanded === 'insights' ? null : 'insights')}
          detail={<InsightsDetail insights={insights} />}
        >
          {insights.length === 0 ? (
            <EmptyData message={`No bookings or earnings happened ${periodPhrase}.`} businessSlug={business?.slug} />
          ) : (
            <div className="space-y-5">
              {insights.slice(0, 2).map((insight, index) => (
                <InsightItem key={`${insight.title}-${index}`} icon={index === 0 ? 'trend' : 'star'} title={insight.title} body={insight.body} />
              ))}
            </div>
          )}
        </AnalyticsSection>
      </main>
    </div>
  );
};

const AnalyticsSection = ({
  title,
  children,
  detail,
  expanded,
  onToggle,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  detail: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <section className="rounded-2xl border bg-card p-5">
    <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
    <div className="mt-4">{children}</div>
    <button
      className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary"
      onClick={onToggle}
    >
      {expanded ? 'Show Less' : 'View More'}
      <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
    </button>
    {expanded && <div className="mt-5 border-t pt-5">{detail}</div>}
  </section>
);

const MiniChart = ({
  rows,
  dataKey,
  className,
}: {
  rows: ChartRow[];
  dataKey: 'earnings' | 'appointments';
  className?: string;
}) => {
  const hasData = rows.some(row => row[dataKey] > 0);
  return (
    <div className={cn('h-44', className)}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
            <YAxis hide />
            <Bar dataKey={dataKey} radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl bg-muted/60 text-sm text-muted-foreground">
          0 {dataKey === 'earnings' ? 'earned' : 'appointments'}
        </div>
      )}
    </div>
  );
};

const PerformanceDetail = ({
  rows,
  performance,
  comparison,
  period,
  customPreset,
  window,
}: {
  rows: ChartRow[];
  performance: { earnings: number; previousEarnings: number; serviceSales: number; fees: number; bookings: number };
  comparison: number | null;
  period: Period;
  customPreset: CustomPreset;
  window: PeriodWindow;
}) => (
  <div className="space-y-5">
    <MiniChart rows={rows} dataKey="earnings" />
    <div className="grid gap-3 sm:grid-cols-2">
      <DetailMetric label="Gross service sales" value={formatCurrency(performance.serviceSales)} />
      <DetailMetric label="Total fees" value={`-${formatCurrency(performance.fees)}`} />
      <DetailMetric label="Net earnings" value={formatCurrency(performance.earnings)} />
      <DetailMetric label="Average booking value" value={formatCurrency(performance.bookings > 0 ? performance.earnings / performance.bookings : 0)} />
      <DetailMetric label={getPreviousEarningsLabel(period, customPreset, window)} value={formatCurrency(performance.previousEarnings)} />
      <DetailComparisonMetric label="Comparison" value={comparison} comparisonLabel={getComparisonLabel(period, customPreset)} />
    </div>
    <p className="text-xs text-muted-foreground">Transactions and payout history remain in Finance / Transactions.</p>
  </div>
);

const ServicesDetail = ({
  services,
  metric,
  onOpenService,
}: {
  services: ServicePerformance[];
  metric: ServiceMetric;
  onOpenService: (serviceId: string) => void;
}) => (
  <div className="space-y-4">
    {services.length === 0 ? (
      <EmptyData message="No services were booked for this selection." />
    ) : (
      services.map(service => (
        <button key={service.id} className="w-full border-b pb-4 text-left last:border-b-0 last:pb-0" onClick={() => onOpenService(service.id)}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{service.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.bookings} bookings · {formatCurrency(service.averageBooking)} avg.
              </p>
            </div>
            <p className="shrink-0 font-bold">{metric === 'earnings' ? formatCurrency(service.earnings) : service.bookings}</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <DetailMetric label="Total share" value={`${Math.round(service.percentOfTotal)}%`} />
            <DetailMetric label="Service sales" value={formatCurrency(service.serviceSales)} />
            <DetailMetric label="Growth" value={formatNullablePercent(getPercentChange(service.earnings, service.previousEarnings))} />
          </div>
        </button>
      ))
    )}
  </div>
);

const ActivityDetail = ({
  activity,
  rows,
  period,
  customPreset,
}: {
  activity: ReturnType<typeof buildBookingActivity>;
  rows: ChartRow[];
  period: Period;
  customPreset: CustomPreset;
}) => (
  <div className="space-y-5">
    <MiniChart rows={rows} dataKey="appointments" />
    <div className="grid gap-3 sm:grid-cols-2">
      <DetailMetric label="Busiest day" value={activity.busiestDay} />
      <DetailMetric label="Busiest time" value={activity.busiestTime} />
      <DetailMetric label="Appointments" value={String(activity.total)} />
      <DetailMetric
        label="Comparison"
        value={formatNullablePercent(getPercentChange(activity.total, activity.previousTotal), getComparisonLabel(period, customPreset))}
      />
    </div>
    <div className="space-y-2">
      <p className="text-sm font-semibold">Appointments by day</p>
      {activity.byDay.length === 0 ? <EmptyData message="No appointments were booked for this selection." /> : activity.byDay.map(row => <SummaryRow key={row.label} label={row.label} value={String(row.count)} />)}
    </div>
  </div>
);

const InsightsDetail = ({ insights }: { insights: Array<{ title: string; body: string }> }) => (
  <div className="space-y-5">
    {insights.length === 0 ? (
      <EmptyData message="No bookings or earnings happened for this selection." />
    ) : (
      insights.map((insight, index) => (
        <InsightItem key={`${insight.title}-${index}`} icon={index === 1 ? 'star' : 'trend'} title={insight.title} body={insight.body} />
      ))
    )}
  </div>
);

const InsightItem = ({ icon, title, body }: { icon: 'trend' | 'star'; title: string; body: string }) => {
  const Icon = icon === 'trend' ? ArrowUpRight : Star;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
};

const SummaryMetric = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-extrabold">{value || 'None'}</p>
  </div>
);

const DateRangeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
    <input
      type="date"
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-semibold outline-none transition-colors focus:border-primary"
    />
  </label>
);

const SummaryRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value || '0'}</span>
  </div>
);

const DetailMetric = ({ label, value }: { label: string; value: string | null }) => (
  <div className="rounded-xl bg-muted/70 p-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 font-bold">{value || '0'}</p>
  </div>
);

const DetailComparisonMetric = ({ label, value, comparisonLabel }: { label: string; value: number | null; comparisonLabel: string }) => (
  <div className="rounded-xl bg-muted/70 p-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <ComparisonPill value={value} label={comparisonLabel} />
  </div>
);

const ComparisonPill = ({ value, label }: { value: number | null; label: string }) => (
  <p
    className={cn(
      'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      value === null
        ? 'bg-muted text-muted-foreground'
        : value >= 0
          ? 'bg-emerald-500/10 text-emerald-600'
          : 'bg-red-500/10 text-red-600',
    )}
  >
    {value !== null && (value >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
    {value === null ? label : formatPercent(value, label)}
  </p>
);

const EmptyData = ({ message, businessSlug }: { message: string; businessSlug?: string }) => (
  <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
    {message}
    {businessSlug && <ShareLinkActions businessSlug={businessSlug} compact />}
  </div>
);

const ShareLinkActions = ({ businessSlug, compact = false }: { businessSlug?: string; compact?: boolean }) => {
  const bookingUrl = businessSlug && typeof window !== 'undefined' ? `${window.location.origin}/booking/${businessSlug}` : '';
  const copyLink = async () => {
    if (!bookingUrl) return;
    await navigator.clipboard?.writeText(bookingUrl);
  };
  const shareLink = async () => {
    if (!bookingUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'Book a service', url: bookingUrl });
      return;
    }
    await copyLink();
  };

  if (!businessSlug) return null;

  return (
    <div className={cn('flex items-center gap-2', compact ? 'mt-3' : 'mt-3')}>
      <span className="text-sm text-muted-foreground">Share your link</span>
      <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-card text-foreground" onClick={copyLink} aria-label="Copy booking link">
        <Copy className="h-4 w-4" />
      </button>
      <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-card text-foreground" onClick={shareLink} aria-label="Share booking link">
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
};

const normalizeCustomRange = (from: string, to: string) => {
  if (!from || !to) return { from, to };
  return parseISO(from) <= parseISO(to) ? { from, to } : { from: to, to: from };
};

const getPeriodWindow = (period: Period, customRange: { from: string; to: string }, customPreset: CustomPreset): PeriodWindow => {
  const now = new Date();
  if (period === 'day') {
    const previous = subDays(now, 1);
    return {
      currentStart: startOfDay(now),
      currentEnd: endOfDay(now),
      previousStart: startOfDay(previous),
      previousEnd: endOfDay(previous),
    };
  }
  if (period === 'week') {
    const previous = subWeeks(now, 1);
    return {
      currentStart: startOfWeek(now),
      currentEnd: endOfWeek(now),
      previousStart: startOfWeek(previous),
      previousEnd: endOfWeek(previous),
    };
  }
  if (period === 'month') {
    const previous = subMonths(now, 1);
    return {
      currentStart: startOfMonth(now),
      currentEnd: endOfMonth(now),
      previousStart: startOfMonth(previous),
      previousEnd: endOfMonth(previous),
    };
  }

  if (customPreset === 'lastMonth') {
    const lastMonth = subMonths(now, 1);
    const previousMonth = subMonths(now, 2);
    return {
      currentStart: startOfMonth(lastMonth),
      currentEnd: endOfMonth(lastMonth),
      previousStart: startOfMonth(previousMonth),
      previousEnd: endOfMonth(previousMonth),
    };
  }

  if (customPreset === 'last3Months') {
    const currentStart = startOfDay(subMonths(now, 3));
    const currentEnd = endOfDay(now);
    const rangeDays = Math.max(differenceInCalendarDays(currentEnd, currentStart) + 1, 1);
    const previousEnd = endOfDay(subDays(currentStart, 1));
    return {
      currentStart,
      currentEnd,
      previousStart: startOfDay(subDays(previousEnd, rangeDays - 1)),
      previousEnd,
    };
  }

  const customStart = startOfDay(parseISO(customRange.from));
  const customEnd = endOfDay(parseISO(customRange.to));
  if (Number.isNaN(customStart.getTime()) || Number.isNaN(customEnd.getTime())) {
    const fallback = subDays(now, 29);
    return {
      currentStart: startOfDay(fallback),
      currentEnd: endOfDay(now),
      previousStart: startOfDay(subDays(fallback, 30)),
      previousEnd: endOfDay(subDays(fallback, 1)),
    };
  }

  const rangeDays = Math.max(differenceInCalendarDays(customEnd, customStart) + 1, 1);
  const previousEnd = endOfDay(subDays(customStart, 1));
  return {
    currentStart: customStart,
    currentEnd: customEnd,
    previousStart: startOfDay(subDays(previousEnd, rangeDays - 1)),
    previousEnd,
  };
};

const buildChartRows = (
  period: Period,
  bookings: Booking[],
  appointments: Appointment[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
): ChartRow[] => {
  if (period === 'day') {
    return getWorkHourRanges(appointments).map(range => {
      const rangeBookings = bookings.filter(booking => {
        const minutes = getTimeInMinutes(booking.time);
        return minutes >= range.start && minutes < range.end;
      });
      return createChartRow(range.label, rangeBookings, appointmentsById, feeHandling);
    });
  }

  if (period === 'week') {
    return DAY_NAMES.map((label, dayIndex) => {
      const dayBookings = bookings.filter(booking => parseBookingDateTime(booking).getDay() === dayIndex);
      return createChartRow(label.slice(0, 3), dayBookings, appointmentsById, feeHandling);
    });
  }

  if (period === 'month') {
    return Array.from({ length: 5 }, (_, index) => {
      const lower = index * 7 + 1;
      const upper = index === 4 ? 31 : (index + 1) * 7;
      const bucketBookings = bookings.filter(booking => {
        const day = parseBookingDateTime(booking).getDate();
        return day >= lower && day <= upper;
      });
      return createChartRow(`Wk ${index + 1}`, bucketBookings, appointmentsById, feeHandling);
    });
  }

  if (bookings.length === 0) {
    return [];
  }

  const sortedDates = bookings
    .map(booking => startOfDay(parseBookingDateTime(booking)))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const days = Math.max(differenceInCalendarDays(lastDate, firstDate) + 1, 1);
  const bucketCount = Math.min(days, 7);
  const bucketSize = Math.ceil(days / bucketCount);

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = addDays(firstDate, index * bucketSize);
    const end = index === bucketCount - 1 ? lastDate : addDays(start, bucketSize - 1);
    const bucketBookings = bookings.filter(booking => {
      const date = parseBookingDateTime(booking);
      return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
    });
    const label = start.toDateString() === end.toDateString() ? format(start, 'd MMM') : `${format(start, 'd MMM')} - ${format(end, 'd MMM')}`;
    return createChartRow(label, bucketBookings, appointmentsById, feeHandling);
  });
};

const createChartRow = (
  label: string,
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
): ChartRow => ({
  label,
  earnings: getBookingEarnings(bookings, appointmentsById, feeHandling),
  appointments: bookings.length,
});

const buildServicePerformance = (
  appointments: Appointment[],
  currentBookings: Booking[],
  previousBookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
  totalEarnings: number,
): ServicePerformance[] =>
  appointments
    .map(appointment => {
      const serviceBookings = currentBookings.filter(booking => booking.appointmentId === appointment.id);
      const previousServiceBookings = previousBookings.filter(booking => booking.appointmentId === appointment.id);
      const earnings = getBookingEarnings(serviceBookings, appointmentsById, feeHandling);
      const bookings = serviceBookings.length;
      return {
        id: appointment.id,
        name: appointment.name || 'Service',
        earnings,
        serviceSales: getBookingServiceSales(serviceBookings, appointmentsById, feeHandling),
        fees: getBookingServiceCharges(serviceBookings, appointmentsById, feeHandling),
        bookings,
        previousEarnings: getBookingEarnings(previousServiceBookings, appointmentsById, feeHandling),
        averageBooking: bookings > 0 ? earnings / bookings : 0,
        percentOfTotal: totalEarnings > 0 ? (earnings / totalEarnings) * 100 : 0,
      };
    })
    .filter(service => service.earnings > 0 || service.bookings > 0)
    .sort((a, b) => b.earnings - a.earnings);

const buildBookingActivity = (currentBookings: Booking[], previousBookings: Booking[]) => {
  const byDay = DAY_NAMES.map((label, dayIndex) => ({
    label,
    count: currentBookings.filter(booking => parseBookingDateTime(booking).getDay() === dayIndex).length,
  })).filter(row => row.count > 0);

  const timeRanges = getActivityTimeRanges(currentBookings);
  const busiestDay = byDay.length ? [...byDay].sort((a, b) => b.count - a.count)[0].label : null;
  const busiestTime = timeRanges.length ? [...timeRanges].sort((a, b) => b.count - a.count)[0].label : null;

  return {
    busiestDay,
    busiestTime,
    byDay,
    byTime: timeRanges,
    total: currentBookings.length,
    previousTotal: previousBookings.length,
  };
};

const buildInsights = (
  bookings: Booking[],
  serviceRows: ServicePerformance[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
  period: Period,
  customPreset: CustomPreset,
  window: PeriodWindow,
) => {
  const insights: Array<{ title: string; body: string }> = [];
  const periodPhrase = getPeriodPhrase(period, customPreset, window);
  const dayGroups = DAY_NAMES.map((day, index) => {
    const rows = bookings.filter(booking => parseBookingDateTime(booking).getDay() === index);
    return {
      day,
      bookings: rows.length,
      earnings: getBookingEarnings(rows, appointmentsById, feeHandling),
    };
  }).filter(group => group.bookings > 0);

  const strongestDay = dayGroups.sort((a, b) => b.earnings - a.earnings)[0];
  if (strongestDay && period !== 'day') {
    insights.push({
      title: `${strongestDay.day} is your strongest day`,
      body: `You earned ${formatCurrency(strongestDay.earnings)} from ${strongestDay.bookings} bookings ${periodPhrase}.`,
    });
  }

  const topService = serviceRows[0];
  if (topService) {
    insights.push({
      title: `${topService.name} is your top service`,
      body: `${topService.name} generated ${formatCurrency(topService.earnings)} from ${topService.bookings} bookings ${periodPhrase}.`,
    });
  }

  const busiestTime = getActivityTimeRanges(bookings).sort((a, b) => b.count - a.count)[0];
  if (busiestTime) {
    insights.push({
      title: `${busiestTime.label} gets the most bookings`,
      body: `${busiestTime.count} appointments were booked during this time range ${periodPhrase}.`,
    });
  }

  return insights;
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
      label: `${formatHour(rangeStart)} - ${formatHour(rangeEnd)}`,
    };
  });
};

const getActivityTimeRanges = (bookings: Booking[]) => {
  const buckets = [
    { label: '6 AM - 9 AM', start: 6 * 60, end: 9 * 60, count: 0 },
    { label: '9 AM - 12 PM', start: 9 * 60, end: 12 * 60, count: 0 },
    { label: '12 PM - 3 PM', start: 12 * 60, end: 15 * 60, count: 0 },
    { label: '3 PM - 6 PM', start: 15 * 60, end: 18 * 60, count: 0 },
    { label: '6 PM - 9 PM', start: 18 * 60, end: 21 * 60, count: 0 },
  ];

  for (const booking of bookings) {
    const minutes = getTimeInMinutes(booking.time);
    const bucket = buckets.find(row => minutes >= row.start && minutes < row.end);
    if (bucket) bucket.count += 1;
  }

  return buckets.filter(row => row.count > 0);
};

const parseBookingDateTime = (booking: Booking) => {
  const parsed = parseISO(`${booking.date}T${booking.time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? parseISO(booking.date) : parsed;
};

const getTimeInMinutes = (time: string) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const formatHour = (minutes: number) => {
  const hour = Math.floor(minutes / 60) % 24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${ampm}`;
};

const getBookingEarnings = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
) =>
  bookings.reduce((sum, booking) => {
    const appointment = appointmentsById.get(booking.appointmentId);
    return sum + getPaymentSummary(booking, appointment, feeHandling).vendorNet;
  }, 0);

const getBookingServiceSales = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
) =>
  bookings.reduce((sum, booking) => {
    const appointment = appointmentsById.get(booking.appointmentId);
    return sum + getPaymentSummary(booking, appointment, feeHandling).servicePrice;
  }, 0);

const getBookingServiceCharges = (
  bookings: Booking[],
  appointmentsById: Map<string, Appointment>,
  feeHandling: Business['feeHandling'],
) =>
  bookings.reduce((sum, booking) => {
    const appointment = appointmentsById.get(booking.appointmentId);
    const summary = getPaymentSummary(booking, appointment, feeHandling);
    return sum + (summary.feePayer === 'business' ? summary.serviceCharge : 0);
  }, 0);

const getPercentChange = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? 100 : null;
  if (current <= 0) return -100;
  return ((current - previous) / previous) * 100;
};

const formatPercent = (value: number, label: string) => `${Math.abs(Math.round(value))}% ${label}`;

const formatNullablePercent = (value: number | null, label = '') =>
  value === null ? null : formatPercent(value, label).trim();

const getComparisonLabel = (period: Period, customPreset: CustomPreset) => {
  if (period === 'day') return 'yesterday vs today';
  if (period === 'week') return 'last week vs this week';
  if (period === 'month') return 'last month vs this month';
  if (customPreset === 'lastMonth') return 'two months ago vs last month';
  if (customPreset === 'last3Months') return 'earlier 3 months vs last 3 months';
  return 'earlier dates vs selected dates';
};

const getPeriodPhrase = (period: Period, customPreset: CustomPreset, window?: PeriodWindow) => {
  if (period === 'day') return 'today';
  if (period === 'week') return 'this week';
  if (period === 'month') return 'this month';
  if (customPreset === 'lastMonth') return 'last month';
  if (customPreset === 'last3Months') return 'in the last 3 months';
  if (window) return `from ${format(window.currentStart, 'MMM d')} to ${format(window.currentEnd, 'MMM d')}`;
  return 'in the custom dates';
};

const getPreviousEarningsLabel = (period: Period, customPreset: CustomPreset, window: PeriodWindow) => {
  if (period === 'day') return 'Yesterday Earnings';
  if (period === 'week') return 'Last Week Earnings';
  if (period === 'month') return 'Last Month Earnings';
  if (customPreset === 'lastMonth') return 'Two Months Ago Earnings';
  if (customPreset === 'last3Months') return 'Earlier 3 Months Earnings';
  return `${format(window.previousStart, 'MMM d')} - ${format(window.previousEnd, 'MMM d')} Earnings`;
};

export default Analytics;
