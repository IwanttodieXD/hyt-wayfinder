'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import UserProfile from '@/components/UserProfile';
import dynamic from 'next/dynamic';

// Dynamically import StudentMobileView to avoid SSR issues
const StudentMobileView = dynamic(() => import('@/components/StudentMobileView'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center justify-center min-h-[400px]'>
      <div className='text-white'>Loading...</div>
    </div>
  )
});

const ALLOWED_ROLES = ['visitor', 'trainee', 'trainer'] as const;

export default function ClockInPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [isClient, setIsClient] = useState(false);

  // Visitors, trainees and trainers clock in from their own phone.
  // Admins use the station instead, so send them back to the dashboard.
  const isAllowed = useRoleGuard([...ALLOWED_ROLES], '/admin');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isAllowed || !isClient) {
    return (
      <div className='min-h-screen bg-navy-950 flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className='h-screen bg-navy-950 flex flex-col'>
        {/* Header */}
        <header className='border-b border-navy-800 bg-navy-900/50 flex-shrink-0'>
          <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
            {/* Logo */}
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Global Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div>
                <h1 className='text-white font-bold text-lg leading-none'>
                  Attendance
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>
                  {isAuthenticated && user ? `${user.name} - ` : ''}My Check-In
                </p>
              </div>
            </div>

            {/* User Profile or System Status */}
            {isAuthenticated && user ? (
              <UserProfile />
            ) : (
              <div className='hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30'>
                <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse'></div>
                <span className='text-green-300 text-sm font-semibold'>
                  System Online
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View. `min-h-0` lets this flex child
            shrink so the taller route frame fits without pushing the header
            off screen. */}
        <main className='flex-1 min-h-0 overflow-hidden'>
          <StudentMobileView roomDestination={null} />
        </main>
      </div>
    </>
  );
}
