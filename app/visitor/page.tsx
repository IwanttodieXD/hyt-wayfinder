'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function VisitorPortalContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [roomInfo, setRoomInfo] = useState<{
    room?: string;
    name?: string;
    floor?: string;
    building?: string;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  const isAllowed = useRoleGuard(['visitor'], '/admin');

  useEffect(() => {
    setIsClient(true);
    // Check if we have room information from QR code
    const room = searchParams.get('room');
    const name = searchParams.get('name');
    const floor = searchParams.get('floor');
    const building = searchParams.get('building');

    if (room && name) {
      setRoomInfo({ room, name, floor: floor || undefined, building: building || undefined });
    }
  }, [searchParams]);

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
                  Visitor Portal
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>Welcome, {user?.name}</p>
                {roomInfo && (
                  <p className='text-orange-400 text-xs mt-0.5'>
                    Navigating to: {roomInfo.name}
                    {roomInfo.building && ` in ${roomInfo.building}`}
                    {roomInfo.floor && ` (Floor ${roomInfo.floor})`}
                  </p>
                )}
              </div>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Room Info Banner (if from QR code) */}
        {roomInfo && (
          <div className='bg-orange-500/20 border-b border-orange-500/30 px-4 py-3'>
            <div className='max-w-7xl mx-auto flex items-center gap-3'>
              <i className='fa-solid fa-qrcode text-orange-400'></i>
              <div>
                <p className='text-white font-semibold'>
                  QR Code Destination: {roomInfo.name}
                </p>
                <p className='text-orange-200 text-sm'>
                  {roomInfo.building && `${roomInfo.building} • `}
                  {roomInfo.floor && `Floor ${roomInfo.floor} • `}
                  Use the 3D navigation below to find your way
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Full Screen Mobile View */}
        <main className='flex-1 overflow-hidden'>
          <StudentMobileView roomDestination={roomInfo} />
        </main>
      </div>
    </>
  );
}

export default function VisitorPortal() {
  return (
    <Suspense fallback={
      <div className='min-h-screen bg-navy-950 flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    }>
      <VisitorPortalContent />
    </Suspense>
  );
}
