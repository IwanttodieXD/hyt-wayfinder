'use client';

import { Canvas } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Building from './Building';
import Camera from './Camera';
import FloorIndicator from './FloorIndicator';
import Controls from './Controls';
import PerformanceStats from './PerformanceStats';
import Crosshair from './Crosshair';
import CrosshairRaycaster from './CrosshairRaycaster';
import ThreeErrorBoundary from './ThreeErrorBoundary';

export default function Scene() {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTargeting, setIsTargeting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const handleReturn = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    router.push('/');
  };

  const handleTargetChange = (targeting: boolean, objectName?: string) => {
    setIsTargeting(targeting);
  };

  return (
    <>
      {!isLocked && (
        <div className='theme-fixed-dark absolute inset-0 z-10 flex items-center justify-center bg-black/50 pointer-events-none'>
          <div className='bg-black/80 px-5 py-3 rounded-lg border-2 border-yellow-400 text-center pointer-events-auto space-y-4'>
            <h2 className='text-2xl font-bold text-white'>Click to Start</h2>
            <p className='text-yellow-300'>Click anywhere to begin exploring</p>
            <button
              onClick={handleReturn}
              className='mt-2 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-colors duration-150'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
              Return to Home
            </button>
          </div>
        </div>
      )}

      <PerformanceStats />
      <FloorIndicator currentFloor={currentFloor} />
      {!isMobile && <Controls />}

      {/* Crosshair - shows when pointer is locked */}
      {isLocked && <Crosshair isTargeting={isTargeting} />}

      <ThreeErrorBoundary>
        <Canvas
          camera={{
            position: [0, 1.6, 10],
            fov: 75,
          }}
          shadows
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]} // Limit pixel ratio for better performance
        >
          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset='sunset' />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[0, 10, 0]} intensity={0.5} />

          <Building />
          <CrosshairRaycaster onTargetChange={handleTargetChange} />
          <Camera
            onFloorChange={setCurrentFloor}
            onLockChange={setIsLocked}
            isMobile={isMobile}
          />
        </Canvas>
      </ThreeErrorBoundary>
    </>
  );
}
