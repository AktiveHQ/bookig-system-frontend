import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { clearAdminToken, getAdminAuthHeaderOrThrow } from '@/lib/admin-auth';
import { toast } from '@/hooks/use-toast';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://booking-system-backend-h7ho.onrender.com'
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
        className="w-full max-w-sm rounded-2xl border object-cover"
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

const APPROVED_TEMPLATE =
  'You have been cleared and can start making appointments.';
const REUPLOAD_TEMPLATE =
  "Your CAC document isn't clear. Please reupload again.";
const FREEZE_TEMPLATE =
  'Your account has been temporarily frozen. Please contact support.';
const UNFREEZE_TEMPLATE =
  'Your account has been restored. You can continue using the dashboard.';

const BusinessReview = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [notifyMessage, setNotifyMessage] = useState(APPROVED_TEMPLATE);

  const canReview = useMemo(() => Boolean(id && Number(id)), [id]);

  useEffect(() => {
    if (!canReview) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const json = await adminFetch(`/admin/businesses/${id}`);
        if (!active) return;
        setBusiness(json);
        setComment(json?.verificationComment || '');
      } catch (error) {
        console.error('Failed to load business review', error);
        toast({
          title: 'Load failed',
          description: 'Unable to load business record.',
          variant: 'destructive',
        });
        if (active) setBusiness(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
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
      setBusiness(updated);
      toast({ title: 'Saved', description: 'Verification review saved.' });
      navigate('/admin');
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
      navigate('/admin');
    } catch (error) {
      console.error('Failed to update freeze status', error);
      toast({
        title: 'Action failed',
        description: 'Unable to update account status.',
        variant: 'destructive',
      });
    }
  };

  if (!canReview) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Invalid business id.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
        <BackButton onClick={() => navigate('/admin')} />
        <p className="mt-8 text-sm text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/admin')} />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Status: <span className="font-medium text-foreground">{business.verificationStatus}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="border rounded-2xl p-4 space-y-2">
            <p className="text-sm font-medium">Business details</p>
            <p className="text-sm text-muted-foreground">Email: {business.contactEmail}</p>
            <p className="text-sm text-muted-foreground">Phone: {business.contactPhone || '—'}</p>
            <p className="text-sm text-muted-foreground">
              Address: {[business.address, business.city, business.country].filter(Boolean).join(', ') || '—'}
            </p>
            <p className="text-sm text-muted-foreground">ID type: {business.idVerificationType || '—'}</p>
            {business.owner && (
              <p className="text-sm text-muted-foreground">
                Owner status: {business.owner.isFrozen ? 'Frozen' : 'Active'}
              </p>
            )}
          </div>

          <div className="border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">Admin comment (internal)</p>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Leave a note for audit/history..."
              className="rounded-xl min-h-[90px]"
            />
          </div>

          <div className="border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">Message to user (popup)</p>
            <Input
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              className="h-12 rounded-xl"
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setNotifyMessage(APPROVED_TEMPLATE)}
              >
                Approved template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setNotifyMessage(REUPLOAD_TEMPLATE)}
              >
                Reupload template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setNotifyMessage(FREEZE_TEMPLATE)}
              >
                Freeze template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setNotifyMessage(UNFREEZE_TEMPLATE)}
              >
                Unfreeze template
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="h-12 rounded-full" onClick={() => submitReview('APPROVED')}>
              Approve & send
            </Button>
            <Button
              variant="destructive"
              className="h-12 rounded-full"
              onClick={() => submitReview('REJECTED')}
            >
              Reject & send
            </Button>
          </div>

          <div className="border rounded-2xl p-4">
            <p className="text-sm font-medium mb-3">Account control</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full"
                onClick={() => setFreeze(true)}
              >
                Freeze account
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setFreeze(false)}
              >
                Unfreeze account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Freezing blocks the owner from using dashboard APIs until unfrozen.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">ID document</p>
            {renderDoc(business.idDocumentData, 'ID document')}
          </div>
          <div className="border rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium">CAC document</p>
            {renderDoc(business.cacDocumentData, 'CAC document')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessReview;
