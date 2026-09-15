'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function TourPage() {
  useEffect(() => {
    // Release pointer lock when this page unmounts (e.g. navigating back)
    return () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
  }, []);

  useEffect(() => {
    // Also release if the user leaves the tab or closes the window
    const handleVisibilityChange = () => {
      if (document.hidden && document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="w-full h-screen">
      <Suspense fallback={<LoadingScreen />}>
        <Scene />
      </Suspense>
    </div>
  );
}
