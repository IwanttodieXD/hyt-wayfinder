'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import UserProfile from '@/components/UserProfile';
import dynamic from 'next/dynamic';

// Dynamically import StudentMobileView to avoid SSR issues
const StudentMobileView = dynamic(() => import('@/components/StudentMobileView'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center justify-center min-h-[400px]'>
      <div className='text-white'>Loading...</div>
    </div>
  )
});

export default function TrainerPortal() {
  const { user } = useAuthStore();
  const [isClient, setIsClient] = useState(false);

  const isAllowed = useRoleGuard(['trainer'], '/admin');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isAllowed || !isClient) {
    return (
      <div className='min-h-screen bg-navy-950 flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
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
                <p className='text-navy-300 text-xs mt-0.5'>Welcome, {user?.name}</p>
              </div>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View */}
        <main className='flex-1 overflow-hidden'>
          <StudentMobileView roomDestination={null} />
        </main>
      </div>
    </>
  );
}
