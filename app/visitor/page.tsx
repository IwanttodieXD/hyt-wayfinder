'use client';

import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAttendanceStatus, useClockInProfile } from '@/hooks/useClockInProfile';
import StudentMobileView from '@/components/StudentMobileView';
import UserProfile from '@/components/UserProfile';

export default function VisitorPortal() {
  const { user } = useAuthStore();

  const isAllowed = useRoleGuard(['visitor'], '/admin');

  // Also loads the rooms list the visitor header resolves its room name from.
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
        {/* Header. Slimmer than the admin pages: a visitor has one job here, so
            the chrome stays out of the way of the phone frame below. */}
        <header className='app-header border-b flex-shrink-0'>
          <div className='max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-9 h-9 flex items-center justify-center overflow-hidden flex-shrink-0'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div className='min-w-0'>
                <h1 className='text-white font-semibold text-sm leading-none'>
                  Visitor Portal
                </h1>
                <p className='text-navy-400 text-xs mt-0.5 truncate'>
                  {user?.name}
                </p>
              </div>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View */}
        <main className='flex-1 min-h-0 overflow-hidden'>
          <StudentMobileView />
        </main>
      </div>
    </>
  );
}
