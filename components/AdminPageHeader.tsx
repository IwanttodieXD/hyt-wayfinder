import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AdminPageHeaderProps {
  /** Small label above the title, e.g. the current date or a section name. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Page-level controls (export, add, live badge) aligned to the right. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Uniform opening block for every admin screen.
 *
 * The shell owns the brand bar and navigation; this owns the page identity, so
 * titles, spacing and action alignment cannot drift between pages.
 */
export default function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in motion-reduce:animate-none sm:mb-8',
        className
      )}
    >
      <div className='min-w-0'>
        {eyebrow && (
          <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400'>
            {eyebrow}
          </p>
        )}
        <h1 className='mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl'>
          {title}
        </h1>
        {subtitle && (
          <p className='mt-1 max-w-2xl text-sm leading-relaxed text-navy-400'>
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className='flex flex-shrink-0 flex-wrap items-center gap-2'>{actions}</div>
      )}
    </div>
  );
}
