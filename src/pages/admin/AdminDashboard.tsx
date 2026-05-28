import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, CalendarCheck, CircleDollarSign } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

type AdminBusinessSummary = {
  id: number;
  ownerId: number;
  ownerEmail: string | null;
  name: string;
  bookingSlug: string;
  contactEmail: string;
  country: string | null;
  city: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationSubmittedAt: string | null;
  verificationReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: VendorStats;
};

const statusPill = (status: AdminBusinessSummary['verificationStatus']) => {
  if (status === 'APPROVED') return 'bg-foreground text-background';
  if (status === 'REJECTED') return 'bg-destructive text-destructive-foreground';
  return 'bg-muted text-muted-foreground';
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminBusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const json = await adminFetch('/admin/businesses');
        const list = Array.isArray(json) ? json : json?.items ?? [];
        if (!active) return;
        setRows(list);
      } catch (error) {
        console.error('Failed to load admin businesses', error);
        if (active) setRows([]);
        toast({
          title: 'Admin access required',
          description: 'You are not allowed to view the admin dashboard.',
          variant: 'destructive',
        });
        navigate('/admin/login');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [navigate]);

  const pendingCount = useMemo(
    () => rows.filter(r => r.verificationStatus === 'PENDING').length,
    [rows]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const stats = row.stats;
          acc.totalBusinesses += 1;
          acc.totalBookings += Number(stats?.totalBookings ?? 0);
          acc.totalServices += Number(stats?.totalServices ?? 0);
          acc.totalEarnings += Number(stats?.totalEarnings ?? 0);
          acc.currency = stats?.currency || acc.currency;
          return acc;
        },
        {
          totalBusinesses: 0,
          totalBookings: 0,
          totalServices: 0,
          totalEarnings: 0,
          currency: 'NGN',
        }
      ),
    [rows]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
        <BackButton />
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review vendors, documents, bookings, services, and earnings ({pendingCount} pending)
        </p>
        <div className="mt-4">
          <Button variant="outline" className="h-10 rounded-full" onClick={() => navigate('/admin/create')}>
            Create admin account
          </Button>
        </div>
      </div>

      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Vendors</p>
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.totalBusinesses}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Bookings</p>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.totalBookings}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Services</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{totals.totalServices}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Vendor earnings</p>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {totals.currency} {totals.totalEarnings.toLocaleString()}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border rounded-xl p-6">
          <p className="text-sm text-muted-foreground">No businesses found.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Services</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{row.name}</span>
                      <span className="text-xs text-muted-foreground">{row.contactEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.ownerEmail || `Owner #${row.ownerId}`}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${statusPill(row.verificationStatus)}`}>
                      {row.verificationStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.stats?.totalBookings ?? 0}
                    <span className="block text-xs text-muted-foreground">
                      {row.stats?.confirmedBookings ?? 0} confirmed
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.stats?.totalServices ?? 0}
                    <span className="block text-xs text-muted-foreground">
                      {row.stats?.activeServices ?? 0} active
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {row.stats?.currency ?? 'NGN'} {Number(row.stats?.totalEarnings ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => navigate(`/admin/businesses/${row.id}`)}
                    >
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
