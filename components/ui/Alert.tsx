import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<
  AlertTone,
  { box: string; icon: string; iconClass: string }
> = {
  info: {
    box: 'border-blue-500/30 bg-blue-500/10',
    icon: 'fa-circle-info',
    iconClass: 'text-blue-300',
  },
  success: {
    box: 'border-green-500/30 bg-green-500/10',
    icon: 'fa-circle-check',
    iconClass: 'text-green-300',
  },
  warning: {
    box: 'border-yellow-500/30 bg-yellow-500/10',
    icon: 'fa-triangle-exclamation',
    iconClass: 'text-yellow-300',
  },
  danger: {
    box: 'border-red-500/30 bg-red-500/10',
    icon: 'fa-circle-exclamation',
    iconClass: 'text-red-300',
  },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
  icon?: string;
  role?: 'status' | 'alert';
}

export default function Alert({
  tone = 'info',
  title,
  children,
  className,
  icon,
  role = 'status',
}: AlertProps) {
  const style = TONES[tone];

  return (
    <div
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        style.box,
        className
      )}
    >
      <i
        className={cn(
          'fa-solid mt-0.5 flex-shrink-0',
          icon ?? style.icon,
          style.iconClass
        )}
      ></i>
      <div className='min-w-0'>
        {title && <p className='font-semibold text-white'>{title}</p>}
        <div className={cn('text-navy-300', title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  );
}
