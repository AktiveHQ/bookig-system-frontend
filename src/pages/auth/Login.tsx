import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { API_BASE, checkServerReachable, getErrorCode, getErrorMessage, isServerConnectivityError } from '@/lib/api-diagnostics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, TimerReset, Wifi } from 'lucide-react';

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, getPostAuthRedirect } = useAuth();
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
    setStatusMessage('Signing in...');
    try {
      await login(email, password);
      setStatusMessage('Checking server connection...');
      await checkServerReachable();
      setStatusMessage('Server reached. Opening your dashboard...');
      navigate(await getPostAuthRedirect());
    } catch (error: unknown) {
      if (getErrorCode(error) === 'auth/user-not-found') {
        toast({ title: 'Account does not exist', description: 'Create an account to get started.', variant: 'destructive' });
      } else if (isServerConnectivityError(error)) {
        toast({ title: 'Server connection issue', description: getErrorMessage(error), variant: 'destructive' });
      } else {
        toast({ title: 'Login failed', description: getErrorMessage(error), variant: 'destructive' });
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setStatusMessage('Opening Google sign-in...');
    try {
      await loginWithGoogle();
      setStatusMessage('Checking server connection...');
      await checkServerReachable();
      setStatusMessage('Server reached. Opening your dashboard...');
      navigate(await getPostAuthRedirect());
    } catch (error: unknown) {
      if (getErrorCode(error) === 'auth/backend-user-not-found') {
        toast({
          title: 'Account not registered',
          description: 'Sign up with Google first, then you can continue here.',
          variant: 'destructive',
        });
        navigate('/signup');
      } else if (isServerConnectivityError(error)) {
        toast({ title: 'Server connection issue', description: getErrorMessage(error), variant: 'destructive' });
      } else {
        toast({ title: 'Google login failed', description: getErrorMessage(error), variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <BackButton />

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your email address to continue
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
                placeholder="you@email.com"
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

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full h-12 rounded-full gap-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-full"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="font-semibold text-foreground underline">
              Sign up
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to AktiveHq's{' '}
            <span className="underline">Terms of Service and Privacy Policy</span>
          </p>
        </div>
      </div>

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        <p>Powered by AktiveHQ</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button className="hover:text-foreground" onClick={() => navigate('/privacy-policy')}>
            Privacy Policy
          </button>
          <span aria-hidden="true">|</span>
          <button className="hover:text-foreground" onClick={() => navigate('/terms')}>
            Terms
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Login;
