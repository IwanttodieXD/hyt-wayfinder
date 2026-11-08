'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRoomsStore } from '@/store/roomsStore';
import { attendanceGuidance, personLabel } from '@/lib/trainee';
import QRScanner from './QRScanner';
import { Alert, Badge } from './ui';

/**
 * The phone-shaped scanner frame.
 *
 * All scan behaviour lives in QRScanner. This component only presents the
 * trainee's identity, attendance state and next step around it.
 */
export default function StudentMobileView() {
  const { status, student, clockInTime } = useClockInStore();
  const { user, passExpired } = useAuthStore();
  const { getActiveRooms } = useRoomsStore();

  // A destination only counts as assigned when the profile actually set one; the
  // store still holds a placeholder default before then.
  const hasDestination = !!user?.destination;

  // Resolve the room the trainee is headed to. The clock-in store's `building`
  // and `room` fields are hardcoded placeholders that nothing ever updates, so
  // reading them rendered "Building B, Room 304" under every destination
  // regardless of the real assignment. Deriving from `rooms` is both correct
  // and the only source that reflects an admin's actual choice.
  const assignedRoom = hasDestination
    ? getActiveRooms().find((r) => r.roomNumber === user?.destination)
    : undefined;

  const isCheckedIn = status !== 'not-clocked-in';
  const typeLabel = personLabel(user?.visitorType);
  const guidance = attendanceGuidance({ checkedIn: isCheckedIn });

  return (
    <div className='flex min-h-full w-full items-start justify-center px-3 py-3 sm:px-4'>
      {/* Mobile Device Frame.
          A minimum height based on the viewport keeps the frame filling the
          screen on a tall phone, but the frame is allowed to GROW with its
          content. The page scrolls instead of the inside of the frame, so the
          camera, switch and instructions stay in one continuous column. */}
      <div className='relative flex min-h-[calc(100dvh-6.5rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-navy-700/80 bg-navy-900 shadow-2xl shadow-black/30 ring-1 ring-black/20'>
        {/* App Header. One row of identity + one status pill, rather than the
            previous stack, so the destination card below gets the space. */}
        <div className='border-b border-navy-700/70 bg-navy-900 px-4 py-3'>
          {/* Expired pass. Shown instead of silently doing nothing, so the
              one-day rule is explained rather than enforced invisibly. The person
              stays signed in - they are a valid account, the day just ended. */}
          {passExpired && (
            <Alert tone='warning' className='mb-3' icon='fa-clock'>
              Your pass has ended, so new check-ins are blocked. Ask reception to
              renew it - your account and history are still here.
            </Alert>
          )}

          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h2 className='truncate text-base font-bold leading-tight text-white'>
                  {student.name || user?.name || 'Guest'}
                </h2>
                <Badge tone='neutral' icon='fa-id-card'>
                  {typeLabel}
                </Badge>
              </div>
              <p className='mt-0.5 truncate text-xs text-navy-400'>
                {user?.email}
              </p>
            </div>

            <Badge
              tone={isCheckedIn ? 'success' : 'danger'}
              dot
              className='flex-shrink-0'
            >
              {isCheckedIn ? 'Checked in' : 'Not checked in'}
            </Badge>
          </div>

          {/* Destination + check-in time share one strip. Both are small facts
              about the same visit, so splitting them across two bordered boxes
              spent vertical space on chrome rather than information. */}
          <div className='mt-3 flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-2'>
            <i className='fa-solid fa-location-dot flex-shrink-0 text-xs text-yellow-400'></i>

            <div className='min-w-0 flex-1'>
              <p className='mb-0.5 text-[11px] leading-none text-navy-400'>
                Assigned room
              </p>
              <p className='truncate text-sm font-medium leading-tight text-white'>
                {assignedRoom
                  ? `${assignedRoom.name} · ${assignedRoom.roomNumber}`
                  : hasDestination
                    ? student.destination
                    : 'Not assigned yet'}
              </p>
            </div>

            {clockInTime && (
              <div className='flex-shrink-0 border-l border-navy-700 pl-2 text-right'>
                <p className='mb-0.5 text-[11px] leading-none text-navy-400'>
                  Since
                </p>
                <p className='text-sm font-medium leading-tight text-white'>
                  {clockInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Plain-language next step. The status pill says what is true; this
              says what to do, which is the part a first-time trainee needs. */}
          <p className='mt-2.5 text-xs leading-relaxed text-navy-400'>
            {guidance.body}
          </p>
        </div>

        {/* Main Content Area. No internal scroller: the frame grows and the
            page handles any overflow. */}
        <div className='relative flex-1 bg-navy-950'>
          <QRScanner />
        </div>

        {/* Check-out happens by scanning the check-in QR code again. */}

        {/* Home Indicator (iOS style) */}
        <div className='flex items-center justify-center bg-navy-950 py-2'>
          <div className='h-1 w-32 rounded-full bg-navy-700'></div>
        </div>
      </div>
    </div>
  );
}
