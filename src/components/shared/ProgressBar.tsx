import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const ProgressBar = ({ currentStep, totalSteps, labels }: ProgressBarProps) => {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i <= currentStep ? 'bg-foreground' : 'bg-border'
            )}
          />
        ))}
      </div>
      {labels && labels[currentStep] && (
        <p className="text-xs text-muted-foreground">{labels[currentStep]}</p>
      )}
    </div>
  );
};

export default ProgressBar;
