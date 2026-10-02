'use client';

import KioskStationView from '@/components/KioskStationView';
import UserProfile from '@/components/UserProfile';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// The attendance station is an admin-only tool: it scans other people's QR
// codes, so it must never be reachable by a visitor, trainee or trainer.
export default function StationPage() {
  const { user, isAuthenticated } = useAuthStore();

  const isAllowed = useRoleGuard(['admin'], '/admin');

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <div className='w-full min-h-screen bg-navy-950 flex flex-col'>
        {/* Header */}
        <header className='flex-shrink-0 border-b border-navy-800 bg-navy-900/50 px-4 py-3 relative z-50'>
          <div className='max-w-7xl mx-auto flex items-center justify-between'>
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
                  {isAuthenticated && user ? `${user.name} - ` : ''}Attendance Station
                </p>
              </div>
            </div>

            {/* User Profile or System Status */}
            {isAuthenticated && user ? (
              <UserProfile />
            ) : (
              <div className='hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30'>
                <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse'></div>
                <span className='text-green-300 text-sm font-semibold'>
                  System Online
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content - scrolls when content is taller than the viewport */}
        <main className='flex-1 min-h-0 overflow-y-auto'>
          <KioskStationView />
        </main>
      </div>
    </>
  );
}