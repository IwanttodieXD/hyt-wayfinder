'use client';

import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAttendanceStatus, useClockInProfile } from '@/hooks/useClockInProfile';
import StudentMobileView from '@/components/StudentMobileView';
import UserProfile from '@/components/UserProfile';

export default function CheckInPage() {
  const { user, isAuthenticated } = useAuthStore();

  // Visitors check in from their own phone. Admins use the station instead, so
  // they are sent back to the dashboard.
  const isAllowed = useRoleGuard(['visitor'], '/admin');

  // Pull the signed-in user's name and destination into the check-in store.
  useClockInProfile();

  // Reconciles check-in state with the database, so a refresh doesn't report
  // "not checked in" for someone who is genuinely inside - and so the 3D route
  // button is reachable after a refresh.
  useAttendanceStatus(user?.id);

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <div className='h-[100dvh] flex flex-col'>
        {/* Header */}
        <header className='app-header border-b flex-shrink-0'>
          <div className='max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-9 h-9 flex items-center justify-center overflow-hidden flex-shrink-0'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Global Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div className='min-w-0'>
                <h1 className='text-white font-semibold text-sm leading-none'>
                  Attendance
                </h1>
                <p className='text-navy-400 text-xs mt-0.5 truncate'>
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
