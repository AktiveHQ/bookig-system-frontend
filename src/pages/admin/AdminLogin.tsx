import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_BASE, checkServerReachable, fetchWithTimeout, getErrorMessage, isServerConnectivityError } from '@/lib/api-diagnostics';
import { ArrowRight, TimerReset, Wifi } from 'lucide-react';
import { setAdminToken } from '@/lib/admin-auth';

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!loading) return;
    setElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setElapsedSeconds(seconds => seconds + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('Checking server connection...');
    try {
      await checkServerReachable();
      setStatusMessage('Server reached. Signing in...');
      const response = await fetchWithTimeout(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || 'Login failed');
      }
      const json = await response.json();
      if (!json?.token) {
        throw new Error('Login failed');
      }
      setAdminToken(String(json.token), json.expiresAt ? String(json.expiresAt) : null);
      navigate('/admin');
    } catch (error: unknown) {
      if (isServerConnectivityError(error)) {
        toast({
          title: 'Server connection issue',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <BackButton />

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Admin login</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to review business setup submissions
            </p>
          </div>

          {loading && (
            <Alert className="rounded-xl">
              <TimerReset className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between gap-3">
                <span>{statusMessage || 'Signing in...'}</span>
                <span className="font-mono text-xs">{formatElapsed(elapsedSeconds)}</span>
              </AlertTitle>
              <AlertDescription className="flex items-center gap-2 text-xs">
                <Wifi className="h-3.5 w-3.5" />
                Checking API: {API_BASE}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@email.com"
                required
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 rounded-xl"
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-full gap-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Need an admin account?{' '}
            <button onClick={() => navigate('/admin/create')} className="underline">
              Create one
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Not an admin?{' '}
            <button onClick={() => navigate('/login')} className="underline">
              Go to user login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
