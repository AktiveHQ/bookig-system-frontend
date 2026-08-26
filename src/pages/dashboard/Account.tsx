import { ChevronDown, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Business } from '@/types';

type AccountSection = 'business' | 'bank' | 'payouts' | 'payment' | 'email' | null;

const Account = () => {
  const navigate = useNavigate();
  const { business, setBusiness } = useData();
  const [openSection, setOpenSection] = useState<AccountSection>(null);
  const [savingFeeHandling, setSavingFeeHandling] = useState(false);
  const bookingLink =
    business?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${business.slug}`
      : '';

  const copyBookingLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast({ title: 'Booking page link copied' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const toggleSection = (section: Exclude<AccountSection, null>) => {
    setOpenSection(current => (current === section ? null : section));
  };

  const updateFeeHandling = async (feeHandling: Business['feeHandling']) => {
    if (!business || business.feeHandling === feeHandling || savingFeeHandling) return;

    setSavingFeeHandling(true);
    const result = await setBusiness({ ...business, feeHandling });
    setSavingFeeHandling(false);

    if (!result.ok) {
      toast({
        title: 'Payment setting not saved',
        description: result.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Payment setting updated' });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>

        <section className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground font-bold text-background">
            {(business?.name || 'AB')
              .split(' ')
              .map(part => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold">{business?.name || 'Aktive Barber'}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {[business?.city, business?.country].filter(Boolean).join(', ') || 'Lagos, Nigeria'}
            </p>
          </div>
        </section>

        <AccountGroup
          title="Business"
          items={[
            {
              label: 'Business information',
              expanded: openSection === 'business',
              onClick: () => toggleSection('business'),
              content: (
                <DetailsPanel
                  rows={[
                    ['Business name', business?.name || 'Not set'],
                    ['Business description', business?.businessDescription || business?.description || 'Not set'],
                    ['Country', business?.country || 'Nigeria'],
                    ['State', business?.city || 'Not set'],
                    ['Business address', business?.address || 'Not set'],
                  ]}
                  actionLabel="Edit business details"
                  onAction={() => navigate('/business/edit/details')}
                />
              ),
            },
            { label: 'Services', onClick: () => navigate('/dashboard/services') },
            { label: 'Booking page', onClick: copyBookingLink, trailing: <Copy className="h-4 w-4" /> },
          ]}
        />

        <AccountGroup
          title="Finance"
          items={[
            {
              label: 'Bank account',
              expanded: openSection === 'bank',
              onClick: () => toggleSection('bank'),
              content: (
                <DetailsPanel
                  rows={[
                    ['Bank', business?.bankName || 'Not set'],
                    ['Account number', maskAccountNumber(business?.accountNumber)],
                    ['Account holder', business?.accountHolderName || 'Not set'],
                  ]}
                  actionLabel="Edit bank account"
                  onAction={() => navigate('/business/edit/details')}
                />
              ),
            },
            {
              label: 'Payouts',
              expanded: openSection === 'payouts',
              onClick: () => toggleSection('payouts'),
              content: <PayoutOptions />,
            },
            {
              label: 'Payment settings',
              expanded: openSection === 'payment',
              onClick: () => toggleSection('payment'),
              content: (
                <PaymentSettings
                  feeHandling={business?.feeHandling || 'customer'}
                  saving={savingFeeHandling}
                  onChange={updateFeeHandling}
                />
              ),
            },
          ]}
        />

        <AccountGroup
          title="Notifications"
          items={[
            {
              label: 'Email',
              expanded: openSection === 'email',
              onClick: () => toggleSection('email'),
              content: (
                <DetailsPanel
                  rows={[
                    ['Registered email', business?.email || 'Not set'],
                  ]}
                />
              ),
            },
            { label: 'Reminders' },
            { label: 'WhatsApp' },
          ]}
        />

        <AccountGroup
          title="Account"
          items={[
            { label: 'Profile' },
            { label: 'Security' },
          ]}
        />

        <AccountGroup
          title="Support"
          items={[
            { label: 'Help Center' },
            { label: 'Contact support' },
          ]}
        />
      </main>
    </div>
  );
};

const AccountGroup = ({
  items,
  title,
}: {
  title: string;
  items: Array<{
    label: string;
    onClick?: () => void;
    trailing?: ReactNode;
    expanded?: boolean;
    content?: ReactNode;
  }>;
}) => (
  <section>
    <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {items.map(item => (
        <div key={item.label} className="border-b last:border-b-0">
          <button
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-accent/60"
            onClick={item.onClick}
          >
            <span className="font-medium">{item.label}</span>
            {item.trailing || (
              item.content ? (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    item.expanded && 'rotate-180',
                  )}
                />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </button>
          {item.expanded && item.content && (
            <div className="border-t bg-muted/25 px-4 py-4">{item.content}</div>
          )}
        </div>
      ))}
    </div>
  </section>
);

const DetailsPanel = ({
  actionLabel,
  onAction,
  rows,
}: {
  rows: Array<[string, string]>;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="space-y-4">
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl border bg-background px-3 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
    {actionLabel && onAction && (
      <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

const PaymentSettings = ({
  feeHandling,
  onChange,
  saving,
}: {
  feeHandling: Business['feeHandling'];
  saving: boolean;
  onChange: (feeHandling: Business['feeHandling']) => void;
}) => (
  <div className="space-y-3">
    <p className="text-sm font-semibold">Who pays the service charge?</p>
    {([
      ['customer', 'Customer pays the fee', 'The service charge is added on top of the booking amount.'],
      ['business', 'Business pays the fee', 'The service charge is deducted from your earnings.'],
    ] as const).map(([value, label, helper]) => {
      const selected = feeHandling === value;
      return (
        <button
          key={value}
          type="button"
          className={cn(
            'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
            selected ? 'border-[#020c1a] bg-[#020c1a] text-white' : 'bg-background hover:bg-accent/60',
          )}
          onClick={() => onChange(value)}
          disabled={saving}
        >
          <span className={cn('mt-1 h-4 w-4 rounded-full border', selected && 'border-white bg-white shadow-[inset_0_0_0_4px_#020c1a]')} />
          <span>
            <span className="block text-sm font-semibold">{label}</span>
            <span className={cn('mt-1 block text-xs', selected ? 'text-white/75' : 'text-muted-foreground')}>
              {helper}
            </span>
          </span>
        </button>
      );
    })}
    {saving && (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving payment setting...
      </p>
    )}
  </div>
);

const PayoutOptions = () => (
  <div className="space-y-3">
    <p className="text-sm font-semibold">Payout schedule</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {['Next working day', 'Daily', 'Weekly', 'Monthly', 'Custom'].map(option => (
        <button
          key={option}
          type="button"
          disabled
          className="rounded-xl border bg-muted px-3 py-3 text-left text-sm font-medium text-muted-foreground opacity-70"
        >
          {option}
        </button>
      ))}
    </div>
    <p className="text-xs text-muted-foreground">Payout schedule changes are not ready yet.</p>
  </div>
);

const maskAccountNumber = (accountNumber?: string) => {
  if (!accountNumber) return 'Not set';
  const last4 = accountNumber.slice(-4);
  return last4 ? `**** ${last4}` : 'Not set';
};

export default Account;
