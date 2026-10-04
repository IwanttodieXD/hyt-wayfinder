'use client';

import KioskStationView from '@/components/KioskStationView';
import UserProfile from '@/components/UserProfile';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// The attendance station is an admin-only tool: it scans other people's QR
// codes, so it must never be reachable by a visitor.
export default function StationPage() {
  const { user, isAuthenticated } = useAuthStore();

  const isAllowed = useRoleGuard(['admin'], '/admin');

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <div className='w-full min-h-screen flex flex-col'>
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
                  QR Station
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>
                  {isAuthenticated && user ? `${user.name} - ` : ''}QR Station
                </p>
              </div>
            </div>

            {/* User Profile */}
            {isAuthenticated && user ? <UserProfile /> : null}
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
