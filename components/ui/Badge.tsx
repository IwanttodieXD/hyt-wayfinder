import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

const TONES: Record<BadgeTone, string> = {
  brand:
    'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  success:
    'bg-green-500/15 text-green-300 border-green-500/30',
  warning:
    'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  neutral: 'bg-navy-800 text-navy-300 border-navy-600/60',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: string;
  children: ReactNode;
  className?: string;
  /** Adds a small leading status dot instead of an icon. */
  dot?: boolean;
}

export default function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        TONES[tone],
        className
      )}
    >
      {dot && <span className='h-1.5 w-1.5 rounded-full bg-current' />}
      {icon && <i className={`fa-solid ${icon}`}></i>}
      {children}
    </span>
  );
}
