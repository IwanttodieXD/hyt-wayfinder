'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import QRScanner from './QRScanner';
import RouteVisualization from './RouteVisualization';
import ThreeErrorBoundary from './ThreeErrorBoundary';

export default function StudentMobileView() {
  const { status, student, clockInTime } = useClockInStore();
  const { user } = useAuthStore();

  // A destination only counts as assigned when the admin/user profile actually
  // set one; the store still holds a placeholder default before then.
  const hasDestination = !!user?.destination;

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
        {/* App Header */}
        <div className='bg-navy-900 px-4 py-3 border-b border-navy-800/50'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h2 className='text-white font-bold text-lg'>{student.name}</h2>
              <p className='text-navy-300 text-xs'>ID #{student.id}</p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                status === 'not-clocked-in'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}
            >
              {status === 'not-clocked-in' ? (
                <>
                  <i className='fa-solid fa-circle-xmark mr-1'></i>
                  Not Clocked In
                </>
              ) : (
                <>
                  <i className='fa-solid fa-circle-check mr-1'></i>
                  Clocked In
                </>
              )}
            </div>
          </div>

          {/* Destination Info */}
          <div className='bg-navy-800/50 rounded-lg p-3 border border-navy-700'>
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0'>
                <i className='fa-solid fa-location-dot text-orange-400'></i>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-navy-300 text-xs mb-1'>Assigned Destination</p>
                <h3 className='text-white font-semibold text-sm leading-tight mb-1'>
                  {hasDestination ? student.destination : 'Not assigned yet'}
                </h3>
                <p className='text-navy-500 text-xs'>
                  {hasDestination
                    ? `${student.building}, ${student.room}`
                    : 'Ask an administrator to set your destination.'}
                </p>
              </div>
            </div>
          </div>

          {/* Clock-in Time */}
          {clockInTime && (
            <div className='mt-3 flex items-center justify-center gap-2 text-xs text-navy-300'>
              <i className='fa-solid fa-clock'></i>
              <span>
                Clocked in at{' '}
                {clockInTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
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

        {/* Clock-out happens by scanning the check-in QR code again, or with the
            Clock Out button on the 3D route screen. */}

        {/* Home Indicator (iOS style) */}
        <div className='bg-navy-950 py-2 flex items-center justify-center'>
          <div className='w-32 h-1 rounded-full bg-navy-700'></div>
        </div>
      </div>
    </div>
  );
}
