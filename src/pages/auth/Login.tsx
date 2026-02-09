import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
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
    </div>
  );
};

export default Login;
