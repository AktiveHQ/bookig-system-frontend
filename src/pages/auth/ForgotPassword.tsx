import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BackButton from '@/components/shared/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast({ title: 'Reset link sent!', description: 'Check your email for the password reset link.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Could not send reset email.', variant: 'destructive' });
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
            <h1 className="text-2xl font-bold">Forgot password?</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-accent flex items-center justify-center">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>. Check your inbox.
              </p>
              <Button variant="outline" className="w-full h-12 rounded-full" onClick={() => navigate('/login')}>
                Back to login
              </Button>
            </div>
          ) : (
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

              <Button type="submit" className="w-full h-12 rounded-full gap-2" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
