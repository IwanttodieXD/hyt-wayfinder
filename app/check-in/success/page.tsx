'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAttendanceStatus, useClockInProfile } from '@/hooks/useClockInProfile';
import { useClockInStore } from '@/store/clockInStore';
import { personLabel } from '@/lib/trainee';
import TraineeHeader from '@/components/TraineeHeader';
import { Badge, Button, Card } from '@/components/ui';

/**
 * Success page shown after a completed attendance scan.
 *
 * No camera, no scanner — just the confirmation panel. The trainee's name and
 * the action time come from the existing clock-in store, so no query params or
 * extra state plumbing are needed. "Scan again" sends them back to /check-in,
 * which restarts the camera there.
 */
export default function CheckInSuccessPage() {
  const { user } = useAuthStore();
  const { status, student, clockInTime } = useClockInStore();
  const router = useRouter();

  const isAllowed = useRoleGuard(['visitor'], '/admin');
  useClockInProfile();
  useAttendanceStatus(user?.id);

  // `status` is 'not-clocked-in' after a check-out and 'clocked-in' after a
  // check-in, so it distinguishes the two actions without a separate flag.
  const isCheckIn = status !== 'not-clocked-in';
  const actionTime = clockInTime ?? new Date();
  const visitorName = student.name || user?.name || 'Guest';

  if (!isAllowed) {
    return null;
  }

  return (
    <div className='flex min-h-[100dvh] flex-col'>
      <TraineeHeader />

      <main className='flex-1 px-4 py-6 sm:py-10'>
        <div className='mx-auto w-full max-w-lg'>
          <Card className='text-center'>
            <div className='mx-auto mb-5 flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30'>
              <i className='fa-solid fa-check text-3xl text-paper'></i>
            </div>

            <Badge
              tone={isCheckIn ? 'success' : 'neutral'}
              dot
              className='mb-3'
            >
              {isCheckIn ? 'Checked in' : 'Checked out'}
            </Badge>

            <h1 className='text-2xl font-bold leading-tight text-white'>
              {isCheckIn
                ? 'You are checked in'
                : 'You have checked out'}
            </h1>

            <p className='mx-auto mt-2 max-w-sm text-sm leading-relaxed text-navy-300'>
              {isCheckIn
                ? 'Attendance has started. Scan a room door whenever you move to a new room.'
                : 'Attendance and your open room visit were closed together. See you next time.'}
            </p>

            <dl className='mt-6 divide-y divide-navy-800 rounded-xl border border-navy-700 bg-navy-950/40 text-left text-sm'>
              <div className='flex items-center justify-between gap-3 px-4 py-3'>
                <dt className='flex items-center gap-2 text-navy-400'>
                  <i className='fa-solid fa-user text-yellow-400'></i>
                  {personLabel(user?.visitorType)}
                </dt>
                <dd className='truncate font-medium text-white'>
                  {visitorName}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3 px-4 py-3'>
                <dt className='flex items-center gap-2 text-navy-400'>
                  <i className='fa-solid fa-clock text-yellow-400'></i>
                  {isCheckIn ? 'Check-in time' : 'Check-out time'}
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
                  <i className='fa-solid fa-location-dot text-yellow-400'></i>
                  Assigned room
                </dt>
                <dd className='max-w-[60%] truncate text-right font-medium text-white'>
                  {user?.destination || 'Not assigned'}
                </dd>
              </div>
            </dl>

            <Button
              onClick={() => router.push('/check-in')}
              icon='fa-qrcode'
              size='lg'
              className='mt-6 w-full'
            >
              Open the scanner
            </Button>

            <Button
              onClick={() => router.push('/check-in')}
              variant='ghost'
              className='mt-2 w-full'
            >
              Back to scanner
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
