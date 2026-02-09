import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, fullName);
      toast({ title: 'Account created!', description: 'Let\'s set up your business.' });
      navigate('/setup');
    } catch (error: any) {
      toast({ title: 'Signup failed', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <BackButton />
        <h2 className="text-lg font-semibold">Booking System</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Let's get you set up in a few steps
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="h-12 rounded-xl"
              />
            </div>

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
              <label className="text-sm font-medium">Create password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="h-12 rounded-xl"
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-full gap-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold text-foreground underline">
              Sign in
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

export default Signup;
