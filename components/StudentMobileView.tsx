'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRoomsStore } from '@/store/roomsStore';
import QRScanner from './QRScanner';
import RouteVisualization from './RouteVisualization';
import ThreeErrorBoundary from './ThreeErrorBoundary';

export default function StudentMobileView() {
  const { status, student, clockInTime } = useClockInStore();
  const { user } = useAuthStore();
  const { getActiveRooms } = useRoomsStore();

  // A destination only counts as assigned when the profile actually set one; the
  // store still holds a placeholder default before then.
  const hasDestination = !!user?.destination;

  // Resolve the room the visitor is headed to. The clock-in store's `building`
  // and `room` fields are hardcoded placeholders that nothing ever updates, so
  // reading them rendered "Building B, Room 304" under every destination
  // regardless of the real assignment. Deriving from `rooms` is both correct
  // and the only source that reflects an admin's actual choice.
  const assignedRoom = hasDestination
    ? getActiveRooms().find((r) => r.roomNumber === user?.destination)
    : undefined;

  const isCheckedIn = status !== 'not-clocked-in';

  // The 3D canvas is a full-width square, so its size is driven by the frame
  // width. A taller/wider frame during the route is what actually makes the
  // 3D window bigger - on the scanner the frame keeps its phone dimensions.
  const showingRoute = status === 'viewing-route';

  return (
    <div className='w-full min-h-full bg-navy-950 flex items-center justify-center p-4'>
      {/* Mobile Device Frame */}
      <div
        className={`relative w-full h-full bg-navy-900 rounded-lg border-4 border-navy-800 overflow-hidden flex flex-col transition-all duration-300 ${
          showingRoute
            ? 'max-w-2xl max-h-[min(1150px,calc(100dvh-5rem))] min-h-[680px]'
            : 'max-w-md max-h-[800px] min-h-[560px]'
        }`}
      >
        {/* App Header. One row of identity + one status pill, rather than the
            previous stack, so the destination card below gets the space. */}
        <div className='bg-navy-900 px-4 py-3 border-b border-navy-800/50'>
          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <h2 className='text-white font-bold text-base leading-tight truncate'>
                {student.name || user?.name || 'Visitor'}
              </h2>
              <p className='text-navy-400 text-xs mt-0.5 truncate'>
                {user?.email}
              </p>
            </div>

            <div
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                isCheckedIn
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              <i
                className={`fa-solid ${isCheckedIn ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`}
              ></i>
              {isCheckedIn ? 'Checked In' : 'Not In'}
            </div>
          </div>

          {/* Destination + check-in time share one strip. Both are small facts
              about the same visit, so splitting them across two bordered boxes
              spent vertical space on chrome rather than information. */}
          <div className='mt-3 flex items-center gap-2 rounded-lg bg-navy-800/50 border border-navy-700 px-3 py-2'>
            <i className='fa-solid fa-location-dot text-orange-400 text-xs flex-shrink-0'></i>

            <div className='min-w-0 flex-1'>
              <p className='text-navy-400 text-[11px] leading-none mb-0.5'>
                Assigned room
              </p>
              <p className='text-white text-sm font-medium leading-tight truncate'>
                {assignedRoom
                  ? `${assignedRoom.name} · ${assignedRoom.roomNumber}`
                  : hasDestination
                    ? student.destination
                    : 'Not assigned'}
              </p>
            </div>

            {clockInTime && (
              <div className='flex-shrink-0 text-right border-l border-navy-700 pl-2'>
                <p className='text-navy-400 text-[11px] leading-none mb-0.5'>
                  Since
                </p>
                <p className='text-white text-sm font-medium leading-tight'>
                  {clockInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Plain-language next step. The status pill says what is true; this
              says what to do, which is the part a first-time visitor needs. */}
          <p className='text-navy-400 text-xs mt-2.5 leading-relaxed'>
            {isCheckedIn
              ? showingRoute
                ? 'Scan the QR code on your next room door to record where you are.'
                : 'Scan the entrance QR code again to check out when you leave.'
              : 'Scan the QR code at the entrance to check in and see your route.'}
          </p>
        </div>

        {/* Main Content Area */}
        <div className='flex-1 min-h-0 overflow-hidden relative bg-navy-950'>
          {status === 'not-clocked-in' || status === 'clocked-in' ? (
            <QRScanner />
          ) : (
            <ThreeErrorBoundary>
              <RouteVisualization />
            </ThreeErrorBoundary>
          )}
        </div>

        {/* Check-out happens by scanning the check-in QR code again, or with the
            Check Out button on the 3D route screen. */}

        {/* Home Indicator (iOS style) */}
        <div className='bg-navy-950 py-2 flex items-center justify-center'>
          <div className='w-32 h-1 rounded-full bg-navy-700'></div>
        </div>
      </div>
    </div>
  );
}
