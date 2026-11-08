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
import { personLabel } from '@/lib/trainee';
import TraineeHeader from '@/components/TraineeHeader';
import { Alert, Badge, Button, Card } from '@/components/ui';

/**
 * Successfully Registered.
 *
 * Destination page shown after /verify approves a visitor and signs them in.
 * Replaces the old redirect to /check-in: the trainee lands here instead, with
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
 * left intact and still works through its own flows.
 */
export default function SuccessfullyRegisteredPage() {
  const { user } = useAuthStore();
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

  // When the trainee arrives signed in from /verify, check them in
  // automatically. Returns an error string if that write failed.
  const { error: autoCheckInError } = useAutoCheckInAfterVerify();

  if (!isAllowed) {
    return null;
  }

  const visitorName = user?.name || 'Guest';
  const isCheckedIn = status !== 'not-clocked-in';
  const actionTime = clockInTime ?? new Date();

  return (
    <div className='flex min-h-[100dvh] flex-col'>
      <TraineeHeader />

      {autoCheckInError && (
        <div className='border-b border-red-500/30 bg-red-500/10 px-4 py-2.5'>
          <div className='mx-auto max-w-6xl'>
            <Alert tone='danger' role='alert'>
              {autoCheckInError}
            </Alert>
          </div>
        </div>
      )}

      <main className='flex-1 px-4 py-6 sm:py-10'>
        <div className='mx-auto w-full max-w-lg'>
          <Card className='text-center'>
            <div className='mx-auto mb-5 flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30'>
              <i className='fa-solid fa-check text-3xl text-paper'></i>
            </div>

            <Badge
              tone={isCheckedIn ? 'success' : 'warning'}
              dot
              className='mb-3'
            >
              {isCheckedIn ? 'Verified & checked in' : 'Checking in…'}
            </Badge>

            <h1 className='text-2xl font-bold leading-tight text-white'>
              Welcome, {visitorName.split(' ')[0] || visitorName}
            </h1>

            <p className='mx-auto mt-2 max-w-sm text-sm leading-relaxed text-navy-300'>
              Your registration has been verified. Attendance and room scans are
              ready from your phone.
            </p>

            <dl className='mt-6 divide-y divide-navy-800 rounded-xl border border-navy-700 bg-navy-950/40 text-left text-sm'>
              <div className='flex items-center justify-between gap-3 px-4 py-3'>
                <dt className='flex items-center gap-2 text-navy-400'>
                  <i className='fa-solid fa-id-card text-yellow-400'></i>
                  {personLabel(user?.visitorType)}
                </dt>
                <dd className='truncate font-medium text-white'>
                  {visitorName}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3 px-4 py-3'>
                <dt className='flex items-center gap-2 text-navy-400'>
                  <i className='fa-solid fa-clock text-yellow-400'></i>
                  Check-in time
                </dt>
                <dd className='font-medium text-white'>
                  {actionTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3 px-4 py-3'>
                <dt className='flex items-center gap-2 text-navy-400'>
                  <i className='fa-solid fa-circle-info text-yellow-400'></i>
                  Registration
                </dt>
                <dd
                  className={`font-medium ${
                    isCheckedIn ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {isCheckedIn ? 'Verified & checked in' : 'Processing…'}
                </dd>
              </div>
            </dl>

            <Button
              onClick={() => router.push('/check-in')}
              size='lg'
              className='mt-6 w-full'
            >
              Go to my check-in
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
