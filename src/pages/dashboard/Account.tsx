import { ChevronRight, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';

const Account = () => {
  const navigate = useNavigate();
  const { business } = useData();
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
            { label: 'Business information', onClick: () => navigate('/business/edit/details') },
            { label: 'Services', onClick: () => navigate('/dashboard/bookings') },
            { label: 'Booking page', onClick: copyBookingLink, trailing: <Copy className="h-4 w-4" /> },
          ]}
        />

        <AccountGroup
          title="Finance"
          items={[
            { label: 'Bank account', onClick: () => navigate('/business/edit/details') },
            { label: 'Payouts' },
            { label: 'Payment settings' },
          ]}
        />

        <AccountGroup
          title="Notifications"
          items={[
            { label: 'Email' },
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
  items: Array<{ label: string; onClick?: () => void; trailing?: ReactNode }>;
}) => (
  <section>
    <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {items.map(item => (
        <button
          key={item.label}
          className="flex w-full items-center justify-between gap-3 border-b px-4 py-4 text-left last:border-b-0 hover:bg-accent/60"
          onClick={item.onClick}
        >
          <span className="font-medium">{item.label}</span>
          {item.trailing || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      ))}
    </div>
  </section>
);

export default Account;
