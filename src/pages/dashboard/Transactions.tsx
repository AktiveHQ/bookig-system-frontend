import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addBusinessDays,
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  ArrowDownToLine,
  ArrowLeft,
  BookOpenText,
  BriefcaseBusiness,
  ChevronRight,
  Dumbbell,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import type { Appointment, Booking, Business } from '@/types';

const EARNING_STATUSES = ['confirmed', 'completed'];

type Tab = 'earnings' | 'payouts';
type EarningStatus = 'Pending' | 'Settled';
type Earning = Booking & {
  appointment?: Appointment;
  serviceName: string;
  amount: number;
  expectedPayoutDate: Date;
  settlementStatus: EarningStatus;
};
type Payout = {
  id: string;
  date: Date;
  amount: number;
  status: 'Processing' | 'Paid';
  earnings: Earning[];
};

const Transactions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appointments, bookings, business, fetchBookingHistory } = useData();
  const initialTab = searchParams.get('tab') === 'payouts' ? 'payouts' : 'earnings';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedEarning, setSelectedEarning] = useState<Earning | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  useEffect(() => {
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams, tab]);

  useEffect(() => {
    if (appointments.length === 0) return;
    void fetchBookingHistory({
      from: format(addDays(new Date(), -90), 'yyyy-MM-dd'),
      to: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    });
  }, [appointments.length, fetchBookingHistory]);

  const appointmentsById = useMemo(
    () => new Map(appointments.map(appointment => [appointment.id, appointment])),
    [appointments],
  );

  const earnings = useMemo(
    () =>
      bookings
        .filter(booking => EARNING_STATUSES.includes(booking.status))
        .map(booking => {
          const appointment = appointmentsById.get(booking.appointmentId);
          const expectedPayoutDate = getExpectedPayoutDate(booking.date);
          return {
            ...booking,
            appointment,
            serviceName: appointment?.name || booking.appointmentName || 'Service',
            amount: Number(appointment?.price ?? 0),
            expectedPayoutDate,
            settlementStatus:
              expectedPayoutDate > startOfDay(new Date()) ? 'Pending' : 'Settled',
          } satisfies Earning;
        })
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
    [appointmentsById, bookings],
  );

  const pendingEarnings = useMemo(
    () => earnings.filter(earning => earning.settlementStatus === 'Pending'),
    [earnings],
  );

  const payoutHistory = useMemo(() => {
    const groups = new Map<string, Earning[]>();
    for (const earning of earnings) {
      if (earning.settlementStatus !== 'Settled') continue;
      const key = format(earning.expectedPayoutDate, 'yyyy-MM-dd');
      groups.set(key, [...(groups.get(key) ?? []), earning]);
    }

    return Array.from(groups.entries())
      .map(([key, rows]) => ({
        id: key,
        date: parseISO(key),
        amount: rows.reduce((sum, row) => sum + row.amount, 0),
        status: 'Paid' as const,
        earnings: rows,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [earnings]);

  const nextPayout = useMemo<Payout | null>(() => {
    if (pendingEarnings.length === 0) return null;
    const date = pendingEarnings.reduce(
      (soonest, earning) =>
        earning.expectedPayoutDate < soonest ? earning.expectedPayoutDate : soonest,
      pendingEarnings[0].expectedPayoutDate,
    );
    return {
      id: 'next',
      date,
      amount: pendingEarnings.reduce((sum, earning) => sum + earning.amount, 0),
      status: 'Processing',
      earnings: pendingEarnings,
    };
  }, [pendingEarnings]);

  const groupedEarnings = useMemo(() => groupEarningsByDate(earnings), [earnings]);
  const bankAccount = formatBankAccount(business);

  return (
    <div className="min-h-screen bg-background px-5 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-4">
          <Button
            variant="outline"
            className="h-10 rounded-full gap-2"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track your earnings and payouts</p>
          </div>
          <SegmentedToggle value={tab} onChange={setTab} />
        </header>

        {tab === 'earnings' ? (
          <section className="space-y-6">
            {groupedEarnings.length === 0 ? (
              <EmptyState title="No earnings yet" helper="Successful customer payments will appear here." />
            ) : (
              groupedEarnings.map(group => (
                <div key={group.key} className="space-y-1">
                  <DateHeading date={group.date} />
                  <div className="divide-y">
                    {group.items.map(earning => (
                      <EarningRow
                        key={earning.id}
                        earning={earning}
                        onClick={() => setSelectedEarning(earning)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="space-y-7">
            <NextPayoutCard payout={nextPayout} onClick={() => nextPayout && setSelectedPayout(nextPayout)} />
            <p className="text-xs text-muted-foreground">
              Payments are currently settled to your bank account on the next working day.
            </p>
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Payout history</h2>
              {payoutHistory.length === 0 ? (
                <EmptyState title="No paid payouts yet" helper="Completed bank payouts will appear here." />
              ) : (
                <div className="space-y-5">
                  {payoutHistory.map(payout => (
                    <div key={payout.id} className="space-y-1">
                      <p className="text-[13px] font-medium text-muted-foreground">
                        {format(payout.date, 'd MMM')}
                      </p>
                      <PayoutRow
                        bankAccount={bankAccount}
                        payout={payout}
                        onClick={() => setSelectedPayout(payout)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <EarningDetails
        earning={selectedEarning}
        onOpenChange={open => !open && setSelectedEarning(null)}
      />
      <PayoutDetails
        bankAccount={bankAccount}
        payout={selectedPayout}
        onOpenChange={open => !open && setSelectedPayout(null)}
      />
    </div>
  );
};

const SegmentedToggle = ({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (value: Tab) => void;
}) => (
  <div className="grid h-11 w-full grid-cols-2 rounded-full border bg-card p-1">
    {(['earnings', 'payouts'] as const).map(item => (
      <button
        key={item}
        className={cn(
          'rounded-full text-sm font-semibold capitalize transition-colors',
          value === item && 'bg-foreground text-background',
        )}
        onClick={() => onChange(item)}
      >
        {item}
      </button>
    ))}
  </div>
);

const DateHeading = ({ date }: { date: Date }) => (
  <p className="pb-2 text-[13px] font-medium text-muted-foreground">{formatGroupDate(date)}</p>
);

const EarningRow = ({ earning, onClick }: { earning: Earning; onClick: () => void }) => {
  const Icon = getServiceIcon(earning.serviceName);
  return (
    <button
      className="flex min-h-[70px] w-full items-center gap-3 py-3 text-left hover:bg-accent/40"
      onClick={onClick}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{earning.serviceName}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {earning.clientName || 'Customer'}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold">{formatCurrency(earning.amount)}</span>
        <span
          className={cn(
            'mt-0.5 block text-xs font-medium',
            earning.settlementStatus === 'Settled' ? 'text-emerald-600' : 'text-blue-600',
          )}
        >
          {earning.settlementStatus}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
};

const NextPayoutCard = ({
  payout,
  onClick,
}: {
  payout: Payout | null;
  onClick: () => void;
}) => (
  <section className="rounded-2xl border bg-card p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next payout</p>
    <p className="mt-5 text-4xl font-extrabold tracking-tight">
      {formatCurrency(payout?.amount ?? 0)}
    </p>
    <p className="mt-3 text-sm font-medium">
      {payout ? formatRelativePayoutDate(payout.date) : 'No pending payout'}
    </p>
    <p className="mt-1 text-sm text-muted-foreground">
      {payout ? `${payout.earnings.length} earnings included` : 'New earnings will be grouped here.'}
    </p>
    <button
      className="mt-5 text-sm font-semibold text-primary disabled:text-muted-foreground"
      disabled={!payout}
      onClick={onClick}
    >
      View breakdown
    </button>
  </section>
);

const PayoutRow = ({
  bankAccount,
  payout,
  onClick,
}: {
  bankAccount: string;
  payout: Payout;
  onClick: () => void;
}) => (
  <button
    className="flex min-h-[70px] w-full items-center gap-3 border-b py-3 text-left last:border-b-0 hover:bg-accent/40"
    onClick={onClick}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
      <ArrowDownToLine className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-semibold">Bank Payout</span>
      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{bankAccount}</span>
    </span>
    <span className="shrink-0 text-right">
      <span className="block text-[15px] font-semibold">{formatCurrency(payout.amount)}</span>
      <span className={cn('mt-0.5 block text-xs font-medium', payout.status === 'Paid' ? 'text-emerald-600' : 'text-blue-600')}>
        {payout.status}
      </span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </button>
);

const EarningDetails = ({
  earning,
  onOpenChange,
}: {
  earning: Earning | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={Boolean(earning)} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-2xl">
      {earning && (
        <>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <p className="text-xl font-bold">{earning.serviceName}</p>
              <p className="mt-3 text-4xl font-extrabold">{formatCurrency(earning.amount)}</p>
            </div>
            <DetailRows
              rows={[
                ['Customer', earning.clientName || 'Customer'],
                ['Booking', `${format(parseISO(earning.date), 'd MMM')} - ${formatTime(earning.time)}`],
                ['Payment', 'Successful'],
                ['Payout', earning.settlementStatus === 'Settled' ? 'Settled to bank' : 'Pending settlement'],
                ['Expected payout', format(earning.expectedPayoutDate, 'EEEE, d MMMM')],
                ['Payment reference', `AKT-${earning.id}`],
              ]}
            />
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

const PayoutDetails = ({
  bankAccount,
  payout,
  onOpenChange,
}: {
  bankAccount: string;
  payout: Payout | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={Boolean(payout)} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-2xl">
      {payout && (
        <>
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <p className="text-4xl font-extrabold">{formatCurrency(payout.amount)}</p>
              <p className={cn('mt-2 text-sm font-semibold', payout.status === 'Paid' ? 'text-emerald-600' : 'text-blue-600')}>
                {payout.status === 'Paid' ? 'Paid' : 'Pending settlement'}
              </p>
            </div>
            <DetailRows
              rows={[
                ['Expected', format(payout.date, 'd MMMM yyyy')],
                ['Bank account', bankAccount],
                ['Earnings', `${payout.earnings.length}`],
              ]}
            />
            <div className="border-t pt-4">
              <div className="space-y-3">
                {payout.earnings.map(earning => (
                  <div key={earning.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{earning.serviceName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {earning.clientName || 'Customer'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatCurrency(earning.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4 font-bold">
                <span>Total</span>
                <span>{formatCurrency(payout.amount)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

const DetailRows = ({ rows }: { rows: Array<[string, string]> }) => (
  <div className="space-y-3">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-start justify-between gap-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="max-w-[60%] text-right text-sm font-semibold">{value}</span>
      </div>
    ))}
  </div>
);

const EmptyState = ({ title, helper }: { title: string; helper: string }) => (
  <div className="rounded-2xl border border-dashed bg-card p-5 text-center">
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
  </div>
);

const groupEarningsByDate = (earnings: Earning[]) => {
  const groups = new Map<string, Earning[]>();
  for (const earning of earnings) {
    groups.set(earning.date, [...(groups.get(earning.date) ?? []), earning]);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    date: parseISO(key),
    items,
  }));
};

const getExpectedPayoutDate = (date: string) => startOfDay(addBusinessDays(parseISO(date), 1));

const formatGroupDate = (date: Date) => {
  if (isSameDay(date, new Date())) return `Today, ${format(date, 'd MMMM')}`;
  if (isSameDay(date, addDays(new Date(), -1))) return `Yesterday, ${format(date, 'd MMMM')}`;
  return format(date, 'EEEE, d MMMM');
};

const formatRelativePayoutDate = (date: Date) => {
  if (isSameDay(date, new Date())) return 'Expected today';
  if (isSameDay(date, addDays(new Date(), 1))) return 'Tomorrow morning';
  return `Expected ${format(date, 'd MMMM')}`;
};

const formatBankAccount = (business: Business | null) => {
  const bank = business?.bankName?.trim() || 'Bank account';
  const last4 = business?.accountNumber?.slice(-4);
  return last4 ? `${bank} **** ${last4}` : bank;
};

const getServiceIcon = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('hair') || value.includes('cut')) return Scissors;
  if (value.includes('nail') || value.includes('beauty')) return Sparkles;
  if (value.includes('consult') || value.includes('class')) return BookOpenText;
  if (value.includes('training') || value.includes('fitness')) return Dumbbell;
  return BriefcaseBusiness;
};

const formatCurrency = (value: number) =>
  `\u20A6${Number(value || 0).toLocaleString('en-NG')}`;

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default Transactions;
