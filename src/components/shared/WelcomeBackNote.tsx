import { useAuth } from '@/contexts/AuthContext';

const WelcomeBackNote = () => {
  const { user } = useAuth();
  const displayName = user?.displayName?.trim() || 'there';

  return (
    <div className="mb-4 rounded-xl border bg-accent/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Welcome back</p>
      <p className="text-sm font-medium">{displayName}</p>
    </div>
  );
};

export default WelcomeBackNote;
