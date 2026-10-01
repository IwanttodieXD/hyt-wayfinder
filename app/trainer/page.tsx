'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useClockInStore } from '@/store/clockInStore';
import StudentMobileView from '@/components/StudentMobileView';
import UserProfile from '@/components/UserProfile';

export default function TrainerPortal() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { setViewMode } = useClockInStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'trainer') {
      router.push('/login');
      return;
    }

    // Auto-set to mobile view for QR scanner
    setViewMode('mobile');
  }, [isAuthenticated, user, router, setViewMode]);

  if (!isAuthenticated || user?.role !== 'trainer') {
    return null;
  }

  return (
    <>
      <div className='min-h-screen bg-navy-950 flex flex-col'>
        {/* Header */}
        <header className='border-b border-navy-800 bg-navy-900/50 flex-shrink-0'>
          <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div>
                <h1 className='text-white font-bold text-lg leading-none'>
                  Trainer Portal
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>Welcome, {user.name}</p>
              </div>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View */}
        <main className='flex-1 overflow-hidden'>
          <StudentMobileView />
        </main>
      </div>
    </>
  );
}
