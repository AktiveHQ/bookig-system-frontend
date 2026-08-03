import type * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

const PasswordInput = ({ className, ...props }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = showPassword ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={cn('pr-12', className)}
      />
      <button
        type="button"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword(value => !value)}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default PasswordInput;
