import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BadgeTone } from './Badge';

const ICON_TONES: Record<BadgeTone, string> = {
  brand: 'bg-yellow-500/15 text-yellow-400',
  success: 'bg-green-500/15 text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  danger: 'bg-red-500/15 text-red-400',
  info: 'bg-blue-500/15 text-blue-400',
  neutral: 'bg-navy-800 text-navy-300',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
  tone?: BadgeTone;
  className?: string;
  /** `lg` is a slightly roomier tile for headline dashboards. */
  size?: 'md' | 'lg';
  /** Optional control (for example a bulk action) shown under the hint. */
  action?: ReactNode;
}

/** Compact metric tile used in dashboards and summary panels. */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  className,
  size = 'md',
  action,
}: StatCardProps) {
  const isLarge = size === 'lg';

  return (
    <div
      className={cn(
        'rounded-2xl border border-navy-700/80 bg-navy-900/90',
        isLarge ? 'p-5' : 'p-4',
        className
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <p
          className={cn(
            'font-semibold uppercase tracking-wide text-navy-400',
            isLarge ? 'text-xs' : 'text-[11px]'
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'flex flex-shrink-0 items-center justify-center rounded-lg',
              isLarge ? 'h-9 w-9' : 'h-8 w-8',
              ICON_TONES[tone]
            )}
          >
            <i
              className={cn(
                'fa-solid',
                icon,
                isLarge ? 'text-sm' : 'text-xs'
              )}
            ></i>
          </span>
        )}
      </div>
      <p
        className={cn(
          'font-bold leading-none text-white tabular-nums',
          isLarge ? 'mt-3 text-3xl' : 'mt-2 text-2xl'
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            'text-navy-400',
            isLarge ? 'mt-2 text-xs' : 'mt-1.5 text-xs'
          )}
        >
          {hint}
        </p>
      )}
      {action && <div className='mt-3'>{action}</div>}
    </div>
  );
}
