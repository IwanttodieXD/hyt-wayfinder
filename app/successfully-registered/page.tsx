'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import {
  useAttendanceStatus,
  useClockInProfile,
} from '@/hooks/useClockInProfile';
import { useAutoCheckInAfterVerify } from '@/hooks/useAutoCheckInAfterVerify';
import { useClockInStore } from '@/store/clockInStore';
import UserProfile from '@/components/UserProfile';

/**
 * Successfully Registered.
 *
 * Destination page shown after /verify approves a visitor and signs them in.
 * Replaces the old redirect to /check-in: the visitor lands here instead, with
 * a confirmation panel instead of a camera.
 *
 * WHY THIS PAGE RUNS THE AUTO CHECK-IN (not /verify)
 * ---------------------------------------------------
 * Same reason /check-in used to: /verify establishes the Supabase session, but
 * the app's `user` object is only populated once AuthGate runs `checkAuth`, and
 * the check-in INSERT is authorised by RLS as `auth.uid() = user_id`. So the
 * write belongs on the first page the visitor hits after AuthGate - which is
 * now this one. `useAutoCheckInAfterVerify` reads the same `?verified=1` marker
 * /verify appends and performs the write exactly once.
 *
 * NOT IN NAVIGATION
 * -----------------
 * This is a destination-only confirmation page. No link points at it from any
 * nav, sidebar, or menu; the only entry is /verify's redirect. /check-in is
 * left intact and still works through its own flows (e.g. the "Continue to
 * Check-In" button below, and any existing links).
 */
export default function SuccessfullyRegisteredPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { status, clockInTime } = useClockInStore();
  const router = useRouter();

  // Visitors only. An admin who somehow lands here is sent to the dashboard,
  // same guard as /check-in.
  const isAllowed = useRoleGuard(['visitor'], '/admin');

  // Mirror the signed-in user's profile into the clock-in store so the panel
  // shows their name and destination, and so the auto check-in below can
  // resolve the room/purpose.
  useClockInProfile();

  // Reconcile with the database: a refresh still reports the right state, and
  // the check-in time shown below stays accurate.
  useAttendanceStatus(user?.id);

  // When the visitor arrives signed in from /verify, check them in
  // automatically. Returns an error string if that write failed.
  const { error: autoCheckInError } = useAutoCheckInAfterVerify();

  if (!isAllowed) {
    return null;
  }

  const visitorName = user?.name || 'Visitor';
  const isCheckedIn = status !== 'not-clocked-in';
  const actionTime = clockInTime ?? new Date();

  return (
    <>
      <div className='h-[100dvh] flex flex-col'>
        {/* Header - identical to /check-in so the transition is visually
            continuous. */}
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
                  {isAuthenticated && user ? `${user.name} - ` : ''}
                  Registered
                </p>
              </div>
            </div>

            {isAuthenticated && user ? <UserProfile /> : null}
          </div>
        </header>

        {/* Automatic check-in failure. Same surface as /check-in: the visitor
            is genuinely not checked in, and the manual scan at /check-in is the
            fallback. */}
        {autoCheckInError && (
          <div className='flex-shrink-0 bg-red-500/10 border-b border-red-500/30 px-4 py-2'>
            <p
              role='alert'
              className='max-w-7xl mx-auto text-red-300 text-xs flex items-start gap-2'
            >
              <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
              <span>{autoCheckInError}</span>
            </p>
          </div>
        )}

        {/* Main Content - same mobile device frame as /check-in. `min-h-0` so
            this flex child can shrink. */}
        <main className='flex-1 min-h-0 overflow-hidden'>
          <div className='w-full h-full flex items-center justify-center'>
            <div className='relative w-full h-full bg-navy-900 rounded-lg border-4 border-navy-800 overflow-hidden flex flex-col max-w-md max-h-[calc(100dvh-7rem)]'>
              {/* In-frame header - mirrors StudentMobileView's top row: name,
                  email, status pill. */}
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
                      isCheckedIn
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    <i
                      className={`fa-solid ${isCheckedIn ? 'fa-circle-check' : 'fa-spinner fa-spin'} mr-1`}
                    ></i>
                    {isCheckedIn ? 'Checked In' : 'Checking in…'}
                  </div>
                </div>
              </div>

              {/* Success Panel - replaces the QR scanner. */}
              <div className='flex-1 min-h-0 overflow-y-auto bg-navy-950 flex items-center justify-center p-6'>
                <div className='w-full max-w-sm flex flex-col items-center text-center'>
                  {/* Success icon */}
                  <div className='w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 animate-scale-in shadow-lg shadow-green-500/30'>
                    <i className='fa-solid fa-check text-paper text-4xl'></i>
                  </div>

                  <h2 className='text-white font-bold text-2xl leading-tight mb-1'>
                    Successfully Registered
                  </h2>

                  <p className='text-white font-semibold text-lg mb-1'>
                    Welcome, {visitorName}!
                  </p>

                  <p className='text-navy-300 text-sm mb-6'>
                    Your registration has been successfully verified.
                    <br />
                    You are now checked in.
                  </p>

                  {/* Detail card: name + check-in time + registration status,
                      pulled from the existing clock-in and auth stores. */}
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
                        Check-in time
                      </span>
                      <span className='text-white text-sm font-medium'>
                        {actionTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-3 px-4 py-3'>
                      <span className='text-navy-400 text-xs flex items-center gap-2'>
                        <i className='fa-solid fa-circle-info text-orange-400'></i>
                        Registration status
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isCheckedIn ? 'text-green-400' : 'text-yellow-400'
                        }`}
                      >
                        {isCheckedIn ? 'Verified & Checked In' : 'Processing…'}
                      </span>
                    </div>
                  </div>

                  {/* Continue to /check-in - the existing page still works and
                      is where the visitor goes for anything else (scanning room
                      QR codes, viewing the route, etc.). */}
		  {/*remove the bracket below for the check in button redirect*/}
		  {/*<button
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
                      Continue to Check-In
                    </span>
                  </button>*/}
		  
                </div>
              </div>

              {/* Home Indicator (iOS style) - matches the check-in success
                  page. */}
              <div className='bg-navy-950 py-2 flex items-center justify-center'>
                <div className='w-32 h-1 rounded-full bg-navy-700'></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
