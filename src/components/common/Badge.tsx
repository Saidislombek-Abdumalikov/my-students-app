import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold rounded-full border transition-colors';

  const variants: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    brand: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dots: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    brand: 'bg-emerald-500',
    neutral: 'bg-slate-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] space-x-1',
    md: 'px-2.5 py-0.5 text-xs space-x-1.5',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />}
      <span>{children}</span>
    </span>
  );
};
