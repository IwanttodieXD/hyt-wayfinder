'use client';

import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useClockInProfile } from '@/hooks/useClockInProfile';
import StudentMobileView from '@/components/StudentMobileView';
import UserProfile from '@/components/UserProfile';

const ALLOWED_ROLES = ['visitor', 'trainee', 'trainer'] as const;

export default function ClockInPage() {
  const { user, isAuthenticated } = useAuthStore();

  // Visitors, trainees and trainers clock in from their own phone.
  // Admins use the station instead, so send them back to the dashboard.
  const isAllowed = useRoleGuard([...ALLOWED_ROLES], '/admin');

  // Pull the signed-in user's name and destination into the clock-in store.
  useClockInProfile();

  if (!isAllowed) {
    return null;
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

            {/* User Profile. The old fallback here rendered a "System Online" badge when
                signed out, but this page is role-guarded, so that branch was
                unreachable. */}
            {isAuthenticated && user ? <UserProfile /> : null}
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View. `min-h-0` lets this flex child
            shrink so the taller route frame fits without pushing the header
            off screen. */}
        <main className='flex-1 min-h-0 overflow-hidden'>
          <StudentMobileView />
        </main>
      </div>
    </>
  );
}
