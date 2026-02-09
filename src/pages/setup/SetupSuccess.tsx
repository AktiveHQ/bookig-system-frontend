import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

const SetupSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
      <CheckCircle className="h-16 w-16 text-green-600 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Set up successful</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Your account has been setup, you can now set an appointment
      </p>
      <Button onClick={() => navigate('/dashboard')} className="w-full h-12 rounded-full gap-2">
        Go to dashboard <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SetupSuccess;
