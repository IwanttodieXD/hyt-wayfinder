import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a little more breathing room by default. */
  padded?: boolean;
}

/**
 * The base surface used across the trainee experience.
 *
 * `bg-navy-900` and `border-navy-700` are theme tokens: in light mode they
 * resolve to a white panel with a soft blue border, so the same markup works in
 * both themes without a second palette.
 */
export default function Card({
  children,
  className,
  padded = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-navy-700/80 bg-navy-900/90',
        padded && 'p-5 sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}

/** Card with a compact section heading, used by the longer forms. */
export function SectionCard({
  title,
  description,
  icon,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn('space-y-5', className)}>
      <div className='flex items-start gap-3'>
        {icon && (
          <span className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400'>
            <i className={`fa-solid ${icon} text-sm`}></i>
          </span>
        )}
        <div className='min-w-0'>
          <h2 className='text-sm font-semibold text-white'>{title}</h2>
          {description && (
            <p className='mt-0.5 text-xs leading-relaxed text-navy-400'>
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}
