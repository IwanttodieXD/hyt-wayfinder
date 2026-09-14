'use client';

import { Canvas } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import { useState, useEffect } from 'react';
import Building from './Building';
import Camera from './Camera';
import FloorIndicator from './FloorIndicator';
import Controls from './Controls';
import PerformanceStats from './PerformanceStats';

export default function Scene() {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  return (
    <>
      {!isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <div className="bg-black/80 px-8 py-6 rounded-xl border-2 border-cyan-400 text-center pointer-events-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Click to Start</h2>
            <p className="text-cyan-300">Click anywhere to begin exploring</p>
          </div>
        </div>
      )}

      <PerformanceStats />
      <FloorIndicator currentFloor={currentFloor} />
      {!isMobile && <Controls />}

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
        <Environment preset="sunset" />
        
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        <Building />
        <Camera 
          onFloorChange={setCurrentFloor} 
          onLockChange={setIsLocked}
          isMobile={isMobile}
        />
      </Canvas>
    </>
  );
}
