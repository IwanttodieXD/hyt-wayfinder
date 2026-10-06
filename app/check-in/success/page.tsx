'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAttendanceStatus, useClockInProfile } from '@/hooks/useClockInProfile';
import { useClockInStore } from '@/store/clockInStore';
import UserProfile from '@/components/UserProfile';

/**
 * Success page shown after a completed attendance scan.
 *
 * No camera, no scanner — just the success panel. The visitor's name and the
 * action time come from the existing clock-in store, so no query params or
 * extra state plumbing are needed. "Continue" sends the visitor back to
 * /check-in, which restarts the camera there.
 */
export default function CheckInSuccessPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { status, student, clockInTime } = useClockInStore();
  const router = useRouter();

  const isAllowed = useRoleGuard(['visitor'], '/admin');
  useClockInProfile();
  useAttendanceStatus(user?.id);

  // `status` is 'not-clocked-in' after a check-out and 'clocked-in' after a
  // check-in, so it distinguishes the two actions without a separate flag.
  const isCheckIn = status !== 'not-clocked-in';
  const actionTime = clockInTime ?? new Date();
  const visitorName = student.name || user?.name || 'Visitor';

  if (!isAllowed) {
    return null;
  }

  return (
    <div className='h-[100dvh] flex flex-col'>
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
                {isAuthenticated && user ? `${user.name} - ` : ''}Check-In
              </p>
            </div>
          </div>
          {isAuthenticated && user ? <UserProfile /> : null}
        </div>
      </header>

      <main className='flex-1 min-h-0 overflow-hidden'>
        <div className='w-full h-full flex items-center justify-center'>
          {/* Same mobile device frame as /check-in so the transition is
              visually continuous. */}
          <div className='relative w-full h-full bg-navy-900 rounded-lg border-4 border-navy-800 overflow-hidden flex flex-col max-w-md max-h-[calc(100dvh-7rem)]'>
            <div className='bg-navy-900 px-4 py-3 border-b border-navy-800/50'>
              <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <h2 className='text-white font-bold text-base leading-tight truncate'>
                    {visitorName}
                  </h2>
                  <p className='text-navy-400 text-xs mt-0.5 truncate'>
                    {user?.email}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isCheckIn
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-navy-500/20 text-navy-300 border border-navy-500/30'
                  }`}
                >
                  <i
                    className={`fa-solid ${isCheckIn ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`}
                  ></i>
                  {isCheckIn ? 'Checked In' : 'Checked Out'}
                </div>
              </div>
            </div>

            {/* Success Panel */}
            <div className='flex-1 min-h-0 overflow-y-auto bg-navy-950 flex items-center justify-center p-6'>
              <div className='w-full max-w-sm flex flex-col items-center text-center'>
                {/* Success icon */}
                <div className='w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 animate-scale-in shadow-lg shadow-green-500/30'>
                  <i className='fa-solid fa-check text-paper text-4xl'></i>
                </div>

                <h2 className='text-white font-bold text-2xl leading-tight mb-1'>
                  {isCheckIn ? 'Successfully Checked In' : 'Successfully Checked Out'}
                </h2>

                <p className='text-navy-300 text-sm mb-6'>
                  {isCheckIn
                    ? 'You are now checked in.'
                    : 'You have been checked out. See you next time.'}
                </p>

                {/* Detail card: name + time */}
                <div className='w-full rounded-lg border border-navy-700 bg-navy-900/50 divide-y divide-navy-800 mb-8'>
                  <div className='flex items-center justify-between gap-3 px-4 py-3'>
                    <span className='text-navy-400 text-xs flex items-center gap-2'>
                      <i className='fa-solid fa-user text-orange-400'></i>
                      Visitor
                    </span>
                    <span className='text-white text-sm font-medium truncate'>
                      {visitorName}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-3 px-4 py-3'>
                    <span className='text-navy-400 text-xs flex items-center gap-2'>
                      <i className='fa-solid fa-clock text-orange-400'></i>
                      {isCheckIn ? 'Check-in time' : 'Check-out time'}
                    </span>
                    <span className='text-white text-sm font-medium'>
                      {actionTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Continue button: returns to the scanner, which restarts
                    the camera. */}
                <button
                  onClick={() => router.push('/check-in')}
                  className='
                    w-full px-4 py-3 rounded-lg font-bold text-base text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors duration-150
                    shadow-lg shadow-orange-500/20
                  '
                >
                  <span className='flex items-center justify-center gap-2'>
                    <i className='fa-solid fa-arrow-right'></i>
                    Continue
                  </span>
                </button>

                {/* Secondary action for checked-in visitors: go see the 3D
                    route, which is the natural next step in this app. */}
                {isCheckIn && (
                  <button
                    onClick={() => router.push('/visitor')}
                    className='
                      mt-3 w-full px-4 py-3 rounded-lg font-semibold text-sm
                      bg-navy-700 hover:bg-navy-600 text-navy-100
                      transition-colors duration-150
                    '
                  >
                    <span className='flex items-center justify-center gap-2'>
                      <i className='fa-solid fa-route'></i>
                      View 3D Route
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Home Indicator (iOS style) */}
            <div className='bg-navy-950 py-2 flex items-center justify-center'>
              <div className='w-32 h-1 rounded-full bg-navy-700'></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
