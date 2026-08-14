import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  glass = true,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl p-5 border border-slate-200/80 bg-white text-slate-900 shadow-sm transition-all duration-200',
          hoverable && 'hover:shadow-md hover:border-emerald-500/50 cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
