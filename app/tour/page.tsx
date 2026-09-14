'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function TourPage() {
  return (
    <div className="w-full h-screen">
      <Suspense fallback={<LoadingScreen />}>
        <Scene />
      </Suspense>
    </div>
  );
}
