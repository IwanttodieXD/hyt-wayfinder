'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserProfile from '@/components/UserProfile';
import { cn } from '@/lib/cn';

const LINKS = [{ href: '/check-in', label: 'Check in', icon: 'fa-qrcode' }];

/**
 * Header shared by the trainee-facing pages.
 *
 * The admin pages keep their own header: they have different navigation and a
 * different job. This one is deliberately narrow so the scanner and status
 * panels get the screen space on a phone.
 */
export default function TraineeHeader() {
  const pathname = usePathname();

  return (
    <header className='app-header sticky top-0 z-40 border-b'>
      <div className='mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3'>
        <Link
          href='/check-in'
          className='flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60'
        >
          <span className='flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-navy-700/60 bg-navy-900/60'>
            <img
              src='/hyt_logo.png'
              alt=''
              className='h-full w-full object-contain'
            />
          </span>
          <span className='min-w-0'>
            <span className='block truncate text-sm font-bold leading-tight text-white'>
              HYT Global
            </span>
            <span className='block truncate text-[11px] leading-tight text-navy-400'>
              Trainee portal
            </span>
          </span>
        </Link>

        <nav
          aria-label='Trainee navigation'
          className='hidden items-center gap-1 rounded-xl border border-navy-700/60 bg-navy-950/40 p-1 sm:flex'
        >
          {LINKS.map((link) => {
            const active =
              link.href === '/check-in'
                ? pathname.startsWith('/check-in')
                : pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60',
                  active
                    ? 'bg-yellow-500/15 text-yellow-200'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                )}
              >
                <i className={`fa-solid ${link.icon}`}></i>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <UserProfile />
      </div>
    </header>
  );
}
