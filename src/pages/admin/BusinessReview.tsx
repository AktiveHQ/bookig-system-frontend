import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CalendarCheck, CircleDollarSign, Files, Trash2 } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { clearAdminToken, getAdminAuthHeaderOrThrow } from '@/lib/admin-auth';
import { toast } from '@/hooks/use-toast';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

async function adminFetch(path: string, init?: RequestInit) {
  const authHeader = getAdminAuthHeaderOrThrow();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) {
      clearAdminToken();
    }
    throw new Error(`API ${response.status}: ${path}${body ? `\n${body.slice(0, 800)}` : ''}`);
  }
  return response.json();
}

type VendorStats = {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalServices: number;
  activeServices: number;
  totalEarnings: number;
  grossPayments: number;
  platformFees: number;
  currency: string;
};

type AdminService = {
  id: number;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  maxBookingsPerSlot: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
};

type AdminBusiness = {
  id: number;
  ownerId: number;
  owner?: {
    id: number;
    email: string;
    isFrozen: boolean;
    frozenAt: string | null;
    frozenReason: string | null;
  };
  name: string;
  bookingSlug: string;
  contactEmail: string;
  contactPhone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  idVerificationType: 'NIN' | 'PASSPORT' | 'VOTERS_CARD' | null;
  idDocumentData: string | null;
  cacDocumentData: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationComment: string | null;
  verificationSubmittedAt: string | null;
  verificationReviewedAt: string | null;
  verificationReviewedByUid: string | null;
  stats?: VendorStats;
  services?: AdminService[];
};

const renderDoc = (dataUrl: string | null, label: string) => {
  if (!dataUrl) {
    return <p className="text-sm text-muted-foreground">No document uploaded.</p>;
  }
  if (dataUrl.startsWith('data:image/')) {
    return (
      <img
        src={dataUrl}
        alt={`${label} preview`}
        className="w-full max-w-sm rounded-xl border object-cover"
      />
    );
  }
  if (dataUrl.startsWith('data:application/pdf')) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">PDF uploaded.</p>
        <a href={dataUrl} target="_blank" rel="noreferrer" className="underline text-sm">
          Open PDF
        </a>
      </div>
    );
  }
  return (
    <a href={dataUrl} target="_blank" rel="noreferrer" className="underline text-sm">
      Open document
    </a>
  );
};

const APPROVED_TEMPLATE = 'You have been cleared and can start making appointments.';
const REUPLOAD_TEMPLATE = "Your CAC document isn't clear. Please reupload again.";
const FREEZE_TEMPLATE = 'Your account has been temporarily frozen. Please contact support.';
const UNFREEZE_TEMPLATE = 'Your account has been restored. You can continue using the dashboard.';

const emptyStats: VendorStats = {
  totalBookings: 0,
  confirmedBookings: 0,
  pendingBookings: 0,
  totalServices: 0,
  activeServices: 0,
  totalEarnings: 0,
  grossPayments: 0,
  platformFees: 0,
  currency: 'NGN',
};

const BusinessReview = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [notifyMessage, setNotifyMessage] = useState(APPROVED_TEMPLATE);
  const [actionLoading, setActionLoading] = useState(false);

  const canReview = useMemo(() => Boolean(id && Number(id)), [id]);
  const stats = business?.stats ?? emptyStats;

  const loadBusiness = async () => {
    if (!canReview) return;
    setLoading(true);
    try {
      const json = await adminFetch(`/admin/businesses/${id}`);
      setBusiness(json);
      setComment(json?.verificationComment || '');
    } catch (error) {
      console.error('Failed to load business review', error);
      toast({
        title: 'Load failed',
        description: 'Unable to load business record.',
        variant: 'destructive',
      });
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBusiness();
  }, [canReview, id]);

  const submitReview = async (status: AdminBusiness['verificationStatus']) => {
    if (!business) return;
    try {
      const payload = {
        status,
        comment: comment || undefined,
        notifyType: status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'warning' : 'info',
        notifyMessage: notifyMessage || undefined,
      };
      const updated = await adminFetch(`/admin/businesses/${business.id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setBusiness(prev => (prev ? { ...prev, ...updated } : updated));
      toast({ title: 'Saved', description: 'Verification review saved.' });
    } catch (error) {
      console.error('Failed to review verification', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save verification review.',
        variant: 'destructive',
      });
    }
  };

  const setFreeze = async (frozen: boolean) => {
    if (!business) return;
    try {
      const payload = {
        reason: frozen ? comment || undefined : undefined,
        notifyType: frozen ? 'warning' : 'success',
        notifyMessage: notifyMessage || undefined,
      };
      await adminFetch(
        `/admin/businesses/${business.id}/${frozen ? 'freeze-owner' : 'unfreeze-owner'}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      toast({ title: frozen ? 'Account frozen' : 'Account unfrozen' });
      await loadBusiness();
    } catch (error) {
      console.error('Failed to update freeze status', error);
      toast({
        title: 'Action failed',
        description: 'Unable to update account status.',
        variant: 'destructive',
      });
    }
  };

  const clearVendorData = async (target: 'bookings' | 'services') => {
    if (!business) return;
    const label = target === 'bookings' ? 'all bookings' : 'all bookings and services';
    const confirmed = window.confirm(`Clear ${label} for ${business.name}? This cannot be undone.`);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const result = await adminFetch(`/admin/businesses/${business.id}/${target}`, {
        method: 'DELETE',
      });
      toast({
        title: target === 'bookings' ? 'Bookings cleared' : 'Services cleared',
        description:
          target === 'bookings'
            ? `${result.deletedBookings ?? 0} bookings removed.`
            : `${result.deletedServices ?? 0} services and ${result.deletedBookings ?? 0} bookings removed.`,
      });
      await loadBusiness();
    } catch (error) {
      console.error('Failed to clear vendor data', error);
      toast({
        title: 'Clear failed',
        description: 'Unable to clear this vendor data.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!canReview) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Invalid business id.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/admin')} />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {business.contactEmail} - {business.bookingSlug} - {business.verificationStatus}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10 rounded-full"
          onClick={() => window.open(`/booking/${business.bookingSlug}`, '_blank')}
        >
          Public preview
        </Button>
      </div>

      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total earnings</p>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {stats.currency} {Number(stats.totalEarnings).toLocaleString()}
          </p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total bookings</p>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.totalBookings}</p>
          <p className="text-xs text-muted-foreground">{stats.confirmedBookings} confirmed</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Services created</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.totalServices}</p>
          <p className="text-xs text-muted-foreground">{stats.activeServices} active</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Platform fees</p>
            <Files className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {stats.currency} {Number(stats.platformFees).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Vendor details</p>
            <p className="text-sm text-muted-foreground">Owner: {business.owner?.email || `Owner #${business.ownerId}`}</p>
            <p className="text-sm text-muted-foreground">Phone: {business.contactPhone || '-'}</p>
            <p className="text-sm text-muted-foreground">
              Address: {[business.address, business.city, business.country].filter(Boolean).join(', ') || '-'}
            </p>
            <p className="text-sm text-muted-foreground">ID type: {business.idVerificationType || '-'}</p>
            <p className="text-sm text-muted-foreground">
              Owner status: {business.owner?.isFrozen ? 'Frozen' : 'Active'}
            </p>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-sm font-medium">Services</p>
            </div>
            {(business.services ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No services created.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(business.services ?? []).map(service => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{service.status}</TableCell>
                      <TableCell className="text-right text-sm">
                        {service.currency} {Number(service.priceAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">{service.durationMinutes} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Admin comment</p>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Leave a note for audit/history..."
              className="rounded-xl min-h-[90px]"
            />
          </div>

          <div className="border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Message to user</p>
            <Input
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              className="h-12 rounded-xl"
            />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setNotifyMessage(APPROVED_TEMPLATE)}>
                Approved template
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setNotifyMessage(REUPLOAD_TEMPLATE)}>
                Reupload template
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setNotifyMessage(FREEZE_TEMPLATE)}>
                Freeze template
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setNotifyMessage(UNFREEZE_TEMPLATE)}>
                Unfreeze template
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button className="h-12 rounded-full" onClick={() => submitReview('APPROVED')}>
              Approve & send
            </Button>
            <Button variant="destructive" className="h-12 rounded-full" onClick={() => submitReview('REJECTED')}>
              Reject & send
            </Button>
            <Button variant="outline" className="h-12 rounded-full" onClick={() => setFreeze(false)}>
              Unfreeze
            </Button>
            <Button variant="destructive" className="h-12 rounded-full" onClick={() => setFreeze(true)}>
              Freeze
            </Button>
          </div>

          <div className="border rounded-xl p-4">
            <p className="text-sm font-medium mb-3">Data controls</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full gap-2"
                disabled={actionLoading}
                onClick={() => clearVendorData('bookings')}
              >
                <Trash2 className="h-4 w-4" />
                Clear bookings
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full gap-2"
                disabled={actionLoading}
                onClick={() => clearVendorData('services')}
              >
                <Trash2 className="h-4 w-4" />
                Clear bookings & services
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">ID document</p>
            {renderDoc(business.idDocumentData, 'ID document')}
          </div>
          <div className="border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">CAC document</p>
            {renderDoc(business.cacDocumentData, 'CAC document')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessReview;
