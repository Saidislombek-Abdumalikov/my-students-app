import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Loading...',
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className={twMerge(clsx('flex flex-col items-center justify-center p-8 space-y-3 text-slate-500', className))}>
      <Loader2 className={clsx('animate-spin text-emerald-600', sizes[size])} />
      {label && <p className="text-xs font-bold tracking-wide text-slate-500 animate-pulse">{label}</p>}
    </div>
  );
};
