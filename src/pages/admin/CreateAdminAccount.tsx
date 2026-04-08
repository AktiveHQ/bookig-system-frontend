import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { getAdminAuthHeaderOrThrow } from '@/lib/admin-auth';

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
    throw new Error(`API ${response.status}: ${path}${body ? `\n${body.slice(0, 800)}` : ''}`);
  }
  return response.json();
}

const CreateAdminAccount = () => {
  const navigate = useNavigate();

  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminFetch('/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify({
          email: createEmail,
          fullName: createFullName,
          password: createPassword,
        }),
      });
      toast({ title: 'Admin created', description: 'The admin can now log in via /admin/login.' });
      navigate('/admin');
    } catch (error: any) {
      console.error('[CreateAdminAccount] create admin failed', error);
      if (error?.message === 'Not authenticated') {
        toast({
          title: 'Admin login required',
          description: 'Please log in at /admin/login first.',
          variant: 'destructive',
        });
        navigate('/admin/login');
        return;
      }
      toast({ title: 'Create failed', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapping(true);
    try {
      const response = await fetch(`${API_BASE}/admin/auth/bootstrap-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bootstrap-key': bootstrapKey,
        },
        body: JSON.stringify({
          email: createEmail,
          fullName: createFullName,
          password: createPassword,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!json?.ok || !json?.token) {
        throw new Error(json?.message || 'Bootstrap failed');
      }
      // Store token and continue.
      localStorage.setItem('admin_token', String(json.token));
      toast({ title: 'Admin created', description: 'You are now logged in as admin.' });
      navigate('/admin');
    } catch (error: any) {
      console.error('[CreateAdminAccount] bootstrap admin failed', error);
      toast({
        title: 'Bootstrap failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onClick={() => navigate('/admin')} />
      </div>

      <div className="space-y-8 flex-1">
        <div>
          <h1 className="text-2xl font-bold">Create admin account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new admin or promote an existing user.
          </p>
        </div>

        <div className="border rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Create new admin</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={createFullName}
                onChange={e => setCreateFullName(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={createEmail}
                onChange={e => setCreateEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Temporary password</label>
              <Input
                type="password"
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button type="submit" className="w-full h-12 rounded-full" disabled={creating}>
              {creating ? 'Creating...' : 'Create admin'}
            </Button>
          </form>
          <form onSubmit={handleBootstrap} className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bootstrap key (first admin only)</label>
              <Input
                value={bootstrapKey}
                onChange={e => setBootstrapKey(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Set ADMIN_BOOTSTRAP_KEY in backend .env"
              />
              <p className="text-xs text-muted-foreground">
                Use this only once to create the very first admin on a fresh database.
              </p>
            </div>
            <Button type="submit" variant="outline" className="w-full h-12 rounded-full" disabled={bootstrapping}>
              {bootstrapping ? 'Bootstrapping...' : 'Bootstrap first admin'}
            </Button>
          </form>
        </div>

        <div className="border rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-1">Tip</h2>
          <p className="text-sm text-muted-foreground">
            Admin accounts are local-only for now (no Firebase). Create each admin here with an email + password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminAccount;
