'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border border-yellow-500/50',
  secondary:
    'bg-navy-800 text-white hover:bg-navy-700 border border-navy-700',
  ghost:
    'bg-transparent text-navy-200 hover:bg-navy-800 hover:text-white border border-transparent',
  danger:
    'bg-red-600 text-paper hover:bg-red-500 border border-red-500/30',
  quiet:
    'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/30',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-xl gap-2',
};

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:pointer-events-none disabled:opacity-50';

/** Class string for links styled as buttons. */
export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  children?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonStyles(variant, size, className)}
      {...props}
    >
      {loading ? (
        <i className='fa-solid fa-spinner fa-spin text-xs'></i>
      ) : icon ? (
        <i className={`fa-solid ${icon} text-xs`}></i>
      ) : null}
      {children}
    </button>
  );
}
