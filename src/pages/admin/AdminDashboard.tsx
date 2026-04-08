import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BackButton from '@/components/shared/BackButton';
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
  }, []);

  const pendingCount = useMemo(
    () => rows.filter(r => r.verificationStatus === 'PENDING').length,
    [rows]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
        <BackButton />
        <p className="mt-8 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review business setup submissions ({pendingCount} pending)
        </p>
        <div className="mt-4">
          <Button variant="outline" className="h-10 rounded-full" onClick={() => navigate('/admin/create')}>
            Create admin account
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground">No businesses found.</p>
        </div>
      ) : (
        <div className="border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {row.verificationSubmittedAt ? new Date(row.verificationSubmittedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => navigate(`/admin/businesses/${row.id}`)}
                    >
                      Review
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
