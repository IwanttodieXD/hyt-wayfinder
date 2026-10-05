'use client';

import RoomOccupancy from '@/components/RoomOccupancy';
import UserProfile from '@/components/UserProfile';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// Who is inside each room right now. Admin-only: it exposes who is inside the
// building and where, so it must not be reachable by a visitor or staff member.
export default function OccupancyPage() {
  const { user, isAuthenticated } = useAuthStore();

  const isAllowed = useRoleGuard(['admin'], '/admin');

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <div className='min-h-screen flex flex-col'>
        {/* Header */}
        <header className='flex-shrink-0 app-header border-b px-4 py-3'>
          <div className='max-w-7xl mx-auto flex items-center justify-between'>
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
                  Live Occupancy
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>
                  {isAuthenticated && user ? `${user.name} - ` : ''}
                  Who is inside right now
                </p>
              </div>
            </div>

            {isAuthenticated && user ? <UserProfile /> : null}
          </div>
        </header>

        {/* Main Content */}
        <main className='flex-1 overflow-y-auto'>
          <div className='max-w-7xl mx-auto px-4 py-6'>
            <RoomOccupancy />
          </div>
        </main>
      </div>
    </>
  );
}