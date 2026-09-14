'use client';

import { useEffect, useState } from 'react';

export default function PerformanceStats() {
  const [fps, setFps] = useState(0);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(updateFps);
    };

    animationFrameId = requestAnimationFrame(updateFps);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setShowStats(!showStats)}
        className="absolute top-8 left-8 bg-black/50 backdrop-blur-sm px-4 py-2 rounded text-white text-sm hover:bg-black/70 transition-colors"
      >
        {showStats ? 'Hide Stats' : 'Show Stats'}
      </button>

      {showStats && (
        <div className="absolute top-20 left-8 bg-black/70 backdrop-blur-sm px-4 py-3 rounded text-white text-sm space-y-1">
          <p className="font-semibold text-cyan-300">Performance</p>
          <p>FPS: <span className={fps >= 30 ? 'text-green-400' : 'text-red-400'}>{fps}</span></p>
          <p className="text-xs text-gray-400 mt-2">
            {fps >= 60 ? '✓ Excellent' : fps >= 30 ? '✓ Good' : '⚠ Low'}
          </p>
        </div>
      )}
    </>
  );
}
