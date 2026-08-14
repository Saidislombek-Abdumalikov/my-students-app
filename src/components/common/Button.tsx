import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm focus:ring-emerald-500 active:scale-[0.98]',
    secondary: 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm focus:ring-slate-400 active:scale-[0.98]',
    outline: 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold focus:ring-emerald-500 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm focus:ring-rose-500 active:scale-[0.98]',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm focus:ring-emerald-500 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs space-x-1.5',
    md: 'px-4 py-2 text-sm space-x-2',
    lg: 'px-5 py-2.5 text-base space-x-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
