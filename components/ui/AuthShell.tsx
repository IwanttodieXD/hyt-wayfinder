'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AuthShellProps {
  /** Small line above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional explanatory column shown beside the card on wide screens. */
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
  /**
   * `md` is the compact sign-in card. `lg` gives long forms (registration) a
   * wider column without changing the shared frame.
   */
  size?: 'md' | 'lg';
}

/**
 * Shared layout for the public / trainee entry screens.
 *
 * Wide screens get a two-column "brand + guidance | form" split; phones get a
 * single card. The split is presentation only - every screen keeps its own
 * logic and guards.
 */
export default function AuthShell({
  eyebrow = 'HYT Global Institute',
  title,
  subtitle,
  aside,
  children,
  footer,
  cardClassName,
  size = 'md',
}: AuthShellProps) {
  const wide = size === 'lg';

  return (
    <div className='min-h-screen px-4 py-6 sm:px-6 sm:py-10'>
      <div
        className={cn(
          'mx-auto flex min-h-[calc(100dvh-3rem)] w-full items-center justify-center',
          wide ? 'max-w-6xl' : aside ? 'max-w-5xl' : 'max-w-md'
        )}
      >
        <div
          className={cn(
            'grid w-full items-center gap-8',
            wide && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]',
            !wide && Boolean(aside) && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]'
          )}
        >
          {aside && (
            <aside className='hidden lg:block'>
              <div className='mb-8 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-navy-700 bg-navy-900'>
                  <img
                    src='/hyt_logo.png'
                    alt='HYT Global'
                    className='h-full w-full object-contain'
                  />
                </div>
                <div>
                  <p className='text-sm font-bold text-white'>HYT Global</p>
                  <p className='text-xs text-navy-400'>Trainee check-in</p>
                </div>
              </div>
              {aside}
            </aside>
          )}

          <div className={cn('mx-auto w-full', wide ? 'max-w-2xl' : 'max-w-md')}>
            <section
              className={cn(
                'overflow-hidden rounded-2xl border border-navy-700/80 bg-navy-900/95 shadow-2xl shadow-black/20',
                cardClassName
              )}
            >
              <div className='h-1 w-full bg-yellow-500' aria-hidden='true' />
              <div className='p-6 sm:p-8'>
                <div className='mb-6 text-center'>
                  <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-navy-700 bg-navy-950/60'>
                    <img
                      src='/hyt_logo.png'
                      alt=''
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400'>
                    {eyebrow}
                  </p>
                  <h1 className='mt-1.5 text-2xl font-bold tracking-tight text-white'>
                    {title}
                  </h1>
                  {subtitle && (
                    <p className='mt-1.5 text-sm leading-relaxed text-navy-400'>
                      {subtitle}
                    </p>
                  )}
                </div>

                {children}
              </div>
            </section>

            {footer && <div className='mt-4'>{footer}</div>}

            <p className='mt-4 text-center text-[11px] text-navy-500'>
              HYT Global Institute · Trainee check-in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
