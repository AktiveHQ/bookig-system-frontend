import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import PasswordInput from '@/components/shared/PasswordInput';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, getPostAuthRedirect } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate(await getPostAuthRedirect());
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        toast({ title: 'Account does not exist', description: 'Create an account to get started.', variant: 'destructive' });
      } else {
        toast({ title: 'Login failed', description: error?.message || 'Please try again.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(await getPostAuthRedirect());
    } catch (error: any) {
      if (error?.code === 'auth/backend-user-not-found') {
        toast({
          title: 'Account not registered',
          description: 'Sign up with Google first, then you can continue here.',
          variant: 'destructive',
        });
        navigate('/signup');
      } else {
        toast({ title: 'Google login failed', description: error?.message || 'Please try again.', variant: 'destructive' });
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
              <PasswordInput
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

            <Button type="submit" className="w-full h-12 rounded-xl border-0 bg-[#020c1a] gap-2 hover:bg-[#06162b]" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-[#020c1a] bg-white justify-center gap-3 text-[#020c1a] hover:bg-[#020c1a]/5 hover:text-[#020c1a]"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            <GoogleLogo />
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
