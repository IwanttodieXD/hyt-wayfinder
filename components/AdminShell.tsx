'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import UserProfile from '@/components/UserProfile';

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Shared frame for the admin console.
 *
 * The brand bar and navigation live here so every admin screen gets the same
 * sidebar, spacing and z-index. Each page supplies its own title block with
 * `AdminPageHeader` and keeps ownership of its content.
 */
export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className='min-h-screen'>
      <header className='app-header sticky top-0 z-40 border-b'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3'>
          <Link
            href='/admin'
            className='flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60'
          >
            <span className='flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-navy-700/60 bg-navy-900/60'>
              <img src='/hyt_logo.png' alt='' className='h-full w-full object-contain' />
            </span>
            <span className='min-w-0'>
              <span className='block truncate text-base font-bold leading-tight text-white'>
                HYT Wayfinding
              </span>
              <span className='mt-0.5 block truncate text-[11px] leading-tight text-navy-400'>
                Admin console
              </span>
            </span>
          </Link>

          <div className='flex flex-shrink-0 items-center gap-2'>
            <UserProfile />
          </div>
        </div>
      </header>

      <div className='mx-auto flex w-full max-w-7xl items-start gap-6 px-4 py-5 sm:py-8'>
        <AdminSidebar />
        <main className='min-w-0 flex-1'>{children}</main>
      </div>
    </div>
  );
}
